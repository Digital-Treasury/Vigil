import type { Job } from 'bullmq';
import type { LighthouseJobData } from '@vigil/core';

// Lighthouse pass on a FRESH Chrome (separate page load from the screenshot
// pass). Implemented in P5; the no-op keeps the decoupled queue draining until
// then so enqueued jobs don't pile up.
export async function lighthouseProcessor(_job: Job<LighthouseJobData>) {
  return { skipped: true };
}
