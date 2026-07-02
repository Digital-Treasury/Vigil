import { NextResponse } from 'next/server';
import { ApiError, handler, requireUser } from '@/lib/api';
import { getDb } from '@/lib/db';
import { clientDetailData } from '@/lib/queries';

export const GET = handler(async (_req, ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const data = clientDetailData(Number(id));
  if (!data) throw new ApiError(404, 'Client not found');
  return NextResponse.json(data);
});

export const PATCH = handler(async (req, ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const body = await req.json();
  const db = getDb();
  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(Number(id));
  if (!client) throw new ApiError(404, 'Client not found');

  const sets: string[] = [];
  const values: unknown[] = [];
  const set = (column: string, value: unknown) => {
    sets.push(`${column} = ?`);
    values.push(value);
  };
  if (body.name !== undefined) set('name', String(body.name).trim());
  if (body.url !== undefined) set('url', String(body.url).trim());
  if (body.notify_emails !== undefined) set('notify_emails', JSON.stringify(body.notify_emails));
  if (body.threshold_override !== undefined)
    set('threshold_override', body.threshold_override === null ? null : Number(body.threshold_override));
  if (body.retention_override !== undefined)
    set('retention_override', body.retention_override === null ? null : Number(body.retention_override));
  if (body.lighthouse_enabled !== undefined) set('lighthouse_enabled', body.lighthouse_enabled ? 1 : 0);
  if (body.schedule !== undefined) {
    set('schedule_enabled', body.schedule.enabled ? 1 : 0);
    set('schedule_freq', body.schedule.freq === 'daily' ? 'daily' : 'weekly');
    set('schedule_day', Math.min(6, Math.max(0, Number(body.schedule.day ?? 1))));
    set('schedule_time', /^\d{2}:\d{2}$/.test(body.schedule.time) ? body.schedule.time : '06:00');
  }
  if (sets.length) {
    db.prepare(`UPDATE clients SET ${sets.join(', ')} WHERE id = ?`).run(...values, Number(id));
  }
  return NextResponse.json({ ok: true });
});

export const DELETE = handler(async (_req, ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  getDb().prepare('DELETE FROM clients WHERE id = ?').run(Number(id));
  return NextResponse.json({ ok: true });
});
