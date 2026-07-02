import { NextResponse } from 'next/server';
import { ApiError, handler, requireUser } from '@/lib/api';
import { reviewData } from '@/lib/queries';

export const GET = handler(async (_req, ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const data = reviewData(Number(id));
  if (!data) throw new ApiError(404, 'Result not found');
  return NextResponse.json(data);
});
