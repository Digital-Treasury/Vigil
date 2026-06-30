import Link from 'next/link';
import { Plus, Search, Building2, PlayCircle, Eye, Flag } from 'lucide-react';
import { prisma } from '@vigil/db';
import { StatusPill } from '@/components/Status';
import { RunNowButton } from '@/components/RunNowButton';
import { deriveHealth } from '@/lib/health';

export const dynamic = 'force-dynamic';

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export default async function DashboardPage() {
  const [clients, openInvestigations, runsToday] = await Promise.all([
    prisma.client.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { pages: true } },
        runs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
    prisma.investigation.count({ where: { status: 'open' } }),
    prisma.run.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
  ]);

  const rows = clients.map((c) => ({ client: c, health: deriveHealth(c.runs[0]) }));
  const awaiting = rows.reduce((n, r) => n + r.health.awaiting, 0);
  // needs-attention first, then name
  rows.sort((a, b) => b.health.awaiting - a.health.awaiting || a.client.name.localeCompare(b.client.name));

  const stats = [
    { icon: Building2, label: 'Active clients', value: clients.length, color: 'var(--color-ink-4)', valueColor: 'var(--color-ink-1)' },
    { icon: PlayCircle, label: 'Runs today', value: runsToday, color: 'var(--color-ink-4)', valueColor: 'var(--color-ink-1)' },
    { icon: Eye, label: 'Pages awaiting review', value: awaiting, color: '#B47A12', valueColor: '#B47A12' },
    { icon: Flag, label: 'Open investigations', value: openInvestigations, color: '#C0322B', valueColor: '#C0322B' },
  ];

  return (
    <div className="max-w-[1180px] px-10 pb-16 pt-[34px]">
      <div className="mb-7 flex items-end justify-between gap-6">
        <div>
          <div className="dt-eyebrow mb-2">Fleet overview</div>
          <h1 className="m-0 text-[30px] font-bold tracking-tight text-ink-1">Dashboard</h1>
          <p className="mt-1.5 text-sm text-ink-4">
            {awaiting > 0
              ? `${awaiting} page${awaiting === 1 ? '' : 's'} need your eyes.`
              : 'Everything looks calm across the fleet.'}
          </p>
        </div>
        <Link
          href="/clients/new"
          className="flex h-[42px] items-center gap-2 rounded-[10px] bg-ink-0 px-[18px] text-sm font-semibold text-white transition active:scale-[.98]"
        >
          <Plus size={17} /> Add client
        </Link>
      </div>

      <div className="mb-7 grid grid-cols-4 gap-3.5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-[14px] border border-ink-7 bg-ink-10 px-5 py-[18px]">
              <div className="mb-3 flex items-center gap-2 text-[12.5px] font-medium text-ink-4">
                <Icon size={15} style={{ color: s.color }} /> {s.label}
              </div>
              <div className="text-[34px] font-bold leading-none tracking-tight" style={{ color: s.valueColor }}>
                {s.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="m-0 text-base font-semibold text-ink-1">Clients</h2>
          {clients.length > 0 && (
            <span className="text-[13px] text-ink-5">sorted by — needs attention first</span>
          )}
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-[14px] border border-ink-7 bg-ink-10 px-10 py-16 text-center">
          <Search className="mx-auto mb-3 text-ink-5" size={22} />
          <p className="text-sm text-ink-4">
            Your fleet is empty. <Link href="/clients/new" className="font-semibold text-ink-1 underline">Add a client</Link> and its valuable pages to begin.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-ink-7 bg-ink-10">
          <div className="grid grid-cols-[2.4fr_1.5fr_1.3fr_auto] gap-4 border-b border-ink-7 px-[22px] py-[11px] text-[11px] font-semibold uppercase tracking-wide text-ink-5">
            <span>Client</span>
            <span>Last run</span>
            <span>Status</span>
            <span />
          </div>
          {rows.map(({ client: c, health }) => (
            <div
              key={c.id}
              className="grid grid-cols-[2.4fr_1.5fr_1.3fr_auto] items-center gap-4 border-b border-ink-8 px-[22px] py-[15px] transition hover:bg-ink-9"
            >
              <Link href={`/clients/${c.id}`} className="flex min-w-0 items-center gap-3">
                <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-ink-1 text-[13px] font-semibold text-white">
                  {initials(c.name)}
                </div>
                <div className="min-w-0">
                  <div className="whitespace-nowrap text-[14.5px] font-semibold text-ink-1">{c.name}</div>
                  <div className="text-[12.5px] text-ink-5">
                    {new URL(c.primaryUrl).host} · {c._count.pages} pages
                  </div>
                </div>
              </Link>
              <Link href={`/clients/${c.id}`} className="min-w-0 text-[13px] text-ink-3">
                <div className="truncate">{health.lastRunLabel}</div>
                {health.lastRunAt && <div className="text-[12px] text-ink-5">{health.lastRunAt}</div>}
              </Link>
              <div>
                <StatusPill status={health.status} pulse={health.status === 'running'} />
              </div>
              <RunNowButton clientId={c.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
