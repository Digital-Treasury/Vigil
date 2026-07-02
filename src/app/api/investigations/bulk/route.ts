import { NextResponse } from 'next/server';
import { ApiError, handler, requireUser } from '@/lib/api';
import { getDb } from '@/lib/db';
import { acceptBaseline } from '@/lib/runner';
import type { Investigation } from '@/lib/types';

// Bulk queue actions: { action: 'resolve' | 'accept', ids: number[] }  (investigation ids)
// 'accept' promotes each item's capture to baseline, which also resolves it.
export const POST = handler(async (req) => {
  const user = await requireUser();
  const body = await req.json();
  const action = body.action as string;
  const ids: number[] = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];
  if (!['resolve', 'accept'].includes(action)) throw new ApiError(400, 'action must be "resolve" or "accept"');
  if (!ids.length) throw new ApiError(400, 'No investigation ids supplied');

  const db = getDb();
  const userName = user.name || user.email;
  let done = 0;
  let skipped = 0;

  for (const id of ids) {
    const investigation = db
      .prepare(`SELECT * FROM investigations WHERE id = ? AND status = 'open'`)
      .get(id) as Investigation | undefined;
    if (!investigation) {
      skipped++;
      continue;
    }
    if (action === 'accept') {
      acceptBaseline(investigation.result_id, userName); // also resolves the investigation
    } else {
      db.prepare(
        `UPDATE investigations SET status = 'resolved', resolved_by = ?, resolved_at = datetime('now') WHERE id = ?`
      ).run(userName, id);
    }
    done++;
  }

  return NextResponse.json({ done, skipped });
});
