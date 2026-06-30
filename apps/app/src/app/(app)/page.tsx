import Link from 'next/link';
import { Plus } from 'lucide-react';
import { prisma } from '@vigil/db';

export const dynamic = 'force-dynamic';

// P0 placeholder dashboard — the full fleet table + stat cards land in P1.
export default async function DashboardPage() {
  const clientCount = await prisma.client.count();

  return (
    <div className="max-w-[1180px] px-10 pb-16 pt-[34px]">
      <div className="mb-7 flex items-end justify-between gap-6">
        <div>
          <div className="dt-eyebrow mb-2">Fleet overview</div>
          <h1 className="m-0 text-[30px] font-bold tracking-tight text-ink-1">Dashboard</h1>
          <p className="mt-1.5 text-sm text-ink-4">
            {clientCount === 0
              ? 'No clients yet — add your first to start watching pages.'
              : `${clientCount} client${clientCount === 1 ? '' : 's'} under watch.`}
          </p>
        </div>
        <Link
          href="/clients/new"
          className="flex h-[42px] items-center gap-2 rounded-[10px] bg-ink-0 px-[18px] text-sm font-semibold text-white"
        >
          <Plus size={17} /> Add client
        </Link>
      </div>

      {clientCount === 0 && (
        <div className="rounded-[14px] border border-ink-7 bg-ink-10 px-10 py-16 text-center">
          <p className="text-sm text-ink-4">
            Your fleet is empty. Add a client and its valuable pages to begin.
          </p>
        </div>
      )}
    </div>
  );
}
