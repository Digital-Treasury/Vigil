import { NextResponse } from 'next/server';
import { handler, requireUser } from '@/lib/api';
import { getDb, getSetting, setSetting, SETTING_DEFAULTS } from '@/lib/db';
import { ALLOWED_DOMAIN } from '@/lib/google';

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '····';
  return `${key.slice(0, 7)}${'·'.repeat(20)}${key.slice(-4)}`;
}

export const GET = handler(async () => {
  await requireUser();
  const team = getDb()
    .prepare('SELECT email, name, last_seen FROM sign_ins ORDER BY last_seen DESC LIMIT 50')
    .all();
  return NextResponse.json({
    domain: ALLOWED_DOMAIN,
    anthropic_key_set: !!getSetting('anthropic_api_key'),
    anthropic_key_masked: maskKey(getSetting('anthropic_api_key')),
    global_threshold: getSetting('global_threshold'),
    retention_days: getSetting('retention_days'),
    notify_from: getSetting('notify_from'),
    notify_only_on_changes: getSetting('notify_only_on_changes') === '1',
    smtp_configured: !!process.env.SMTP_HOST,
    team,
  });
});

export const PATCH = handler(async (req) => {
  await requireUser();
  const body = await req.json();
  if (typeof body.anthropic_api_key === 'string') setSetting('anthropic_api_key', body.anthropic_api_key.trim());
  if (body.global_threshold !== undefined) {
    const value = parseFloat(body.global_threshold);
    if (!isNaN(value) && value >= 0) setSetting('global_threshold', String(value));
  }
  if (body.retention_days !== undefined) {
    const value = parseInt(body.retention_days, 10);
    if (!isNaN(value) && value > 0) setSetting('retention_days', String(value));
  }
  if (typeof body.notify_from === 'string' && body.notify_from.trim()) {
    setSetting('notify_from', body.notify_from.trim());
  }
  if (body.notify_only_on_changes !== undefined) {
    setSetting('notify_only_on_changes', body.notify_only_on_changes ? '1' : '0');
  }
  void SETTING_DEFAULTS;
  return NextResponse.json({ ok: true });
});
