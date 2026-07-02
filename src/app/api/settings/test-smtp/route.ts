import { NextResponse } from 'next/server';
import { handler, requireUser } from '@/lib/api';
import { testSmtp } from '@/lib/mailer';

export const POST = handler(async () => {
  await requireUser();
  return NextResponse.json(await testSmtp());
});
