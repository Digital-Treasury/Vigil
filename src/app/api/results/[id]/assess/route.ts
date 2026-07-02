import { NextResponse } from 'next/server';
import { handler, requireUser } from '@/lib/api';
import { assessResult } from '@/lib/claude';

export const POST = handler(async (_req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const assessment = await assessResult(Number(id), user.name || user.email);
  return NextResponse.json({ assessment });
});
