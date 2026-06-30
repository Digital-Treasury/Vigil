import Link from 'next/link';
import { prisma, type InvestigationStatus } from '@vigil/db';
import { InvestigationCard, type InvestigationItem } from '@/components/InvestigationCard';

export const dynamic = 'force-dynamic';

const blob = (key?: string | null) => (key ? `/api/blob?key=${encodeURIComponent(key)}` : null);

type Filter = 'open' | 'resolved' | 'all';

export default async function InvestigationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter: Filter = status === 'resolved' ? 'resolved' : status === 'all' ? 'all' : 'open';
  const where = filter === 'all' ? {} : { status: filter as InvestigationStatus };

  const [investigations, openCount, resolvedCount] = await Promise.all([
    prisma.investigation.findMany({
      where,
      orderBy: [{ status: 'asc' }, { flaggedAt: 'desc' }],
      include: {
        client: true,
        page: true,
        comparison: { include: { assessment: true } },
      },
    }),
    prisma.investigation.count({ where: { status: 'open' } }),
    prisma.investigation.count({ where: { status: 'resolved' } }),
  ]);

  const items: InvestigationItem[] = investigations.map((inv) => ({
    id: inv.id,
    status: inv.status,
    clientId: inv.clientId,
    clientName: inv.client.name,
    pageLabel: inv.page.label,
    pageUrl: inv.page.url,
    pageId: inv.pageId,
    viewport: inv.viewport,
    runId: inv.comparison.runId,
    notes: inv.notes,
    flaggedAt: inv.flaggedAt.toISOString(),
    diffPct: inv.comparison.changedPixelPct,
    diffUrl: blob(inv.comparison.diffImageKey),
    severity: inv.comparison.assessment?.severity ?? null,
    recommendation: inv.comparison.assessment?.recommendation ?? null,
    assessmentSummary: inv.comparison.assessment?.summary ?? null,
  }));

  const tabs: { id: Filter; label: string; count?: number }[] = [
    { id: 'open', label: 'Open', count: openCount },
    { id: 'resolved', label: 'Resolved', count: resolvedCount },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="max-w-[1100px] px-10 pb-16 pt-[34px]">
      <div className="dt-eyebrow mb-2">Cross-client queue</div>
      <h1 className="mb-5 text-[30px] font-bold tracking-tight text-ink-1">Investigations</h1>

      <div className="mb-5 flex rounded-[11px] border border-ink-7 bg-ink-9 p-[3px]">
        {tabs.map((t) => {
          const on = filter === t.id;
          return (
            <Link
              key={t.id}
              href={`/investigations${t.id === 'open' ? '' : `?status=${t.id}`}`}
              className="flex items-center gap-2 rounded-[9px] px-4 py-[7px] text-[13px] font-semibold"
              style={{ background: on ? 'var(--color-ink-1)' : 'transparent', color: on ? '#fff' : 'var(--color-ink-4)' }}
            >
              {t.label}
              {t.count !== undefined && (
                <span
                  className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-bold"
                  style={{ background: on ? 'rgba(255,255,255,.2)' : 'var(--color-ink-7)', color: on ? '#fff' : 'var(--color-ink-4)' }}
                >
                  {t.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="rounded-[14px] border border-ink-7 bg-ink-10 px-10 py-16 text-center text-sm text-ink-4">
          {filter === 'open' ? 'Nothing to investigate — all clear.' : 'No investigations here.'}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((it) => (
            <InvestigationCard key={it.id} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}
