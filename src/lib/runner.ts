import fs from 'fs';
import path from 'path';
import { getDb, CAPTURES_DIR, clientThreshold, getSetting } from './db';
import { capturePage, type MaskRect } from './capture';
import { diffScreenshots } from './imagediff';
import { sendRunEmail } from './mailer';
import type { Capture, Client, Page, RunTrigger, Viewport } from './types';

const BROKEN_THRESHOLD = 10; // diff % above which a change escalates to "likely regression"

// ---------- serial job queue (one capture at a time keeps memory + target sites happy) ----------

declare global {
  // eslint-disable-next-line no-var
  var __vigilQueue: Promise<void> | undefined;
}

function enqueue(job: () => Promise<void>) {
  const tail = globalThis.__vigilQueue ?? Promise.resolve();
  globalThis.__vigilQueue = tail.then(job).catch((err) => {
    console.error('[vigil] job failed:', err);
  });
}

// ---------- runs ----------

export function startRun(clientId: number, trigger: RunTrigger): number {
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId) as Client;
  if (!client) throw new Error('Client not found');
  const pages = db
    .prepare('SELECT * FROM pages WHERE client_id = ? ORDER BY sort, id')
    .all(clientId) as Page[];
  if (pages.length === 0) throw new Error('Client has no pages');

  const checkpointId = client.checkpoint_id;
  const effectiveTrigger: RunTrigger = checkpointId ? 'maintenance' : trigger;
  const runId = Number(
    db
      .prepare('INSERT INTO runs (client_id, trigger, checkpoint_id) VALUES (?, ?, ?)')
      .run(clientId, effectiveTrigger, checkpointId).lastInsertRowid
  );

  const insertResult = db.prepare(
    'INSERT INTO run_results (run_id, page_id, viewport, status) VALUES (?, ?, ?, ?)'
  );
  const work: { page: Page; viewport: Viewport; resultId: number }[] = [];
  for (const page of pages) {
    for (const viewport of JSON.parse(page.viewports) as Viewport[]) {
      const resultId = Number(insertResult.run(runId, page.id, viewport, 'running').lastInsertRowid);
      work.push({ page, viewport, resultId });
    }
  }

  enqueue(async () => {
    for (const item of work) {
      await processResult(client, runId, checkpointId, item.page, item.viewport, item.resultId);
    }
    getDb()
      .prepare(`UPDATE runs SET status = 'complete', finished_at = datetime('now') WHERE id = ?`)
      .run(runId);
    await sendRunEmail(runId).catch((err) => console.error('[vigil] email failed:', err));
  });

  return runId;
}

