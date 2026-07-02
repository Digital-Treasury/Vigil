import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { authUrl, googleConfigured } from '@/lib/google';

export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL('/login?error=not_configured', req.url));
  }
  const state = crypto.randomBytes(16).toString('hex');
  const origin = process.env.APP_URL || req.nextUrl.origin;
  const res = NextResponse.redirect(authUrl(origin, state));
  res.cookies.set('vigil_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return res;
}
