import { getDb } from './db';
import { startRun, cleanupRetention } from './runner';
import type { Client } from './types';

export const TIMEZONE = 'Australia/Melbourne';

declare global {
  // eslint-disable-next-line no-var
  var __vigilScheduler: NodeJS.Timeout | undefined;
}

/** Current wall-clock in Melbourne as {day 0-6, hhmm "06:00", stamp "2026-07-02 06:00"}. */
export function melbourneNow() {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: TIMEZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hour = get('hour') === '24' ? '00' : get('hour');
  const hhmm = `${hour}:${get('minute')}`;
  return {
    day: days.indexOf(get('weekday').slice(0, 3)),
    hhmm,
    stamp: `${get('year')}-${get('month')}-${get('day')} ${hhmm}`,
  };
}

const firedThisMinute = new Set<string>();
let lastMinute = '';
let lastCleanupDate = '';

function tick() {
  try {
    const now = melbourneNow();
    if (now.stamp !== lastMinute) {
      firedThisMinute.clear();
      lastMinute = now.stamp;
    }
    const db = getDb();
    const clients = db
      .prepare('SELECT * FROM clients WHERE schedule_enabled = 1')
      .all() as Client[];
    for (const client of clients) {
      if (client.schedule_time !== now.hhmm) continue;
      if (client.schedule_freq === 'weekly' && client.schedule_day !== now.day) continue;
      const key = `${client.id}:${now.stamp}`;
      if (firedThisMinute.has(key)) continue;
      firedThisMinute.add(key);
      const hasPages = db
        .prepare('SELECT COUNT(*) AS n FROM pages WHERE client_id = ?')
        .get(client.id) as { n: number };
      if (hasPages.n > 0) {
        console.log(`[vigil] scheduled run for client ${client.id} (${client.name})`);
        startRun(client.id, 'scheduled');
      }
    }

    // Retention cleanup once a day, in the quiet early morning.
    const today = now.stamp.slice(0, 10);
    if (now.hhmm >= '03:00' && lastCleanupDate !== today) {
      lastCleanupDate = today;
      cleanupRetention();
    }
  } catch (err) {
    console.error('[vigil] scheduler tick failed:', err);
  }
}

export function startScheduler() {
  if (globalThis.__vigilScheduler) return;
  globalThis.__vigilScheduler = setInterval(tick, 30_000);
  console.log('[vigil] scheduler started (Australia/Melbourne)');
}

/** "Next run" preview for the schedule screen. */
export function nextRunPreview(client: Client): string | null {
  if (!client.schedule_enabled) return null;
  const now = melbourneNow();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (client.schedule_freq === 'daily') {
    const today = now.hhmm < client.schedule_time;
    return `${today ? 'Today' : 'Tomorrow'}, ${client.schedule_time} AEST`;
  }
  let delta = (client.schedule_day - now.day + 7) % 7;
  if (delta === 0 && now.hhmm >= client.schedule_time) delta = 7;
  const label = delta === 0 ? 'Today' : days[client.schedule_day];
  return `${label}, ${client.schedule_time} AEST`;
}
