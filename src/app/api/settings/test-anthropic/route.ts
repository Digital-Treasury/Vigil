import { NextResponse } from 'next/server';
import { handler, requireUser } from '@/lib/api';
import { getSetting } from '@/lib/db';
import { testAnthropicKey } from '@/lib/claude';

export const POST = handler(async () => {
  await requireUser();
  const key = getSetting('anthropic_api_key');
  if (!key) return NextResponse.json({ ok: false, error: 'No API key set' });
  return NextResponse.json(await testAnthropicKey(key));
});
