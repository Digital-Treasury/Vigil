import { NextResponse } from 'next/server';
import { handler, requireUser } from '@/lib/api';
import { dashboardData } from '@/lib/queries';

export const GET = handler(async () => {
  await requireUser();
  return NextResponse.json(dashboardData());
});
