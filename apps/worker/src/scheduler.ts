import { Queue } from 'bullmq';
import { prisma } from '@vigil/db';
import { QUEUES, scheduleId, type RunJobData, type MaintenanceJobData } from '@vigil/core';
import { connection } from './redis.js';
import { env } from './env.js';

const runQueue = new Queue<RunJobData>(QUEUES.run, { connection });
const maintenanceQueue = new Queue<MaintenanceJobData>(QUEUES.maintenance, { connection });

/**
 * Reconcile per-client run schedulers from the DB (Scope §4.13). Idempotent —
 * runs on boot. Upserts a stable scheduler per enabled client and removes
 * schedulers for clients that were deleted or had scheduling turned off.
 */
export async function reconcileSchedules(): Promise<void> {
  const clients = await prisma.client.findMany();
  const wanted = new Set<string>();

  for (const c of clients) {
    if (c.scheduleEnabled && c.scheduleCron) {
      await runQueue.upsertJobScheduler(
        scheduleId(c.id),
        { pattern: c.scheduleCron, tz: c.timezone },
        { name: 'run', data: { clientId: c.id, runId: '' } },
      );
      wanted.add(scheduleId(c.id));
    }
  }

  const existing = await runQueue.getJobSchedulers(0, 1000);
  for (const s of existing) {
    if (s.key.startsWith('client:') && !wanted.has(s.key)) {
      await runQueue.removeJobScheduler(s.key).catch(() => {});
    }
  }

  console.log(`[scheduler] reconciled ${wanted.size} client schedule(s)`);
}

/** Register the recurring maintenance jobs: retention prune + nightly DB backup. */
export async function ensureMaintenanceSchedules(): Promise<void> {
  await maintenanceQueue.upsertJobScheduler(
    'maintenance:prune-retention',
    { pattern: env.pruneCron, tz: env.defaultTimezoneForJobs },
    { name: 'prune-retention', data: { task: 'prune-retention' } },
  );
  await maintenanceQueue.upsertJobScheduler(
    'maintenance:db-backup',
    { pattern: env.backupCron, tz: env.defaultTimezoneForJobs },
    { name: 'db-backup', data: { task: 'db-backup' } },
  );
  console.log(
    `[scheduler] maintenance scheduled — prune (${env.pruneCron}), backup (${env.backupCron}) ${env.defaultTimezoneForJobs}`,
  );
}
