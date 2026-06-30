import type { Job } from 'bullmq';
import { prisma } from '@vigil/db';
import type { CompareJobData } from '@vigil/core';

// Runs once all of a run's captures complete. P2: finalise the run with capture
// counts. P3 replaces the body with real comparison computation (visual + source
// HTML + normalised DOM diffs, flagging, and the passed/changes/broken summary).
export async function compareProcessor(job: Job<CompareJobData>) {
  const { runId } = job.data;
  const run = await prisma.run.findUnique({ where: { id: runId }, include: { captures: true } });
  if (!run) return { skipped: true };

  const failed = run.captures.filter((c) => c.status === 'failed').length;
  const captured = run.captures.filter((c) => c.status === 'captured').length;

  await prisma.run.update({
    where: { id: runId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      summary: { passed: captured, changes: 0, broken: 0, failed, total: run.captures.length },
    },
  });
  return { runId, captured, failed };
}
