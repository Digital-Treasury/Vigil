import NextAuth from 'next-auth';
import { prisma } from '@vigil/db';
import { authConfig, ALLOWED_EMAIL_DOMAIN } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt' },
  callbacks: {
    ...authConfig.callbacks,
    // Server-side Workspace-domain enforcement + user record upsert.
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return false;
      const p = profile as { email_verified?: boolean; hd?: string; email?: string };
      const domainOk =
        p.hd === ALLOWED_EMAIL_DOMAIN ||
        (typeof p.email === 'string' && p.email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`));
      if (!p.email_verified || !domainOk || !p.email) return false;

      await prisma.user.upsert({
        where: { email: p.email },
        update: {
          name: (profile as { name?: string }).name,
          image: (profile as { picture?: string }).picture,
          lastLoginAt: new Date(),
        },
        create: {
          email: p.email,
          name: (profile as { name?: string }).name,
          image: (profile as { picture?: string }).picture,
          lastLoginAt: new Date(),
        },
      });
      return true;
    },
    async jwt({ token, profile }) {
      if (profile?.email) token.email = profile.email as string;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) session.user.email = token.email;
      return session;
    },
  },
});
