import { getDb } from './db';
import { nextRunPreview } from './scheduler';
import type { Baseline, Capture, Checkpoint, Client, Investigation, Page, Run, RunResult } from './types';

// Aggregated JSON payloads for each screen; keeps the route handlers thin.

export function dashboardData() {
  const db = getDb();
  const clients = db.prepare('SELECT * FROM clients ORDER BY name').all() as Client[];
  const openInvestigations = (
    db.prepare(`SELECT COUNT(*) AS n FROM investigations WHERE status = 'open'`).get() as { n: number }
  ).n;
  const runsToday = (
    db.prepare(`SELECT COUNT(*) AS n FROM runs WHERE started_at >= date('now')`).get() as { n: number }
  ).n;
  const awaiting = (
    db.prepare(`SELECT COUNT(*) AS n FROM run_results WHERE review = 'pending'`).get() as { n: number }
  ).n;

  const rows = clients.map((client) => {
    const pageCount = (
      db.prepare('SELECT COUNT(*) AS n FROM pages WHERE client_id = ?').get(client.id) as { n: number }
    ).n;
    const lastRun = db
      .prepare('SELECT * FROM runs WHERE client_id = ? ORDER BY id DESC LIMIT 1')
      .get(client.id) as Run | undefined;
    let lastRunSummary: ReturnType<typeof runTally> | null = null;
    if (lastRun) lastRunSummary = runTally(lastRun.id);
    return {
      ...clientPublic(client),
      pageCount,
      lastRun: lastRun
        ? { id: lastRun.id, status: lastRun.status, started_at: lastRun.started_at, trigger: lastRun.trigger, tally: lastRunSummary }
        : null,
      nextRun: nextRunPreview(client),
    };
  });

  return {
    stats: { clients: clients.length, runsToday, awaiting, openInvestigations },
    clients: rows,
  };
}

function clientPublic(client: Client) {
  return {
    id: client.id,
    name: client.name,
    url: client.url,
    notify_emails: JSON.parse(client.notify_emails || '[]') as string[],
    threshold_override: client.threshold_override,
    retention_override: client.retention_override,
    lighthouse_enabled: !!client.lighthouse_enabled,
    schedule: {
      enabled: !!client.schedule_enabled,
      freq: client.schedule_freq,
      day: client.schedule_day,
      time: client.schedule_time,
    },
    checkpoint: activeCheckpoint(client),
  };
}

function activeCheckpoint(client: Client) {
  if (!client.checkpoint_id) return null;
  const cp = getDb()
    .prepare('SELECT * FROM checkpoints WHERE id = ?')
    .get(client.checkpoint_id) as Checkpoint | undefined;
  return cp ? { id: cp.id, started_at: cp.started_at, started_by: cp.started_by } : null;
}

export function runTally(runId: number) {
  const db = getDb();
  const results = db.prepare('SELECT status FROM run_results WHERE run_id = ?').all(runId) as {
    status: string;
  }[];
  return {
    total: results.length,
    passed: results.filter((r) => r.status === 'passed').length,
    changes: results.filter((r) => r.status === 'changes').length,
    broken: results.filter((r) => r.status === 'broken').length,
    errors: results.filter((r) => r.status === 'error').length,
    running: results.filter((r) => r.status === 'running').length,
  };
}

export function clientDetailData(clientId: number) {
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId) as Client;
  if (!client) return null;
  const pages = (
    db.prepare('SELECT * FROM pages WHERE client_id = ? ORDER BY sort, id').all(clientId) as Page[]
  ).map((page) => pagePublic(page));
  const runs = (
    db.prepare('SELECT * FROM runs WHERE client_id = ? ORDER BY id DESC LIMIT 50').all(clientId) as Run[]
  ).map((run) => ({ ...run, tally: runTally(run.id) }));
  return { client: clientPublic(client), pages, runs, nextRun: nextRunPreview(client) };
}

