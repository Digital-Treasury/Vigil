import { NextResponse } from 'next/server';
import { handler, requireUser } from '@/lib/api';
import { recaptureBaseline } from '@/lib/runner';

export const POST = handler(async (_req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  recaptureBaseline(Number(id), user.name || user.email);
  return NextResponse.json({ ok: true });
});
