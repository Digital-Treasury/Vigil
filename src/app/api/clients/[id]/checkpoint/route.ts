import { NextResponse } from 'next/server';
import { ApiError, handler, requireUser } from '@/lib/api';
import { startCheckpoint, endCheckpoint } from '@/lib/runner';

export const POST = handler(async (req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { action } = await req.json();
  if (action === 'start') {
    const checkpointId = startCheckpoint(Number(id), user.name || user.email);
    return NextResponse.json({ checkpointId });
  }
  if (action === 'end') {
    endCheckpoint(Number(id));
    return NextResponse.json({ ok: true });
  }
  throw new ApiError(400, 'action must be "start" or "end"');
});
