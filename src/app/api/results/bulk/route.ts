import { NextResponse } from 'next/server';
import { ApiError, handler, requireUser } from '@/lib/api';
import { getDb } from '@/lib/db';
import { acceptBaseline, flagResult } from '@/lib/runner';
import type { RunResult } from '@/lib/types';

// Bulk review actions from the run-report table.
// { action: 'accept' | 'flag', ids: number[], note?: string }
export const POST = handler(async (req) => {
  const user = await requireUser();
  const body = await req.json();
  const action = body.action as string;
  const ids: number[] = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];
  if (!['accept', 'flag'].includes(action)) throw new ApiError(400, 'action must be "accept" or "flag"');
  if (!ids.length) throw new ApiError(400, 'No result ids supplied');
  if (ids.length > 500) throw new ApiError(400, 'Too many results in one request');

  const db = getDb();
  const userName = user.name || user.email;
  const note = String(body.note || '');
  let done = 0;
  let skipped = 0;

  for (const id of ids) {
    const result = db.prepare('SELECT * FROM run_results WHERE id = ?').get(id) as RunResult | undefined;
    // Failed captures have nothing to promote or flag; running rows aren't ready.
    if (!result || !result.capture_id || result.status === 'error' || result.status === 'running') {
      skipped++;
      continue;
    }
    if (action === 'accept') acceptBaseline(id, userName);
    else flagResult(id, userName, note);
    done++;
  }

  return NextResponse.json({ done, skipped });
});
