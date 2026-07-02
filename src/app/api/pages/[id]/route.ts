import { NextResponse } from 'next/server';
import { ApiError, handler, requireUser } from '@/lib/api';
import { getDb } from '@/lib/db';
import { pageDetailData } from '@/lib/queries';

export const GET = handler(async (_req, ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const data = pageDetailData(Number(id));
  if (!data) throw new ApiError(404, 'Page not found');
  return NextResponse.json(data);
});

export const PATCH = handler(async (req, ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const body = await req.json();
  const db = getDb();
  const page = db.prepare('SELECT id FROM pages WHERE id = ?').get(Number(id));
  if (!page) throw new ApiError(404, 'Page not found');
  const sets: string[] = [];
  const values: unknown[] = [];
  const set = (column: string, value: unknown) => {
    sets.push(`${column} = ?`);
    values.push(value);
  };
  if (body.label !== undefined) set('label', String(body.label).trim());
  if (body.url !== undefined) set('url', String(body.url).trim());
  if (body.viewports !== undefined) set('viewports', JSON.stringify(body.viewports));
  if (body.mask_selectors !== undefined) set('mask_selectors', JSON.stringify(body.mask_selectors));
  if (body.wait_selector !== undefined) set('wait_selector', body.wait_selector || null);
  if (sets.length) {
    db.prepare(`UPDATE pages SET ${sets.join(', ')} WHERE id = ?`).run(...values, Number(id));
  }
  return NextResponse.json({ ok: true });
});

export const DELETE = handler(async (_req, ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  getDb().prepare('DELETE FROM pages WHERE id = ?').run(Number(id));
  return NextResponse.json({ ok: true });
});
