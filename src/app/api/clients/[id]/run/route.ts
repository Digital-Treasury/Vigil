import { NextResponse } from 'next/server';
import { handler, requireUser } from '@/lib/api';
import { startRun } from '@/lib/runner';

export const POST = handler(async (_req, ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const runId = startRun(Number(id), 'manual');
  return NextResponse.json({ runId });
});
