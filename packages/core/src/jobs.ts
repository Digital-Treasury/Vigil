// Shared queue names + job payload types. The app enqueues; the worker consumes.
// Two queues with separate concurrency: screenshots vs Lighthouse (conflicting
// resource needs — see the implementation plan).

export const QUEUES = {
  run: 'vigil:run',
  capture: 'vigil:capture',
  lighthouse: 'vigil:lighthouse',
  compare: 'vigil:compare',
  maintenance: 'vigil:maintenance',
} as const;

export type ViewportKindStr = 'desktop' | 'mobile';

/** Enqueued when a run is triggered (manual / scheduled / maintenance). */
export interface RunJobData {
  runId: string;
  clientId: string;
}

/** Enqueued when a checkpoint "before" snapshot is requested. */
export interface CheckpointJobData {
  checkpointId: string;
  clientId: string;
}

/** One screenshot+code capture for a (page × viewport). The Capture row is
 *  created by the processor on completion (with its final status). */
export interface CaptureJobData {
  pageId: string;
  viewport: ViewportKindStr;
  runId?: string;
  checkpointId?: string;
  /** Force-promote this capture to the baseline (explicit "re-capture & set baseline"). */
  promoteBaseline?: boolean;
}

/** A Lighthouse pass for a capture (own queue, fresh Chrome). */
export interface LighthouseJobData {
  captureId: string;
  pageId: string;
  viewport: ViewportKindStr;
}

/** Compute comparisons + run summary once a run's captures are done. */
export interface CompareJobData {
  runId: string;
}

export type MaintenanceJobName = 'prune-retention' | 'db-backup';
export interface MaintenanceJobData {
  task: MaintenanceJobName;
}

// Per-client scheduler id (stable, idempotent upsert).
export function scheduleId(clientId: string): string {
  return `client:${clientId}`;
}
