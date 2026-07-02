import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE = 'vigil_session';
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export interface Session {
  email: string;
  name: string;
  exp: number;
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === 'production' && process.env.DEV_AUTH_BYPASS !== '1') {
      throw new Error('AUTH_SECRET is required in production');
    }
    return 'vigil-dev-secret';
  }
  return s;
}

export function signSession(payload: Omit<Session, 'exp'>): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + MAX_AGE })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | undefined): Session | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const session = JSON.parse(Buffer.from(body, 'base64url').toString()) as Session;
    if (session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  if (process.env.DEV_AUTH_BYPASS === '1') {
    return { email: 'dev@digitaltreasury.com.au', name: 'Dev User', exp: 0 };
  }
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE)?.value);
}

export function sessionCookie(token: string) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  };
}

export const SESSION_COOKIE_NAME = COOKIE;