function pagePublic(page: Page) {
  const db = getDb();
  const baselines = db
    .prepare('SELECT * FROM baselines WHERE page_id = ?')
    .all(page.id) as Baseline[];
  const lastResult = db
    .prepare(
      `SELECT rr.*, r.started_at AS run_started FROM run_results rr
       JOIN runs r ON r.id = rr.run_id WHERE rr.page_id = ? ORDER BY rr.id DESC LIMIT 1`
    )
    .get(page.id) as (RunResult & { run_started: string }) | undefined;
  return {
    id: page.id,
    client_id: page.client_id,
    label: page.label,
    url: page.url,
    viewports: JSON.parse(page.viewports) as string[],
    mask_selectors: JSON.parse(page.mask_selectors) as string[],
    wait_selector: page.wait_selector,
    baselines: baselines.map((b) => ({
      viewport: b.viewport,
      capture_id: b.capture_id,
      approved_by: b.approved_by,
      approved_at: b.approved_at,
      screenshot: captureShot(b.capture_id),
    })),
    lastResult: lastResult
      ? {
          id: lastResult.id,
          status: lastResult.status,
          review: lastResult.review,
          diff_baseline_pct: lastResult.diff_baseline_pct,
          run_started: lastResult.run_started,
        }
      : null,
  };
}

function captureShot(captureId: number | null): string | null {
  if (!captureId) return null;
  const row = getDb()
    .prepare('SELECT screenshot_path FROM captures WHERE id = ?')
    .get(captureId) as { screenshot_path: string | null } | undefined;
  return row?.screenshot_path ? `/api/files/${row.screenshot_path}` : null;
}

export function pageDetailData(pageId: number) {
  const db = getDb();
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(pageId) as Page;
  if (!page) return null;
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(page.client_id) as Client;
  const history = (
    db
      .prepare(
        `SELECT rr.*, r.started_at AS run_started, r.trigger FROM run_results rr
         JOIN runs r ON r.id = rr.run_id WHERE rr.page_id = ? ORDER BY rr.id DESC LIMIT 20`
      )
      .all(pageId) as (RunResult & { run_started: string; trigger: string })[]
  ).map((r) => ({
    id: r.id,
    run_id: r.run_id,
    viewport: r.viewport,
    status: r.status,
    review: r.review,
    diff_baseline_pct: r.diff_baseline_pct,
    diff_checkpoint_pct: r.diff_checkpoint_pct,
    run_started: r.run_started,
    trigger: r.trigger,
  }));
  return { page: pagePublic(page), client: { id: client.id, name: client.name, url: client.url }, history };
}

export function runReportData(runId: number) {
  const db = getDb();
  const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as Run;
  if (!run) return null;
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(run.client_id) as Client;
  const checkpoint = run.checkpoint_id
    ? (db.prepare('SELECT * FROM checkpoints WHERE id = ?').get(run.checkpoint_id) as Checkpoint)
    : null;
  const results = (
    db
      .prepare(
        `SELECT rr.*, p.label, p.url FROM run_results rr JOIN pages p ON p.id = rr.page_id
         WHERE rr.run_id = ? ORDER BY
           CASE rr.status WHEN 'broken' THEN 0 WHEN 'error' THEN 1 WHEN 'changes' THEN 2 WHEN 'running' THEN 3 ELSE 4 END, rr.id`
      )
      .all(runId) as (RunResult & { label: string; url: string })[]
  ).map((r) => {
    const capture = r.capture_id
      ? (db.prepare('SELECT * FROM captures WHERE id = ?').get(r.capture_id) as Capture)
      : null;
    return {
      id: r.id,
      page_id: r.page_id,
      label: r.label,
      url: r.url,
      viewport: r.viewport,
      status: r.status,
      review: r.review,
      diff_baseline_pct: r.diff_baseline_pct,
      diff_checkpoint_pct: r.diff_checkpoint_pct,
      error: capture?.error ?? null,
      thumbs: {
        before: captureShot(r.checkpoint_capture_id ?? r.baseline_capture_id),
        after: captureShot(r.capture_id),
        diff: r.diff_checkpoint_img
          ? `/api/files/${r.diff_checkpoint_img}`
          : r.diff_baseline_img
            ? `/api/files/${r.diff_baseline_img}`
            : null,
      },
      lighthouse: capture?.lighthouse ? JSON.parse(capture.lighthouse) : null,
      baselineLighthouse: baselineLighthouse(r),
      assessment: r.assessment ? JSON.parse(r.assessment) : null,
    };
  });
  return {
    run: {
      id: run.id,
      client_id: run.client_id,
      trigger: run.trigger,
      status: run.status,
      started_at: run.started_at,
      finished_at: run.finished_at,
      checkpoint: checkpoint
        ? { id: checkpoint.id, started_at: checkpoint.started_at }
        : null,
    },
    client: { id: client.id, name: client.name, url: client.url },
    tally: runTally(runId),
    results,
  };
}

function baselineLighthouse(result: RunResult) {
  if (!result.baseline_capture_id) return null;
  const row = getDb()
    .prepare('SELECT lighthouse FROM captures WHERE id = ?')
    .get(result.baseline_capture_id) as { lighthouse: string | null } | undefined;
  return row?.lighthouse ? JSON.parse(row.lighthouse) : null;
}

