import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? 'digitaltreasury.com.au';

// Edge-safe config shared by middleware. No DB access here. The `hd` param is
// only a UI hint to Google — the real domain gate is the server-side signIn
// callback in auth.ts.
export const authConfig = {
  providers: [
    Google({
      authorization: {
        params: { hd: ALLOWED_DOMAIN, prompt: 'select_account' },
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    // Gate every non-public route on an authenticated session.
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname === '/login' ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/_next');
      if (isPublic) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;

export const ALLOWED_EMAIL_DOMAIN = ALLOWED_DOMAIN;
