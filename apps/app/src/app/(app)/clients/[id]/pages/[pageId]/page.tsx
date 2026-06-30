import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Pencil, EyeOff, Hourglass, BookmarkCheck } from 'lucide-react';
import { prisma } from '@vigil/db';
import { VIEWPORTS } from '@vigil/core';
import { DeleteButton } from '@/components/DeleteButton';
import { deletePage } from '@/lib/actions/pages';

export const dynamic = 'force-dynamic';

export default async function PageDetail({
  params,
}: {
  params: Promise<{ id: string; pageId: string }>;
}) {
  const { id, pageId } = await params;
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: {
      viewports: true,
      baselines: { include: { approvedBy: true } },
      client: true,
      captures: { orderBy: { capturedAt: 'desc' }, take: 8 },
    },
  });
  if (!page || page.clientId !== id) notFound();

  const vpLabels = page.viewports.map((v) => VIEWPORTS[v.kind].label).join(' & ') || '—';

  return (
    <div className="max-w-[1040px] px-10 pb-16 pt-6">
      <Link href={`/clients/${id}?tab=pages`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-4 hover:text-ink-1">
        <ChevronLeft size={15} /> {page.client.name}
      </Link>

      <div className="mb-6 flex items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[24px] font-bold tracking-tight text-ink-1">{page.label}</h1>
          <div className="mt-1 text-[13.5px] text-ink-4">{page.url} · {vpLabels}</div>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href={`/clients/${id}/pages/${pageId}/edit`} className="flex h-10 items-center gap-1.5 rounded-[10px] border border-ink-7 bg-ink-10 px-[15px] text-[13.5px] font-semibold text-ink-1">
            <Pencil size={15} /> Edit
          </Link>
          <DeleteButton action={deletePage.bind(null, id, pageId)} confirmMessage={`Delete page “${page.label}”?`} label="Delete" />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_320px] items-start gap-[18px]">
        {/* baseline */}
        <div className="rounded-[14px] border border-ink-7 bg-ink-10 p-[22px]">
          <div className="mb-4 flex items-center gap-2.5">
            <BookmarkCheck size={17} style={{ color: page.baselines.length ? '#1A8F5F' : 'var(--color-ink-5)' }} />
            <span className="text-[15px] font-semibold text-ink-1">Current baseline</span>
            {page.baselines[0]?.approvedAt && (
              <span className="ml-auto text-[12.5px] text-ink-5">
                Approved {page.baselines[0].approvedAt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                {page.baselines[0].approvedBy?.name ? ` · by ${page.baselines[0].approvedBy.name.split(' ')[0]}` : ''}
              </span>
            )}
          </div>
          {page.baselines.length === 0 ? (
            <div className="rounded-[8px] border border-dashed border-ink-6 bg-ink-9 px-6 py-10 text-center text-[13px] text-ink-5">
              No baseline yet. The first successful capture becomes the baseline.
            </div>
          ) : (
            <div className="flex gap-4">
              {page.viewports.map((v) => (
                <div key={v.kind} className={v.kind === 'desktop' ? 'flex-1' : 'w-24'}>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-5">{VIEWPORTS[v.kind].label}</div>
                  <div className="aspect-[16/11] rounded-[8px] border border-ink-7 bg-[repeating-linear-gradient(45deg,var(--color-ink-8),var(--color-ink-8)_7px,var(--color-ink-9)_7px,var(--color-ink-9)_14px)]" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* capture history */}
        <div className="rounded-[14px] border border-ink-7 bg-ink-10 p-5">
          <div className="mb-3 text-[13px] font-semibold text-ink-1">Capture history</div>
          {page.captures.length === 0 ? (
            <div className="text-[12.5px] text-ink-5">No captures yet.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {page.captures.map((c) => (
                <div key={c.id} className="text-[12.5px]">
                  <div className="font-semibold text-ink-1">
                    {c.capturedAt.toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-ink-5">
                    {c.viewport} · {c.status === 'captured' ? 'captured' : `failed (${c.failureReason ?? 'unknown'})`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* masks */}
        <div className="rounded-[14px] border border-ink-7 bg-ink-10 p-[22px]">
          <div className="mb-1.5 text-[15px] font-semibold text-ink-1">Ignore masks</div>
          <div className="mb-3.5 text-[13px] text-ink-5">Regions excluded from the visual diff — for content that legitimately changes.</div>
          {page.maskSelectors.length === 0 ? (
            <div className="text-[13px] text-ink-5">No masks. Add selectors when editing the page.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {page.maskSelectors.map((s) => (
                <div key={s} className="flex items-center gap-2.5 rounded-[9px] bg-ink-9 px-3 py-2.5">
                  <EyeOff size={15} className="text-ink-5" />
                  <code className="flex-1 font-mono text-[12.5px] text-ink-2">{s}</code>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* wait config */}
        <div className="rounded-[14px] border border-ink-7 bg-ink-10 p-5">
          <div className="mb-1.5 text-[13px] font-semibold text-ink-1">Wait before capture</div>
          <div className="mb-3 text-[12.5px] text-ink-5">Optionally wait for a selector before screenshotting.</div>
          {page.waitForSelector ? (
            <div className="flex items-center gap-2.5 rounded-[9px] border border-ink-7 px-3 py-2.5">
              <Hourglass size={14} className="text-ink-5" />
              <code className="font-mono text-[12.5px] text-ink-2">{page.waitForSelector}</code>
            </div>
          ) : (
            <div className="text-[13px] text-ink-5">None set.</div>
          )}
        </div>
      </div>
    </div>
  );
}
