import 'server-only';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import {
  QUEUES,
  scheduleId,
  type RunJobData,
  type CompareJobData,
  type CaptureJobData,
} from '@vigil/core';
import { env } from './env';

// Shared Redis connection for BullMQ producers (the app enqueues; the worker
// consumes). maxRetriesPerRequest must be null for BullMQ.
const globalForQueue = globalThis as unknown as {
  vigilRedis?: IORedis;
  vigilQueues?: Record<string, Queue>;
};

// lazyConnect: don't open a socket until the first enqueue — keeps build/SSR
// from trying to reach Redis when no job is actually produced.
export const connection =
  globalForQueue.vigilRedis ??
  new IORedis(env.redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
if (process.env.NODE_ENV !== 'production') globalForQueue.vigilRedis = connection;

function queue<T>(name: string): Queue<T> {
  globalForQueue.vigilQueues ??= {};
  if (!globalForQueue.vigilQueues[name]) {
    globalForQueue.vigilQueues[name] = new Queue<T>(name, { connection });
  }
  return globalForQueue.vigilQueues[name] as Queue<T>;
}

export const runQueue = () => queue<RunJobData>(QUEUES.run);
export const captureQueue = () => queue<CaptureJobData>(QUEUES.capture);
export const compareQueue = () => queue<CompareJobData>(QUEUES.compare);

export async function enqueueRun(data: RunJobData) {
  return runQueue().add('run', data, {
    removeOnComplete: 200,
    removeOnFail: 500,
    attempts: 1,
  });
}

/** Capture the "before" set for a checkpoint (no run, no baseline promotion). */
export async function enqueueCheckpointCaptures(
  checkpointId: string,
  units: { pageId: string; viewport: 'desktop' | 'mobile' }[],
) {
  const q = captureQueue();
  await Promise.all(
    units.map((u) =>
      q.add(
        'capture',
        { pageId: u.pageId, viewport: u.viewport, checkpointId } satisfies CaptureJobData,
        { removeOnComplete: 200, removeOnFail: 300, attempts: 2 },
      ),
    ),
  );
}

/** Standalone captures (not part of a run) that force-promote to baseline. */
export async function enqueueRecapture(pageId: string, viewports: ('desktop' | 'mobile')[]) {
  const q = captureQueue();
  await Promise.all(
    viewports.map((viewport) =>
      q.add(
        'capture',
        { pageId, viewport, promoteBaseline: true } satisfies CaptureJobData,
        { removeOnComplete: 100, removeOnFail: 200, attempts: 2 },
      ),
    ),
  );
}

/** Create/update the per-client repeatable schedule (idempotent by schedulerId). */
export async function upsertClientSchedule(
  clientId: string,
  cron: string,
  timezone: string,
): Promise<void> {
  await runQueue().upsertJobScheduler(
    scheduleId(clientId),
    { pattern: cron, tz: timezone },
    { name: 'run', data: { clientId, runId: '' } satisfies RunJobData },
  );
}

export async function removeClientSchedule(clientId: string): Promise<void> {
  try {
    await runQueue().removeJobScheduler(scheduleId(clientId));
  } catch {
    /* no-op if absent */
  }
}
