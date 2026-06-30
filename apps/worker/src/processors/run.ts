import type { Job } from 'bullmq';
import { prisma } from '@vigil/db';
import {
  QUEUES,
  type RunJobData,
  type CaptureJobData,
  type CompareJobData,
  type ViewportKindStr,
} from '@vigil/core';
import { flow } from '../producers.js';

// A run recaptures all of a client's enabled pages/viewports. We fan out one
// capture job per (page × viewport) as children of a single `compare` parent —
// the parent runs once every capture completes.
export async function runProcessor(job: Job<RunJobData>) {
  const { clientId } = job.data;
  let runId = job.data.runId;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { pages: { where: { enabled: true }, include: { viewports: true } } },
  });
  if (!client) return { skipped: true };

  // Manual "Run now" pre-creates the Run row; scheduled runs arrive without one.
  let run = runId ? await prisma.run.findUnique({ where: { id: runId } }) : null;
  if (!run) {
    run = await prisma.run.create({ data: { clientId, trigger: 'scheduled', status: 'queued' } });
  }
  runId = run.id;

  const checkpointId = client.activeCheckpointId ?? null;
  await prisma.run.update({
    where: { id: runId },
    data: {
      status: 'running',
      startedAt: new Date(),
      checkpointId,
      trigger: checkpointId ? 'maintenance' : run.trigger,
    },
  });

  const units = client.pages.flatMap((p) => {
    const vps: ViewportKindStr[] = p.viewports.length
      ? p.viewports.map((v) => v.kind)
      : ['desktop'];
    return vps.map((viewport) => ({ pageId: p.id, viewport }));
  });

  if (units.length === 0) {
    await prisma.run.update({
      where: { id: runId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        summary: { passed: 0, changes: 0, broken: 0, failed: 0, total: 0 },
      },
    });
    return { runId, captures: 0 };
  }

  await flow.add({
    name: 'compare',
    queueName: QUEUES.compare,
    data: { runId } satisfies CompareJobData,
    opts: { removeOnComplete: 100, removeOnFail: 200 },
    children: units.map((u) => ({
      name: 'capture',
      queueName: QUEUES.capture,
      data: { pageId: u.pageId, viewport: u.viewport, runId } satisfies CaptureJobData,
      opts: {
        removeOnComplete: 200,
        removeOnFail: 500,
        attempts: 2,
        backoff: { type: 'fixed', delay: 3000 },
      },
    })),
  });

  return { runId, captures: units.length };
}
