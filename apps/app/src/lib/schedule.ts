// Cron schedule helpers (client- and server-safe). Used by the client schedule
// builder for live preview and by the client action to validate before upsert.
import cronstrue from 'cronstrue';
import { parseExpression } from 'cron-parser';

export const DEFAULT_TIMEZONE = 'Australia/Melbourne';

export interface SchedulePreset {
  id: string;
  label: string;
  cron: string;
}

// Weekly maintenance windows default to the small hours, Melbourne time.
export const SCHEDULE_PRESETS: SchedulePreset[] = [
  { id: 'weekly-mon', label: 'Weekly · Mon 2am', cron: '0 2 * * 1' },
  { id: 'weekly-wed', label: 'Weekly · Wed 2am', cron: '0 2 * * 3' },
  { id: 'weekly-sun', label: 'Weekly · Sun 2am', cron: '0 2 * * 0' },
  { id: 'daily', label: 'Daily · 2am', cron: '0 2 * * *' },
];

/** Human description of a cron pattern, or null if it can't be parsed. */
export function describeCron(cron: string): string | null {
  try {
    return cronstrue.toString(cron, { use24HourTimeFormat: false, verbose: false });
  } catch {
    return null;
  }
}

export function isValidCron(cron: string): boolean {
  try {
    parseExpression(cron);
    return true;
  } catch {
    return false;
  }
}

/** The next `count` fire times for a cron in the given timezone. */
export function nextRuns(cron: string, tz = DEFAULT_TIMEZONE, count = 3): Date[] {
  try {
    const it = parseExpression(cron, { tz });
    return Array.from({ length: count }, () => it.next().toDate());
  } catch {
    return [];
  }
}
