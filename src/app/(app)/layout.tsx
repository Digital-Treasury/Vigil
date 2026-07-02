import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import Rail from '@/components/Rail';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--ink-9)' }}>
      <Rail userName={session.name} userEmail={session.email} />
      <main className="vg-scroll" style={{ flex: 1, minWidth: 0, maxHeight: '100vh', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
