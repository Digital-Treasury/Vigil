// Client-safe formatting helpers. SQLite datetimes are UTC "YYYY-MM-DD HH:MM:SS".

export function parseUtc(sqliteDate: string | null | undefined): Date | null {
  if (!sqliteDate) return null;
  const iso = sqliteDate.includes('T') ? sqliteDate : `${sqliteDate.replace(' ', 'T')}Z`;
  const date = new Date(iso);
  return isNaN(date.getTime()) ? null : date;
}

const TZ = 'Australia/Melbourne';

export function formatWhen(sqliteDate: string | null | undefined): string {
  const date = parseUtc(sqliteDate);
  if (!date) return '—';
  const now = new Date();
  const dayFmt = new Intl.DateTimeFormat('en-AU', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  const timeFmt = new Intl.DateTimeFormat('en-AU', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true });
  const time = timeFmt.format(date).replace(' ', '');
  const today = dayFmt.format(now);
  const that = dayFmt.format(date);
  if (that === today) return `Today ${time}`;
  const yesterday = dayFmt.format(new Date(now.getTime() - 86400000));
  if (that === yesterday) return `Yesterday ${time}`;
  const full = new Intl.DateTimeFormat('en-AU', { timeZone: TZ, day: 'numeric', month: 'short' }).format(date);
  return `${full} · ${time}`;
}

export function diffColor(pct: number | null | undefined, threshold = 1): string {
  if (pct == null) return 'var(--status-danger)';
  if (pct === 0) return 'var(--ink-4)';
  if (pct <= threshold) return 'var(--status-success)';
  if (pct <= 10) return 'var(--status-warning)';
  return 'var(--status-danger)';
}

export function formatPct(pct: number | null | undefined): string {
  if (pct == null) return '—';
  return `${pct.toFixed(pct < 10 ? 1 : 0)}%`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}
