import { NextResponse } from 'next/server';
import { ApiError, handler, requireUser } from '@/lib/api';
import { getDb } from '@/lib/db';
import { codeDiffLines } from '@/lib/codediff';
import type { Capture, RunResult } from '@/lib/types';

export const GET = handler(async (req, ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const against = url.searchParams.get('against') === 'checkpoint' ? 'checkpoint' : 'baseline';
  const db = getDb();
  const result = db.prepare('SELECT * FROM run_results WHERE id = ?').get(Number(id)) as RunResult;
  if (!result?.capture_id) throw new ApiError(404, 'Result not found');
  const beforeId =
    against === 'checkpoint' ? result.checkpoint_capture_id : result.baseline_capture_id;
  if (!beforeId) throw new ApiError(404, `No ${against} capture`);
  const before = db.prepare('SELECT * FROM captures WHERE id = ?').get(beforeId) as Capture;
  const after = db.prepare('SELECT * FROM captures WHERE id = ?').get(result.capture_id) as Capture;
  return NextResponse.json(codeDiffLines(before, after));
});