async function processResult(
  client: Client,
  runId: number,
  checkpointId: number | null,
  page: Page,
  viewport: Viewport,
  resultId: number
) {
  const db = getDb();
  const captureId = await capturePage({
    pageId: page.id,
    runId,
    url: page.url,
    viewport,
    maskSelectors: JSON.parse(page.mask_selectors),
    waitSelector: page.wait_selector,
    lighthouse: !!client.lighthouse_enabled,
  });
  const capture = db.prepare('SELECT * FROM captures WHERE id = ?').get(captureId) as Capture;

  if (capture.status === 'error') {
    db.prepare(`UPDATE run_results SET capture_id = ?, status = 'error' WHERE id = ?`).run(
      captureId,
      resultId
    );
    return;
  }

  const baseline = db
    .prepare(
      `SELECT b.capture_id FROM baselines b WHERE b.page_id = ? AND b.viewport = ?`
    )
    .get(page.id, viewport) as { capture_id: number } | undefined;

  // First successful capture becomes the baseline automatically.
  if (!baseline) {
    db.prepare(
      `INSERT INTO baselines (page_id, viewport, capture_id, approved_by)
       VALUES (?, ?, ?, 'auto — first capture')
       ON CONFLICT(page_id, viewport) DO NOTHING`
    ).run(page.id, viewport, captureId);
    db.prepare(
      `UPDATE run_results SET capture_id = ?, status = 'passed', diff_baseline_pct = 0 WHERE id = ?`
    ).run(captureId, resultId);
    return;
  }

  const baselineCapture = db
    .prepare('SELECT * FROM captures WHERE id = ?')
    .get(baseline.capture_id) as Capture;

  const masks: MaskRect[] = [
    ...(JSON.parse(capture.mask_rects || '[]') as MaskRect[]),
    ...(JSON.parse(baselineCapture.mask_rects || '[]') as MaskRect[]),
  ];

  let diffBaselinePct: number | null = null;
  let diffBaselineImg: string | null = null;
  try {
    const d = diffScreenshots(
      baselineCapture.screenshot_path!,
      capture.screenshot_path!,
      masks,
      `r${resultId}-baseline.png`
    );
    diffBaselinePct = d.pct;
    diffBaselineImg = d.diffPath;
  } catch (err) {
    console.error('[vigil] baseline diff failed:', err);
  }

  let diffCheckpointPct: number | null = null;
  let diffCheckpointImg: string | null = null;
  let checkpointCaptureId: number | null = null;
  if (checkpointId) {
    const cpCapture = db
      .prepare(
        `SELECT * FROM captures WHERE checkpoint_id = ? AND page_id = ? AND viewport = ? AND status = 'ok'
         ORDER BY id DESC LIMIT 1`
      )
      .get(checkpointId, page.id, viewport) as Capture | undefined;
    if (cpCapture) {
      checkpointCaptureId = cpCapture.id;
      const cpMasks: MaskRect[] = [
        ...(JSON.parse(capture.mask_rects || '[]') as MaskRect[]),
        ...(JSON.parse(cpCapture.mask_rects || '[]') as MaskRect[]),
      ];
      try {
        const d = diffScreenshots(
          cpCapture.screenshot_path!,
          capture.screenshot_path!,
          cpMasks,
          `r${resultId}-checkpoint.png`
        );
        diffCheckpointPct = d.pct;
        diffCheckpointImg = d.diffPath;
      } catch (err) {
        console.error('[vigil] checkpoint diff failed:', err);
      }
    }
  }

  // The checkpoint comparison is the primary signal during maintenance runs.
  const primary = diffCheckpointPct ?? diffBaselinePct ?? 0;
  const threshold = clientThreshold(client);
  let status: 'passed' | 'changes' | 'broken' = 'passed';
  if (primary > BROKEN_THRESHOLD) status = 'broken';
  else if (primary > threshold) status = 'changes';

  db.prepare(
    `UPDATE run_results SET
       capture_id = ?, status = ?, review = ?,
       diff_baseline_pct = ?, diff_checkpoint_pct = ?,
       diff_baseline_img = ?, diff_checkpoint_img = ?,
       baseline_capture_id = ?, checkpoint_capture_id = ?
     WHERE id = ?`
  ).run(
    captureId,
    status,
    status === 'passed' ? 'none' : 'pending',
    diffBaselinePct,
    diffCheckpointPct,
    diffBaselineImg,
    diffCheckpointImg,
    baseline.capture_id,
    checkpointCaptureId,
    resultId
  );
}

// ---------- checkpoints ----------

export function startCheckpoint(clientId: number, startedBy: string): number {
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId) as Client;
  if (!client) throw new Error('Client not found');
  if (client.checkpoint_id) return client.checkpoint_id;
  const checkpointId = Number(
    db
      .prepare('INSERT INTO checkpoints (client_id, started_by) VALUES (?, ?)')
      .run(clientId, startedBy).lastInsertRowid
  );
  db.prepare('UPDATE clients SET checkpoint_id = ? WHERE id = ?').run(checkpointId, clientId);

  const pages = db
    .prepare('SELECT * FROM pages WHERE client_id = ? ORDER BY sort, id')
    .all(clientId) as Page[];
  enqueue(async () => {
    for (const page of pages) {
      for (const viewport of JSON.parse(page.viewports) as Viewport[]) {
        await capturePage({
          pageId: page.id,
          checkpointId,
          url: page.url,
          viewport,
          maskSelectors: JSON.parse(page.mask_selectors),
          waitSelector: page.wait_selector,
          lighthouse: false,
        });
      }
    }
  });
  return checkpointId;
}

export function endCheckpoint(clientId: number) {
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId) as Client;
  if (!client?.checkpoint_id) return;
  db.prepare(`UPDATE checkpoints SET ended_at = datetime('now') WHERE id = ?`).run(
    client.checkpoint_id
  );
  db.prepare('UPDATE clients SET checkpoint_id = NULL WHERE id = ?').run(clientId);
}

