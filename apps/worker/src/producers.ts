import { FlowProducer, Queue } from 'bullmq';
import { connection } from './redis.js';
import { QUEUES, type LighthouseJobData } from '@vigil/core';

// Fan-out: a run creates a parent `compare` job whose children are `capture`
// jobs; the parent runs once all captures complete.
export const flow = new FlowProducer({ connection });

// Lighthouse is decoupled (own queue, low concurrency) — enqueued by the
// capture processor and attaches results to the capture row best-effort.
export const lighthouseQueue = new Queue<LighthouseJobData>(QUEUES.lighthouse, { connection });
