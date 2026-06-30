import type { HealthStatus } from '@vigil/core';
import cronstrue from 'cronstrue';

interface RunLike {
  status: string;
  trigger: string;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  summary: unknown;
}

interface SummaryCounts {
  passed?: number;
  changes?: number;
  broken?: number;
  failed?: number;
  total?: number;
}

export interface ClientHealth {
  status: HealthStatus;
  lastRunLabel: string;
  lastRunAt: string | null;
  awaiting: number;
}

export function relativeTime(d: Date | null): string | null {
  if (!d) return null;
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export function deriveHealth(latestRun: RunLike | undefined): ClientHealth {
  if (!latestRun) {
    return { status: 'resolved', lastRunLabel: 'No runs yet', lastRunAt: null, awaiting: 0 };
  }
  if (latestRun.status === 'running' || latestRun.status === 'queued') {
    return { status: 'running', lastRunLabel: 'In progress…', lastRunAt: null, awaiting: 0 };
  }
  const s = (latestRun.summary ?? {}) as SummaryCounts;
  const passed = s.passed ?? 0;
  const changes = s.changes ?? 0;
  const broken = s.broken ?? 0;
  const failed = s.failed ?? 0;

  let status: HealthStatus = 'passed';
  if (broken > 0) status = 'broken';
  else if (changes > 0) status = 'changes';

  const parts: string[] = [];
  if (broken) parts.push(`${broken} broken`);
  if (changes) parts.push(`${changes} change${changes === 1 ? '' : 's'}`);
  if (failed) parts.push(`${failed} failed`);
  if (passed) parts.push(`${passed} passed`);
  const label = parts.length ? parts.join(' · ') : 'No changes';

  return {
    status,
    lastRunLabel: label,
    lastRunAt: relativeTime(latestRun.completedAt ?? latestRun.createdAt),
    awaiting: changes + broken,
  };
}

export function describeCron(cron: string | null, timezone: string): string {
  if (!cron) return 'Manual only';
  try {
    return `${cronstrue.toString(cron, { use24HourTimeFormat: true })} (${timezone})`;
  } catch {
    return cron;
  }
}