// ---------- baseline decisions ----------

export function acceptBaseline(resultId: number, user: string) {
  const db = getDb();
  const result = db.prepare('SELECT * FROM run_results WHERE id = ?').get(resultId) as {
    page_id: number;
    viewport: Viewport;
    capture_id: number | null;
  };
  if (!result?.capture_id) throw new Error('No capture to accept');
  db.prepare(
    `INSERT INTO baselines (page_id, viewport, capture_id, approved_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(page_id, viewport) DO UPDATE SET
       capture_id = excluded.capture_id, approved_by = excluded.approved_by, approved_at = datetime('now')`
  ).run(result.page_id, result.viewport, result.capture_id, user);
  db.prepare(
    `UPDATE run_results SET review = 'accepted', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?`
  ).run(user, resultId);
  // Accepting also resolves any open investigation on this result.
  db.prepare(
    `UPDATE investigations SET status = 'resolved', resolved_by = ?, resolved_at = datetime('now')
     WHERE result_id = ? AND status = 'open'`
  ).run(user, resultId);
}

export function flagResult(resultId: number, user: string, note: string) {
  const db = getDb();
  const result = db
    .prepare(
      `SELECT rr.id, rr.page_id, r.client_id FROM run_results rr JOIN runs r ON r.id = rr.run_id WHERE rr.id = ?`
    )
    .get(resultId) as { id: number; page_id: number; client_id: number };
  if (!result) throw new Error('Result not found');
  db.prepare(
    `UPDATE run_results SET review = 'flagged', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?`
  ).run(user, resultId);
  const existing = db
    .prepare(`SELECT id FROM investigations WHERE result_id = ? AND status = 'open'`)
    .get(resultId);
  if (!existing) {
    db.prepare(
      `INSERT INTO investigations (result_id, client_id, page_id, note, flagged_by) VALUES (?, ?, ?, ?, ?)`
    ).run(resultId, result.client_id, result.page_id, note, user);
  }
}

// ---------- re-baseline from page detail ----------

export function recaptureBaseline(pageId: number, user: string) {
  const db = getDb();
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(pageId) as Page;
  if (!page) throw new Error('Page not found');
  enqueue(async () => {
    for (const viewport of JSON.parse(page.viewports) as Viewport[]) {
      const captureId = await capturePage({
        pageId: page.id,
        url: page.url,
        viewport,
        maskSelectors: JSON.parse(page.mask_selectors),
        waitSelector: page.wait_selector,
        lighthouse: false,
      });
      const capture = getDb().prepare('SELECT status FROM captures WHERE id = ?').get(captureId) as {
        status: string;
      };
      if (capture.status === 'ok') {
        getDb()
          .prepare(
            `INSERT INTO baselines (page_id, viewport, capture_id, approved_by)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(page_id, viewport) DO UPDATE SET
               capture_id = excluded.capture_id, approved_by = excluded.approved_by, approved_at = datetime('now')`
          )
          .run(page.id, viewport, captureId, user);
      }
    }
  });
}

// ---------- retention ----------

export function cleanupRetention() {
  const db = getDb();
  const globalCap = parseInt(getSetting('retention_days'), 10) || 90;
  const clients = db.prepare('SELECT * FROM clients').all() as Client[];
  for (const client of clients) {
    const days = Math.min(globalCap, client.retention_override ?? globalCap);
    // Old captures not serving as a baseline get their files + rows removed.
    const stale = db
      .prepare(
        `SELECT c.* FROM captures c
         WHERE c.page_id IN (SELECT id FROM pages WHERE client_id = ?)
           AND c.created_at < datetime('now', ?)
           AND c.id NOT IN (SELECT capture_id FROM baselines)`
      )
      .all(client.id, `-${days} days`) as Capture[];
    for (const capture of stale) {
      for (const rel of [capture.screenshot_path, capture.html_path, capture.dom_path]) {
        if (rel) fs.rmSync(path.join(CAPTURES_DIR, rel), { force: true });
      }
      db.prepare('DELETE FROM captures WHERE id = ?').run(capture.id);
    }
    db.prepare(
      `DELETE FROM runs WHERE client_id = ? AND started_at < datetime('now', ?)`
    ).run(client.id, `-${days} days`);
  }
}
