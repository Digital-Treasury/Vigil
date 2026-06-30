import { Worker } from 'bullmq';
import { QUEUES } from '@vigil/core';
import { connection } from './redis.js';
import { env } from './env.js';
import { closeBrowser } from './browser.js';
import { runProcessor } from './processors/run.js';
import { captureProcessor } from './processors/capture.js';
import { lighthouseProcessor } from './processors/lighthouse.js';
import { compareProcessor } from './processors/compare.js';

// Vigil capture worker. Two queues with separate concurrency (screenshots vs
// Lighthouse) because they have conflicting resource needs.
const log = (msg: string, extra?: unknown) =>
  console.log(`[worker] ${msg}`, extra !== undefined ? extra : '');

const workers: Worker[] = [
  new Worker(QUEUES.run, runProcessor, { connection, concurrency: 2 }),
  new Worker(QUEUES.capture, captureProcessor, {
    connection,
    concurrency: env.screenshotConcurrency,
  }),
  new Worker(QUEUES.lighthouse, lighthouseProcessor, {
    connection,
    concurrency: env.lighthouseConcurrency,
  }),
  new Worker(QUEUES.compare, compareProcessor, { connection, concurrency: 2 }),
];

for (const w of workers) {
  w.on('failed', (job, err) => log(`job failed: ${job?.name} (${job?.id})`, err?.message));
}

log(`ready — screenshots×${env.screenshotConcurrency}, lighthouse×${env.lighthouseConcurrency}`);

async function shutdown() {
  log('shutting down…');
  await Promise.allSettled(workers.map((w) => w.close()));
  await closeBrowser();
  await connection.quit();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
