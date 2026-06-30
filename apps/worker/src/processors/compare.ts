import type { Job } from 'bullmq';
import { prisma, type Capture, type ComparisonKind } from '@vigil/db';
import { comparisonKey } from '@vigil/storage';
import type { CompareJobData } from '@vigil/core';
import { env } from '../env.js';
import { storage, getText, putBuffer, putText } from '../storageClient.js';
import { visualDiff } from '../diff/visual.js';
import { unifiedDiff } from '../diff/code.js';
import { sendRunNotification } from '../email.js';

// Threshold above which a flagged change is treated as a likely break (escalates
// the page to "broken" in the run summary before any Claude assessment).
const BROKEN_PCT = 25;

interface DiffSource {
  screenshotKey: string;
  servedHtmlKey?: string | null;
  renderedDomNormalisedKey?: string | null;
  baselineId?: string;
  captureId?: string;
}

async function buildComparison(
  runId: string,
  cap: Capture,
  kind: ComparisonKind,
  from: DiffSource,
  effThreshold: number,
): Promise<{ pct: number | null; flagged: boolean }> {
  const comp = await prisma.comparison.create({
    data: {
      runId,
      pageId: cap.pageId,
      viewport: cap.viewport,
      kind,
      fromBaselineId: from.baselineId,
      fromCaptureId: from.captureId,
      toCaptureId: cap.id,
      status: 'pending',
    },
  });

  // visual
  const [beforeShot, afterShot] = await Promise.all([
    storage.get(from.screenshotKey),
    storage.get(cap.screenshotKey!),
  ]);
  const vd = await visualDiff(beforeShot, afterShot);
  const diffImageKey = await putBuffer(comparisonKey(comp.id, 'diff-image'), vd.diffPng, 'image/png');

  // source HTML diff
  let sourceHtmlDiffKey: string | undefined;
  if (from.servedHtmlKey && cap.servedHtmlKey) {
    const [b, a] = await Promise.all([getText(from.servedHtmlKey), getText(cap.servedHtmlKey)]);
    sourceHtmlDiffKey = await putText(
      comparisonKey(comp.id, 'source-html-diff'),
      unifiedDiff(b, a, 'served HTML'),
    );
  }

  // normalised DOM diff
  let domDiffKey: string | undefined;
  if (from.renderedDomNormalisedKey && cap.renderedDomNormalisedKey) {
    const [b, a] = await Promise.all([
      getText(from.renderedDomNormalisedKey),
      getText(cap.renderedDomNormalisedKey),
    ]);
    domDiffKey = await putText(comparisonKey(comp.id, 'dom-diff'), unifiedDiff(b, a, 'normalised DOM'));
  }

  const flagged = vd.changedPixelPct > effThreshold;
  await prisma.comparison.update({
    where: { id: comp.id },
    data: {
      changedPixelPct: vd.changedPixelPct,
      diffImageKey,
      sourceHtmlDiffKey,
      domDiffKey,
      flagged,
      status: flagged ? 'pending' : 'accepted',
    },
  });
  return { pct: vd.changedPixelPct, flagged };
}

// Runs once all of a run's captures complete: compute comparisons and the
// passed/changes/broken/failed summary.
export async function compareProcessor(job: Job<CompareJobData>) {
  const { runId } = job.data;
  const run = await prisma.run.findUnique({ where: { id: runId }, include: { client: true } });
  if (!run) return { skipped: true };

  const settings = await prisma.settings.findFirst();
  const globalThreshold = settings?.globalThresholdPct ?? env.defaultThresholdPct;
  const effThreshold = run.client.thresholdOverride ?? globalThreshold;

  const captures = await prisma.capture.findMany({ where: { runId } });

  let passed = 0;
  let changes = 0;
  let broken = 0;
  let failed = 0;

  for (const cap of captures) {
    if (cap.status === 'failed' || !cap.screenshotKey) {
      failed++;
      continue;
    }
    try {
      // Baseline → Capture (always; baseline exists by now via first-capture).
      const baseline = await prisma.baseline.findUnique({
        where: { pageId_viewport: { pageId: cap.pageId, viewport: cap.viewport } },
      });
      let baselineResult: { pct: number | null; flagged: boolean } | null = null;
      if (baseline?.screenshotKey) {
        baselineResult = await buildComparison(
          runId,
          cap,
          'baseline_vs_capture',
          {
            screenshotKey: baseline.screenshotKey,
            servedHtmlKey: baseline.servedHtmlKey,
            renderedDomNormalisedKey: baseline.renderedDomNormalisedKey,
            baselineId: baseline.id,
          },
          effThreshold,
        );
      }

      // Checkpoint → Capture (maintenance runs; the primary signal).
      let checkpointResult: { pct: number | null; flagged: boolean } | null = null;
      if (run.checkpointId) {
        const cpCap = await prisma.capture.findFirst({
          where: {
            checkpointId: run.checkpointId,
            pageId: cap.pageId,
            viewport: cap.viewport,
            status: 'captured',
          },
        });
        if (cpCap?.screenshotKey) {
          checkpointResult = await buildComparison(
            runId,
            cap,
            'checkpoint_vs_capture',
            {
              screenshotKey: cpCap.screenshotKey,
              servedHtmlKey: cpCap.servedHtmlKey,
              renderedDomNormalisedKey: cpCap.renderedDomNormalisedKey,
              captureId: cpCap.id,
            },
            effThreshold,
          );
        }
      }

      const primary = checkpointResult ?? baselineResult;
      if (!primary) {
        passed++;
      } else if (!primary.flagged) {
        passed++;
      } else if ((primary.pct ?? 0) >= BROKEN_PCT) {
        broken++;
      } else {
        changes++;
      }
    } catch (err) {
      console.error(`[compare] failed for capture ${cap.id}:`, (err as Error).message);
      failed++;
    }
  }

  const summary = { passed, changes, broken, failed, total: captures.length };
  await prisma.run.update({
    where: { id: runId },
    data: { status: 'completed', completedAt: new Date(), summary },
  });

  await sendRunNotification({
    runId,
    clientName: run.client.name,
    notifyEmails: run.client.notifyEmails,
    isMaintenance: !!run.checkpointId,
    summary,
  });

  return { runId, passed, changes, broken, failed };
}
