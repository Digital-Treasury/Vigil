import { NextResponse } from 'next/server';
import { ApiError, handler, requireUser } from '@/lib/api';
import { getDb } from '@/lib/db';

export const POST = handler(async (req) => {
  await requireUser();
  const body = await req.json();
  const name = String(body.name || '').trim();
  let url = String(body.url || '').trim();
  if (!name || !url) throw new ApiError(400, 'Name and URL are required');
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  const notify = Array.isArray(body.notify_emails) ? body.notify_emails : [];
  const info = getDb()
    .prepare('INSERT INTO clients (name, url, notify_emails) VALUES (?, ?, ?)')
    .run(name, url, JSON.stringify(notify));
  return NextResponse.json({ id: Number(info.lastInsertRowid) });
});
