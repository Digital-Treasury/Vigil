import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Wrench, Clock, Hand, Unplug, Keyboard } from 'lucide-react';
import { prisma, type Comparison, type ViewportKind } from '@vigil/db';
import { VIEWPORTS, diffColor, formatDiffPct, type HealthStatus } from '@vigil/core';
import { StatusPill } from '@/components/Status';

export const dynamic = 'force-dynamic';

const BROKEN_PCT = 25;
const triggerMeta = {
  manual: { icon: Hand, label: 'Manual run' },
  scheduled: { icon: Clock, label: 'Scheduled run' },
  maintenance: { icon: Wrench, label: 'Maintenance run' },
} as const;

function blob(key: string | null | undefined) {
  return key ? `/api/blob?key=${encodeURIComponent(key)}` : null;
}

function unitStatus(primary: Comparison | undefined, failed: boolean): HealthStatus {
  if (failed) return 'error';
  if (!primary || !primary.flagged) return 'passed';
  if ((primary.changedPixelPct ?? 0) >= BROKEN_PCT) return 'broken';
  return 'changes';
}

export default async function RunReportPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: { client: true, checkpoint: true },
  });
  if (!run) notFound();

  const [captures, comparisons, baselines] = await Promise.all([
    prisma.capture.findMany({ where: { runId }, include: { page: true }, orderBy: { capturedAt: 'asc' } }),
    prisma.comparison.findMany({ where: { runId } }),
    prisma.baseline.findMany({ where: { page: { clientId: run.clientId } } }),
  ]);

  const key = (pageId: string, vp: ViewportKind) => `${pageId}_${vp}`;
  const baselineMap = new Map(baselines.map((b) => [key(b.pageId, b.viewport), b]));
  const compMap = new Map<string, Comparison[]>();
  for (const c of comparisons) {
    const k = key(c.pageId, c.viewport);
    compMap.set(k, [...(compMap.get(k) ?? []), c]);
  }

  const isMaintenance = !!run.checkpointId;
  const summary = (run.summary ?? {}) as { passed?: number; changes?: number; broken?: number; failed?: number };

  const rows = captures.map((cap) => {
    const k = key(cap.pageId, cap.viewport);
    const comps = compMap.get(k) ?? [];
    const baselineComp = comps.find((c) => c.kind === 'baseline_vs_capture');
    const checkpointComp = comps.find((c) => c.kind === 'checkpoint_vs_capture');
    const primary = checkpointComp ?? baselineComp;
    const failed = cap.status === 'failed';
    const status = unitStatus(primary, failed);
    return {
      cap,
      baseline: baselineMap.get(k),
      baselineComp,
      checkpointComp,
      primary,
      failed,
      status,
    };
  });

  const TriggerIcon = triggerMeta[run.trigger].icon;

  return (
    <div className="max-w-[1180px] px-10 pb-16 pt-6">
      <Link href={`/clients/${run.clientId}?tab=runs`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-4 hover:text-ink-1">
        <ChevronLeft size={15} /> {run.client.name}
      </Link>

      <div className="mb-4 flex items-start justify-between gap-6">
        <div>
          <div className="mb-1.5 flex items-center gap-2.5">
            <h1 className="m-0 text-[24px] font-bold tracking-tight text-ink-1">{run.client.name} — run report</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-7 bg-ink-8 px-2.5 py-1 text-[12px] font-semibold text-ink-3">
              <TriggerIcon size={13} /> {triggerMeta[run.trigger].label}
            </span>
          </div>
          <div className="text-[13.5px] text-ink-4">
            {(run.completedAt ?? run.createdAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
            {isMaintenance ? ' · compared against the active checkpoint and last approved baseline.' : ' · compared against the last approved baseline.'}
          </div>
        </div>
      </div>

      {/* tally */}
      <div className="mb-3.5 flex flex-wrap gap-2.5">
        <Tally color="#1A8F5F" label={`${summary.passed ?? 0} passed`} />
        {(summary.changes ?? 0) > 0 && <Tally color="#B47A12" bg="rgba(180,122,18,.08)" label={`${summary.changes} changes`} />}
        {(summary.broken ?? 0) > 0 && <Tally color="#C0322B" bg="rgba(192,50,43,.07)" label={`${summary.broken} broken`} />}
        {(summary.failed ?? 0) > 0 && <Tally color="#992822" bg="rgba(192,50,43,.07)" icon label={`${summary.failed} capture failed`} />}
        <div className="ml-auto flex items-center gap-1.5 text-[13px] text-ink-5">
          <Keyboard size={15} /> Press <kbd className="rounded border border-ink-6 bg-ink-8 px-1.5 font-mono text-[11px]">J</kbd>/<kbd className="rounded border border-ink-6 bg-ink-8 px-1.5 font-mono text-[11px]">K</kbd> to move between pages
        </div>
      </div>

      {run.status !== 'completed' && (
        <div className="mb-3 rounded-[10px] border border-[rgba(47,111,176,.25)] bg-[rgba(47,111,176,.08)] px-4 py-2.5 text-[13px] text-[#2F6FB0]">
          Run {run.status}… rows will fill in as captures complete.
        </div>
      )}

      <div className="overflow-hidden rounded-[14px] border border-ink-7 bg-ink-10">
        <div className="grid grid-cols-[1.7fr_168px_1.5fr_1.2fr_auto] gap-3.5 border-b border-ink-7 px-[22px] py-[11px] text-[11px] font-semibold uppercase tracking-wide text-ink-5">
          <span>Page</span><span>Before / After / Diff</span><span>Comparison</span><span>Status</span><span />
        </div>
        {rows.map((r) => (
          <div key={r.cap.id} className="grid grid-cols-[1.7fr_168px_1.5fr_1.2fr_auto] items-center gap-3.5 border-b border-ink-8 px-[22px] py-3.5 transition hover:bg-ink-9">
            <div>
              <div className="text-sm font-semibold text-ink-1">{r.cap.page.label}</div>
              <div className="text-[12px] text-ink-5">{VIEWPORTS[r.cap.viewport].label}</div>
            </div>
            <div className="flex gap-1">
              <Thumb src={blob(r.baseline?.screenshotKey)} />
              <Thumb src={blob(r.cap.screenshotKey)} />
              {r.failed ? (
                <div className="flex h-8 w-12 items-center justify-center rounded-[5px] border border-[rgba(192,50,43,.25)] bg-[rgba(192,50,43,.06)]">
                  <Unplug size={14} className="text-danger" />
                </div>
              ) : (
                <Thumb src={blob(r.primary?.diffImageKey)} />
              )}
            </div>
            <div className="flex flex-col gap-0.5 text-[12.5px]">
              {isMaintenance && (
                <span className="text-ink-4">
                  vs start{' '}
                  <strong style={{ color: diffColor(r.checkpointComp?.changedPixelPct) }}>
                    {formatDiffPct(r.checkpointComp?.changedPixelPct)}
                  </strong>
                </span>
              )}
              <span className="text-ink-4">
                vs baseline{' '}
                <strong style={{ color: diffColor(r.baselineComp?.changedPixelPct) }}>
                  {formatDiffPct(r.baselineComp?.changedPixelPct)}
                </strong>
              </span>
            </div>
            <div><StatusPill status={r.status} /></div>
            {r.failed ? (
              <span className="text-[13px] font-semibold text-danger">Re-run →</span>
            ) : (
              <Link href={`/runs/${runId}/review/${r.cap.pageId}/${r.cap.viewport}`} className="text-[13px] font-semibold text-ink-4 hover:text-ink-1">
                Review →
              </Link>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="px-[22px] py-12 text-center text-sm text-ink-4">No captures in this run.</div>
        )}
      </div>
    </div>
  );
}

function Tally({ color, bg, label, icon }: { color: string; bg?: string; label: string; icon?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[11px] border px-4 py-2.5" style={{ background: bg ?? 'var(--color-ink-10)', borderColor: bg ? color.replace(')', ',.25)').replace('rgb', 'rgba') : 'var(--color-ink-7)' }}>
      {icon ? <Unplug size={15} style={{ color }} /> : <span style={{ width: 9, height: 9, borderRadius: 999, background: color }} />}
      <span className="text-sm font-semibold" style={{ color: bg ? color : 'var(--color-ink-1)' }}>{label}</span>
    </div>
  );
}

function Thumb({ src }: { src: string | null }) {
  if (!src) {
    return <div className="h-8 w-12 rounded-[5px] border border-ink-7 bg-[repeating-linear-gradient(45deg,var(--color-ink-8),var(--color-ink-8)_5px,var(--color-ink-9)_5px,var(--color-ink-9)_10px)]" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-8 w-12 rounded-[5px] border border-ink-7 object-cover object-top" />;
}
