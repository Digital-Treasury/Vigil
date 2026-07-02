import { NextResponse } from 'next/server';
import { handler, requireUser } from '@/lib/api';
import { getDb } from '@/lib/db';

export const POST = handler(async (_req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  getDb()
    .prepare(
      `UPDATE investigations SET status = 'resolved', resolved_by = ?, resolved_at = datetime('now') WHERE id = ?`
    )
    .run(user.name || user.email, Number(id));
  return NextResponse.json({ ok: true });
});
