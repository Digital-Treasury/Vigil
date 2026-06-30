import { Worker } from 'bullmq';
import { QUEUES } from '@vigil/core';
import { connection } from './redis';
import { env } from './env';

// Vigil capture worker. Two queues with separate concurrency (screenshots vs
// Lighthouse) because they have conflicting resource needs. Job processors are
// implemented incrementally across phases P2–P8; P0 boots the process and the
// queue topology so the stack runs end-to-end.

const log = (msg: string, extra?: unknown) =>
  console.log(`[worker] ${msg}`, extra !== undefined ? extra : '');

async function notImplemented(name: string) {
  log(`processor "${name}" not implemented yet`);
}

const workers: Worker[] = [
  new Worker(QUEUES.run, async () => notImplemented('run'), { connection, concurrency: 2 }),
  new Worker(QUEUES.capture, async () => notImplemented('capture'), {
    connection,
    concurrency: env.screenshotConcurrency,
  }),
  new Worker(QUEUES.lighthouse, async () => notImplemented('lighthouse'), {
    connection,
    concurrency: env.lighthouseConcurrency,
  }),
  new Worker(QUEUES.compare, async () => notImplemented('compare'), {
    connection,
    concurrency: 2,
  }),
  new Worker(QUEUES.maintenance, async () => notImplemented('maintenance'), {
    connection,
    concurrency: 1,
  }),
];

for (const w of workers) {
  w.on('failed', (job, err) => log(`job failed: ${job?.name} (${job?.id})`, err?.message));
}

log(`ready — screenshots×${env.screenshotConcurrency}, lighthouse×${env.lighthouseConcurrency}`);

async function shutdown() {
  log('shutting down…');
  await Promise.allSettled(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
