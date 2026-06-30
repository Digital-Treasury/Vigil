import type { Job } from 'bullmq';
import { prisma } from '@vigil/db';
import { effectiveRetentionDays, type MaintenanceJobData } from '@vigil/core';
import { env } from '../env.js';
import { storage } from '../storageClient.js';
import { runDbBackup } from '../backup.js';

const DAY_MS = 86_400_000;

async function deleteKeys(keys: (string | null | undefined)[]): Promise<number> {
  let n = 0;
  for (const key of keys) {
    if (!key) continue;
    try {
      await storage.delete(key);
      n++;
    } catch (err) {
      console.warn('[prune] failed to delete', key, (err as Error).message);
    }
  }
  return n;
}

/**
 * Retention pruning (Scope §4.14). For each client, delete captures (and the
 * comparisons / diff artifacts derived from them) older than the effective
 * retention window — min(client override, global cap). Baselines keep their own
 * copies of artifacts, so they are never touched. The active checkpoint's
 * "before" captures are preserved until the checkpoint ends.
 */
async function pruneRetention(): Promise<{ captures: number; objects: number }> {
  const settings = await prisma.settings.findFirst();
  const globalCap = settings?.globalRetentionDays ?? env.defaultRetentionDays;
  const clients = await prisma.client.findMany();

  let prunedCaptures = 0;
  let prunedObjects = 0;

  for (const client of clients) {
    const days = effectiveRetentionDays(client.retentionOverride, globalCap);
    if (!Number.isFinite(days) || days <= 0) continue;
    const cutoff = new Date(Date.now() - days * DAY_MS);

    const old = await prisma.capture.findMany({
      where: {
        page: { clientId: client.id },
        capturedAt: { lt: cutoff },
        // never prune the captures backing the active checkpoint
        ...(client.activeCheckpointId
          ? { OR: [{ checkpointId: null }, { checkpointId: { not: client.activeCheckpointId } }] }
          : {}),
      },
      select: {
        id: true,
        screenshotKey: true,
        servedHtmlKey: true,
        renderedDomKey: true,
        renderedDomNormalisedKey: true,
      },
    });
    if (old.length === 0) continue;
    const captureIds = old.map((c) => c.id);

    // Comparisons derived from these captures (either side) and their artifacts.
    const comps = await prisma.comparison.findMany({
      where: { OR: [{ toCaptureId: { in: captureIds } }, { fromCaptureId: { in: captureIds } }] },
      select: { id: true, diffImageKey: true, sourceHtmlDiffKey: true, domDiffKey: true },
    });
    for (const comp of comps) {
      prunedObjects += await deleteKeys([comp.diffImageKey, comp.sourceHtmlDiffKey, comp.domDiffKey]);
    }
    // Remove comparison rows first (clears the fromCapture FK so captures can go).
    await prisma.comparison.deleteMany({ where: { id: { in: comps.map((c) => c.id) } } });

    for (const cap of old) {
      prunedObjects += await deleteKeys([
        cap.screenshotKey,
        cap.servedHtmlKey,
        cap.renderedDomKey,
        cap.renderedDomNormalisedKey,
      ]);
    }
    await prisma.capture.deleteMany({ where: { id: { in: captureIds } } });
    prunedCaptures += old.length;
  }

  return { captures: prunedCaptures, objects: prunedObjects };
}

export async function maintenanceProcessor(job: Job<MaintenanceJobData>) {
  switch (job.data.task) {
    case 'prune-retention': {
      const result = await pruneRetention();
      console.log(`[maintenance] pruned ${result.captures} captures, ${result.objects} objects`);
      return result;
    }
    case 'db-backup': {
      const result = await runDbBackup();
      console.log(`[maintenance] db backup → ${result.key} (${Math.round(result.bytes / 1024)} KB)`);
      return result;
    }
    default:
      return { skipped: true };
  }
}
