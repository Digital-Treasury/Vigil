import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/google';
import { signSession, sessionCookie } from '@/lib/session';
import { recordSignIn } from '@/lib/db';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const savedState = req.cookies.get('vigil_oauth_state')?.value;
  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', req.url));
  }
  const origin = process.env.APP_URL || req.nextUrl.origin;
  const result = await exchangeCode(origin, code);
  if ('error' in result) {
    const reason = result.error === 'wrong_domain' ? 'wrong_domain' : 'auth_failed';
    return NextResponse.redirect(new URL(`/login?error=${reason}`, req.url));
  }
  recordSignIn(result.email, result.name);
  const res = NextResponse.redirect(new URL('/', req.url));
  res.cookies.set(sessionCookie(signSession(result)));
  res.cookies.delete('vigil_oauth_state');
  return res;
}
