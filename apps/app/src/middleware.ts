import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Edge middleware uses the DB-free config; it only checks for a session and
// redirects unauthenticated users to /login (see authConfig.callbacks.authorized).
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Run on everything except Next internals and static files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};
