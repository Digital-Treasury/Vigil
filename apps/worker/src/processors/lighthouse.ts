import type { Job } from 'bullmq';
import { prisma, type Prisma } from '@vigil/db';
import type { LighthouseJobData } from '@vigil/core';
import { runLighthouse } from '../lighthouse/run.js';

// Lighthouse pass on a fresh Chrome (own low-concurrency queue). Attaches the
// result to the capture row best-effort; visual/code diffs don't depend on it.
export async function lighthouseProcessor(job: Job<LighthouseJobData>) {
  const { captureId, pageId } = job.data;
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) return { skipped: true };

  const data = await runLighthouse(page.url);
  if (data) {
    await prisma.capture.update({
      where: { id: captureId },
      data: { lighthouseJson: data as unknown as Prisma.InputJsonValue },
    });
  }
  return { captureId, ok: !!data };
}