export function reviewData(resultId: number) {
  const db = getDb();
  const result = db.prepare('SELECT * FROM run_results WHERE id = ?').get(resultId) as RunResult;
  if (!result) return null;
  const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(result.run_id) as Run;
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(run.client_id) as Client;
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(result.page_id) as Page;
  const checkpoint = run.checkpoint_id
    ? (db.prepare('SELECT * FROM checkpoints WHERE id = ?').get(run.checkpoint_id) as Checkpoint)
    : null;

  const cap = (id: number | null) =>
    id ? (db.prepare('SELECT * FROM captures WHERE id = ?').get(id) as Capture) : null;
  const capture = cap(result.capture_id);
  const baseline = cap(result.baseline_capture_id);
  const cpCapture = cap(result.checkpoint_capture_id);

  // Ordered siblings for J/K next/prev navigation across the run.
  const siblings = db
    .prepare(
      `SELECT rr.id, rr.status, rr.review FROM run_results rr WHERE rr.run_id = ? ORDER BY
         CASE rr.status WHEN 'broken' THEN 0 WHEN 'error' THEN 1 WHEN 'changes' THEN 2 WHEN 'running' THEN 3 ELSE 4 END, rr.id`
    )
    .all(result.run_id) as { id: number; status: string; review: string }[];

  const shot = (c: Capture | null) =>
    c?.screenshot_path ? `/api/files/${c.screenshot_path}` : null;

  return {
    result: {
      id: result.id,
      viewport: result.viewport,
      status: result.status,
      review: result.review,
      reviewed_by: result.reviewed_by,
      diff_baseline_pct: result.diff_baseline_pct,
      diff_checkpoint_pct: result.diff_checkpoint_pct,
      assessment: result.assessment ? JSON.parse(result.assessment) : null,
    },
    run: { id: run.id, started_at: run.started_at, trigger: run.trigger },
    client: { id: client.id, name: client.name, url: client.url },
    page: { id: page.id, label: page.label, url: page.url },
    checkpoint: checkpoint ? { started_at: checkpoint.started_at } : null,
    images: {
      capture: shot(capture),
      baseline: shot(baseline),
      checkpoint: shot(cpCapture),
      diffBaseline: result.diff_baseline_img ? `/api/files/${result.diff_baseline_img}` : null,
      diffCheckpoint: result.diff_checkpoint_img ? `/api/files/${result.diff_checkpoint_img}` : null,
    },
    captureError: capture?.error ?? null,
    captureSize: capture ? { width: capture.width, height: capture.height } : null,
    lighthouse: {
      current: capture?.lighthouse ? JSON.parse(capture.lighthouse) : null,
      baseline: baseline?.lighthouse ? JSON.parse(baseline.lighthouse) : null,
    },
    siblings,
  };
}

export function investigationsData() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT iv.*, c.name AS client_name, p.label AS page_label, rr.viewport, rr.assessment,
              rr.diff_baseline_pct, rr.diff_checkpoint_pct, rr.diff_baseline_img, rr.diff_checkpoint_img
       FROM investigations iv
       JOIN clients c ON c.id = iv.client_id
       JOIN pages p ON p.id = iv.page_id
       JOIN run_results rr ON rr.id = iv.result_id
       WHERE iv.status = 'open' ORDER BY iv.id DESC`
    )
    .all() as (Investigation & {
    client_name: string;
    page_label: string;
    viewport: string;
    assessment: string | null;
    diff_baseline_pct: number | null;
    diff_checkpoint_pct: number | null;
    diff_baseline_img: string | null;
    diff_checkpoint_img: string | null;
  })[];
  return rows.map((iv) => ({
    id: iv.id,
    result_id: iv.result_id,
    client: { id: iv.client_id, name: iv.client_name },
    page: { id: iv.page_id, label: iv.page_label },
    viewport: iv.viewport,
    note: iv.note,
    flagged_by: iv.flagged_by,
    flagged_at: iv.flagged_at,
    diff_pct: iv.diff_checkpoint_pct ?? iv.diff_baseline_pct,
    diff_img: iv.diff_checkpoint_img
      ? `/api/files/${iv.diff_checkpoint_img}`
      : iv.diff_baseline_img
        ? `/api/files/${iv.diff_baseline_img}`
        : null,
    assessment: iv.assessment ? JSON.parse(iv.assessment) : null,
  }));
}
