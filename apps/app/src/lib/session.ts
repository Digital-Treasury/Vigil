import 'server-only';
import { prisma, type User } from '@vigil/db';
import { auth } from '@/auth';

/** The signed-in user's DB row (creating it lazily if the JWT predates it). */
export async function currentUser(): Promise<User | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  return prisma.user.findUnique({ where: { email } });
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}
