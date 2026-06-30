import { auth, signOut } from '@/auth';
import { prisma } from '@vigil/db';
import { Sidebar } from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const openInvestigations = await prisma.investigation.count({ where: { status: 'open' } });

  async function doSignOut() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  return (
    <div className="flex min-h-screen bg-ink-9">
      <Sidebar
        user={session?.user}
        openInvestigations={openInvestigations}
        signOutAction={doSignOut}
      />
      <main className="vg-scroll max-h-screen min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
