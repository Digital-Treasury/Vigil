import { NextResponse } from 'next/server';
import { handler, requireUser } from '@/lib/api';
import { investigationsData } from '@/lib/queries';

export const GET = handler(async () => {
  await requireUser();
  return NextResponse.json({ investigations: investigationsData() });
});
