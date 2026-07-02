import { NextResponse } from 'next/server';
import { ApiError, handler, requireUser } from '@/lib/api';
import { getDb } from '@/lib/db';
import type { Client } from '@/lib/types';

interface PageInput {
  label?: string;
  url?: string;
  viewports?: string[];
  mask_selectors?: string[];
  wait_selector?: string | null;
}

// POST accepts {pages: [...]} (bulk, e.g. CSV import) or a single page object.
export const POST = handler(async (req, ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(Number(id)) as Client;
  if (!client) throw new ApiError(404, 'Client not found');

  const body = await req.json();
  const inputs: PageInput[] = Array.isArray(body.pages) ? body.pages : [body];
  const insert = db.prepare(
    `INSERT INTO pages (client_id, label, url, viewports, mask_selectors, wait_selector, sort)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const ids: number[] = [];
  const base = client.url.replace(/\/+$/, '');
  for (const input of inputs) {
    const label = String(input.label || '').trim();
    let url = String(input.url || '').trim();
    if (!label || !url) continue;
    if (url.startsWith('/')) url = base + url;
    else if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    const viewports = (input.viewports || ['desktop']).filter((v) =>
      ['desktop', 'mobile'].includes(v)
    );
    const info = insert.run(
      Number(id),
      label,
      url,
      JSON.stringify(viewports.length ? viewports : ['desktop']),
      JSON.stringify(input.mask_selectors || []),
      input.wait_selector || null,
      ids.length
    );
    ids.push(Number(info.lastInsertRowid));
  }
  if (!ids.length) throw new ApiError(400, 'No valid pages supplied');
  return NextResponse.json({ ids });
});
