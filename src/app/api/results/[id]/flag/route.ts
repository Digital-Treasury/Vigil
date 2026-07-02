import { NextResponse } from 'next/server';
import { handler, requireUser } from '@/lib/api';
import { flagResult } from '@/lib/runner';

export const POST = handler(async (req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { note } = await req.json().catch(() => ({ note: '' }));
  flagResult(Number(id), user.name || user.email, String(note || ''));
  return NextResponse.json({ ok: true });
});
