'use client';

import { useState, useRef, useTransition, useEffect, useCallback, forwardRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Columns2,
  Layers,
  FlipHorizontal2,
  LayoutGrid,
  Check,
  Flag,
  EyeOff,
  Sparkles,
  X,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
  Gauge,
  Loader2,
} from 'lucide-react';
import {
  VIEWPORTS,
  diffColor,
  formatDiffPct,
  LH_CATEGORIES,
  type ViewportKey,
  type LighthouseData,
} from '@vigil/core';

interface CompareBlock {
  pct: number | null;
  beforeUrl: string | null;
  afterUrl: string | null;
  diffUrl: string | null;
  htmlDiff: string;
  domDiff: string;
}
export interface DiffReviewData {
  runId: string;
  pageId: string;
  viewport: ViewportKey;
  clientName: string;
  pageLabel: string;
  pageUrl: string;
  capturedAt: string;
  isMaintenance: boolean;
  baseline: CompareBlock | null;
  checkpoint: CompareBlock | null;
  threeUp: { baselineUrl: string; checkpointUrl: string; captureUrl: string } | null;
  nextHref: string | null;
  lighthouse: { current: LighthouseData | null; baseline: LighthouseData | null };
}

type Mode = 'side' | 'overlay' | 'swipe' | '3up';

export function DiffReview({
  data,
  onAccept,
  onFlag,
  onAddMask,
}: {
  data: DiffReviewData;
  onAccept: () => Promise<void>;
  onFlag: (note?: string) => Promise<void>;
  onAddMask: (selector: string, runId?: string) => Promise<void>;
}) {
  const router = useRouter();
  const hasCheckpoint = !!data.checkpoint;
  const hasBaseline = !!data.baseline;
  const [compare, setCompare] = useState<'checkpoint' | 'baseline'>(
    data.isMaintenance && hasCheckpoint ? 'checkpoint' : 'baseline',
  );
  const active = (compare === 'checkpoint' ? data.checkpoint : data.baseline) ?? data.baseline ?? data.checkpoint;

  const [mode, setMode] = useState<Mode>('side');
  const [highlight, setHighlight] = useState(true);
  const [overlay, setOverlay] = useState(55);
  const [swipe, setSwipe] = useState(50);
  const [codeTab, setCodeTab] = useState<'html' | 'dom'>('html');
  const [modal, setModal] = useState<null | 'accept' | 'flag' | 'mask'>(null);
  const [pending, start] = useTransition();

  const afterOrDiff = (b: CompareBlock | null | undefined) =>
    highlight && b?.diffUrl ? b.diffUrl : b?.afterUrl;

  const doAccept = () => start(async () => { await onAccept(); router.push(`/runs/${data.runId}`); });
  const doFlag = (note?: string) => start(async () => { await onFlag(note); setModal(null); goNext(); });

  const goNext = useCallback(() => {
    if (data.nextHref) router.push(data.nextHref);
    else router.push(`/runs/${data.runId}`);
  }, [data.nextHref, data.runId, router]);

  // keyboard triage: A accept · K keep+flag · J next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modal || (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === 'a' || e.key === 'A') setModal('accept');
      else if (e.key === 'k' || e.key === 'K') setModal('flag');
      else if (e.key === 'j' || e.key === 'J') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, goNext]);

  const modes: { id: Mode; icon: typeof Columns2; label: string; show: boolean }[] = [
    { id: 'side', icon: Columns2, label: 'Side by side', show: true },
    { id: 'overlay', icon: Layers, label: 'Overlay', show: true },
    { id: 'swipe', icon: FlipHorizontal2, label: 'Swipe', show: true },
    { id: '3up', icon: LayoutGrid, label: '3-up', show: !!data.threeUp },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* context bar */}
      <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-ink-7 bg-[rgba(255,255,255,.9)] px-7 py-3 backdrop-blur">
        <button onClick={() => router.push(`/runs/${data.runId}`)} className="flex items-center gap-1.5 rounded-[9px] border border-ink-7 bg-ink-10 px-3 py-1.5 text-[13px] text-ink-3">
          <ArrowLeft size={15} /> Run report
        </button>
        <div className="flex items-baseline gap-2.5">
          <span className="text-[15px] font-bold text-ink-1">{data.clientName}</span>
          <span className="text-ink-6">/</span>
          <span className="text-[15px] font-semibold text-ink-2">{data.pageLabel}</span>
        </div>
        <span className="rounded-[7px] bg-ink-9 px-2.5 py-1 text-[12px] text-ink-4">{VIEWPORTS[data.viewport].label}</span>
        <span className="text-[12.5px] text-ink-5">{data.pageUrl}</span>
        <div className="ml-auto flex items-center gap-2 text-[12px] text-ink-5">
          <kbd className="rounded border border-ink-6 bg-ink-8 px-1.5 font-mono text-[11px]">A</kbd> accept
          <kbd className="rounded border border-ink-6 bg-ink-8 px-1.5 font-mono text-[11px]">K</kbd> keep
          <kbd className="rounded border border-ink-6 bg-ink-8 px-1.5 font-mono text-[11px]">J</kbd> next
        </div>
      </div>

      {/* comparison switcher + diff figure */}
      <div className="flex flex-wrap items-center gap-4 px-7 pt-[18px]">
        {hasCheckpoint && hasBaseline && (
          <div className="flex items-center gap-2.5">
            <span className="dt-eyebrow">Comparing</span>
            <div className="flex rounded-[11px] border border-ink-7 bg-ink-9 p-[3px]">
              {[
                { id: 'checkpoint' as const, label: 'Since you started work', sub: 'Checkpoint → Capture' },
                { id: 'baseline' as const, label: 'Since last approved', sub: 'Baseline → Capture' },
              ].map((cb) => {
                const on = compare === cb.id;
                return (
                  <button key={cb.id} onClick={() => setCompare(cb.id)} className="flex flex-col items-start gap-0.5 whitespace-nowrap rounded-[9px] px-3.5 py-[7px] text-left" style={{ background: on ? 'var(--color-ink-1)' : 'transparent' }}>
                    <span className="text-[13px] font-semibold" style={{ color: on ? '#fff' : 'var(--color-ink-3)' }}>{cb.label}</span>
                    <span className="text-[11px]" style={{ color: on ? 'rgba(255,255,255,.6)' : 'var(--color-ink-5)' }}>{cb.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="ml-auto flex items-baseline gap-2">
          <span className="text-[13px] text-ink-4">Visual difference</span>
          <span className="text-[30px] font-extrabold leading-none tracking-tight" style={{ color: diffColor(active?.pct) }}>
            {formatDiffPct(active?.pct)}
          </span>
        </div>
      </div>

      {/* main grid */}
      <div className="grid flex-1 grid-cols-[1fr_344px] items-start gap-[18px] px-7 pb-[110px] pt-4">
        <div className="flex min-w-0 flex-col gap-4">
          {/* viewer */}
          <div className="overflow-hidden rounded-[14px] border border-ink-7 bg-ink-10">
            <div className="flex flex-wrap items-center gap-2 border-b border-ink-8 p-3.5">
              <div className="flex gap-1">
                {modes.filter((m) => m.show).map((m) => {
                  const Icon = m.icon;
                  const on = mode === m.id;
                  return (
                    <button key={m.id} onClick={() => setMode(m.id)} className="flex items-center gap-1.5 rounded-lg border px-2.5 py-[7px] text-[12.5px] font-semibold" style={{ background: on ? 'var(--color-ink-1)' : 'var(--color-ink-10)', color: on ? '#fff' : 'var(--color-ink-3)', borderColor: on ? 'var(--color-ink-1)' : 'var(--color-ink-7)' }}>
                      <Icon size={14} />{m.label}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setHighlight((h) => !h)} className="ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-[7px] text-[12.5px] font-semibold" style={{ background: highlight ? 'rgba(255,31,142,.1)' : 'var(--color-ink-10)', borderColor: highlight ? '#FF1F8E' : 'var(--color-ink-7)', color: highlight ? '#C2156E' : 'var(--color-ink-4)' }}>
                <span className="h-2.5 w-2.5 rounded-[3px] bg-diff" /> Diff highlight
              </button>
            </div>

            {(mode === 'overlay' || mode === 'swipe') && (
              <div className="flex items-center gap-3 border-b border-ink-8 bg-ink-9 px-4 py-2.5">
                <span className="min-w-[84px] text-[12px] text-ink-4">{mode === 'overlay' ? 'After opacity' : 'Divider'}</span>
                <input type="range" min={0} max={100} value={mode === 'overlay' ? overlay : swipe} onChange={(e) => (mode === 'overlay' ? setOverlay(+e.target.value) : setSwipe(+e.target.value))} className="flex-1 accent-ink-1" />
                <span className="w-9 text-right text-[12px] font-semibold text-ink-2">{mode === 'overlay' ? overlay : swipe}%</span>
              </div>
            )}

            <Viewer mode={mode} active={active} highlight={highlight} overlay={overlay} swipe={swipe} threeUp={data.threeUp} afterOrDiff={afterOrDiff} />
          </div>

          {/* code diff */}
          <div className="overflow-hidden rounded-[14px] border border-ink-7 bg-ink-10">
            <div className="flex items-center gap-1 border-b border-ink-8 px-3.5 pt-1">
              {(['html', 'dom'] as const).map((t) => {
                const on = codeTab === t;
                return (
                  <button key={t} onClick={() => setCodeTab(t)} className="-mb-px border-b-2 px-3 py-2.5 text-[13px] font-semibold" style={{ color: on ? 'var(--color-ink-1)' : 'var(--color-ink-5)', borderColor: on ? 'var(--color-ink-1)' : 'transparent' }}>
                    {t === 'html' ? 'Source HTML' : 'Rendered DOM'}
                  </button>
                );
              })}
              {codeTab === 'dom' && (
                <span className="ml-2 rounded-full border border-ink-7 bg-ink-9 px-2 py-0.5 text-[11px] text-ink-5">normalised — volatile attrs stripped</span>
              )}
            </div>
            <CodeDiff text={codeTab === 'html' ? active?.htmlDiff ?? '' : active?.domDiff ?? ''} />
          </div>
        </div>

        {/* right rail: lighthouse (P5) + claude (P6) placeholders */}
        <div className="flex flex-col gap-4">
          <LighthousePanel current={data.lighthouse.current} baseline={data.lighthouse.baseline} />
          <div className="rounded-[14px] border border-ink-7 bg-ink-10 px-5 py-[18px]">
            <div className="mb-1 flex items-center gap-2"><Sparkles size={16} className="text-ink-2" /><span className="text-sm font-semibold text-ink-1">Claude assessment</span></div>
            <p className="my-2 text-[12.5px] leading-relaxed text-ink-5">Ask Claude for a severity read and recommendation. Manual — it uses the Anthropic API.</p>
            <button disabled className="flex h-[42px] w-full items-center justify-center gap-2 rounded-[10px] border border-ink-2 bg-ink-1 text-[13.5px] font-semibold text-white opacity-50">
              <Sparkles size={16} /> Ask Claude
            </button>
          </div>
        </div>
      </div>

      {/* decision bar */}
      <div className="sticky bottom-0 z-10 flex items-center gap-3 border-t border-ink-7 bg-[rgba(255,255,255,.94)] px-7 py-3.5 backdrop-blur">
        <button onClick={() => setModal('mask')} className="flex h-[42px] items-center gap-1.5 rounded-[10px] border border-ink-7 bg-ink-10 px-[15px] text-[13.5px] font-semibold text-ink-3">
          <EyeOff size={16} /> Add region to ignore mask
        </button>
        <div className="ml-auto flex items-center gap-2.5">
          <button onClick={() => setModal('flag')} className="flex h-11 items-center gap-2 rounded-[11px] border border-ink-2 bg-ink-10 px-[18px] text-sm font-semibold text-ink-1">
            <Flag size={16} /> Keep old &amp; flag <kbd className="ml-0.5 rounded border border-ink-6 bg-ink-8 px-1.5 font-mono text-[11px]">K</kbd>
          </button>
          <button onClick={() => setModal('accept')} className="flex h-11 items-center gap-2 rounded-[11px] bg-ink-0 px-[18px] text-sm font-semibold text-white">
            <Check size={16} /> Accept new as baseline <kbd className="ml-0.5 rounded border border-white/30 bg-white/20 px-1.5 font-mono text-[11px]">A</kbd>
          </button>
        </div>
      </div>

      {/* modals */}
      {modal === 'accept' && (
        <Modal title="Overwrite the baseline?" onClose={() => setModal(null)}>
          <p className="mb-4 text-[13.5px] leading-relaxed text-ink-4">The current capture becomes the new accepted-good reference for <strong className="text-ink-2">{data.pageLabel} · {VIEWPORTS[data.viewport].label}</strong>. The old baseline is replaced.</p>
          <div className="flex items-center gap-3.5">
            <Pane label="CURRENT BASELINE" url={active?.beforeUrl} />
            <ArrowRight size={20} className="text-ink-5" />
            <Pane label="NEW BASELINE" url={active?.afterUrl} accent />
          </div>
          <ModalActions onCancel={() => setModal(null)} pending={pending} confirmLabel="Accept new baseline" onConfirm={doAccept} />
        </Modal>
      )}
      {modal === 'flag' && (
        <FlagModal pending={pending} onClose={() => setModal(null)} onConfirm={doFlag} />
      )}
      {modal === 'mask' && (
        <MaskModal pending={pending} runId={data.runId} onClose={() => setModal(null)} onConfirm={(sel) => start(async () => { await onAddMask(sel, data.runId); setModal(null); router.refresh(); })} />
      )}
    </div>
  );
}

function Viewer({
  mode, active, highlight, overlay, swipe, threeUp, afterOrDiff,
}: {
  mode: Mode;
  active: CompareBlock | null | undefined;
  highlight: boolean;
  overlay: number;
  swipe: number;
  threeUp: DiffReviewData['threeUp'];
  afterOrDiff: (b: CompareBlock | null | undefined) => string | null | undefined;
}) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const sync = (from: HTMLDivElement | null, to: HTMLDivElement | null) => { if (from && to) to.scrollTop = from.scrollTop; };
  const after = afterOrDiff(active);

  if (!active) return <div className="p-10 text-center text-sm text-ink-5">No comparison available.</div>;

  return (
    <div className="bg-ink-9 p-4">
      {mode === 'side' && (
        <div className="flex h-[460px] gap-3.5">
          <Panel ref={leftRef} label="Before" url={active.beforeUrl} onScroll={() => sync(leftRef.current, rightRef.current)} />
          <Panel ref={rightRef} label={highlight ? 'After · diff' : 'After'} url={after} onScroll={() => sync(rightRef.current, leftRef.current)} />
        </div>
      )}
      {mode === 'overlay' && (
        <div className="relative mx-auto h-[460px] max-w-[640px] overflow-y-auto rounded-lg border border-ink-7 bg-white">
          {active.beforeUrl && <img src={active.beforeUrl} alt="before" className="absolute inset-x-0 top-0 w-full" />}
          {after && <img src={after} alt="after" className="absolute inset-x-0 top-0 w-full" style={{ opacity: overlay / 100 }} />}
        </div>
      )}
      {mode === 'swipe' && (
        <div className="relative mx-auto h-[460px] max-w-[640px] overflow-hidden rounded-lg border border-ink-7 bg-white">
          {active.beforeUrl && <img src={active.beforeUrl} alt="before" className="absolute inset-x-0 top-0 w-full" />}
          {after && <img src={after} alt="after" className="absolute inset-x-0 top-0 w-full" style={{ clipPath: `inset(0 0 0 ${swipe}%)` }} />}
          <div className="absolute bottom-0 top-0 w-0.5 bg-diff" style={{ left: `${swipe}%` }} />
        </div>
      )}
      {mode === '3up' && threeUp && (
        <div className="flex h-[440px] gap-3">
          <Panel label="Baseline" url={threeUp.baselineUrl} />
          <Panel label="Checkpoint" url={threeUp.checkpointUrl} />
          <Panel label="Capture" url={highlight && active.diffUrl ? active.diffUrl : threeUp.captureUrl} />
        </div>
      )}
    </div>
  );
}

const Panel = forwardRef<HTMLDivElement, { label: string; url?: string | null; onScroll?: () => void }>(
  function Panel({ label, url, onScroll }, ref) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-5">{label}</div>
        <div ref={ref} onScroll={onScroll} className="vg-scroll flex-1 overflow-y-auto rounded-lg border border-ink-7 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url ? <img src={url} alt={label} className="w-full" /> : <div className="p-8 text-center text-[12px] text-ink-5">—</div>}
        </div>
      </div>
    );
  },
);

function CodeDiff({ text }: { text: string }) {
  if (!text.trim()) return <div className="px-4 py-8 text-center text-[13px] text-ink-5">No differences.</div>;
  const lines = text.split('\n').slice(0, 600);
  return (
    <div className="vg-scroll max-h-[360px] overflow-auto py-1.5 font-mono text-[12.5px] leading-[1.7]">
      {lines.map((ln, i) => {
        const add = ln.startsWith('+') && !ln.startsWith('+++');
        const del = ln.startsWith('-') && !ln.startsWith('---');
        const hunk = ln.startsWith('@@');
        return (
          <div key={i} className="px-4" style={{ background: add ? 'rgba(26,143,95,.08)' : del ? 'rgba(192,50,43,.08)' : undefined, color: add ? '#0F6B45' : del ? '#992822' : hunk ? 'var(--color-ink-5)' : 'var(--color-ink-4)' }}>
            {ln || ' '}
          </div>
        );
      })}
    </div>
  );
}

function LighthousePanel({ current, baseline }: { current: LighthouseData | null; baseline: LighthouseData | null }) {
  return (
    <div className="rounded-[14px] border border-ink-7 bg-ink-10 px-5 py-[18px]">
      <div className="mb-3.5 flex items-center gap-2">
        <Gauge size={16} className="text-ink-3" />
        <span className="text-sm font-semibold text-ink-1">Lighthouse</span>
        <span className="ml-auto text-[12px] text-ink-5">baseline → current</span>
      </div>
      {!current ? (
        <p className="text-[12.5px] leading-relaxed text-ink-5">
          No Lighthouse result for this capture yet (it may still be running, or is disabled for this client).
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {LH_CATEGORIES.map(({ key, label }) => {
            const cur = current.scores[key];
            const base = baseline?.scores[key];
            const delta = base !== undefined ? cur - base : undefined;
            const Arrow = delta === undefined || delta === 0 ? Minus : delta > 0 ? ArrowUp : ArrowDown;
            const color = delta === undefined || delta === 0 ? 'var(--color-ink-5)' : delta > 0 ? '#1A8F5F' : '#C0322B';
            return (
              <div key={key} className="flex items-center gap-2.5">
                <span className="flex-1 text-[13px] text-ink-3">{label}</span>
                <span className="text-[13px] text-ink-5">{base ?? '—'}</span>
                <ArrowRight size={12} className="text-ink-6" />
                <span className="w-6 text-right text-sm font-bold text-ink-1">{cur}</span>
                <span className="flex w-10 items-center justify-end gap-0.5 text-[12px] font-semibold" style={{ color }}>
                  <Arrow size={12} />
                  {delta === undefined ? '—' : delta === 0 ? '0' : delta > 0 ? `+${delta}` : delta}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,10,10,.58)] p-6">
      <div onClick={(e) => e.stopPropagation()} className={`w-full ${wide ? 'max-w-[600px]' : 'max-w-[440px]'} overflow-hidden rounded-2xl bg-ink-10 shadow-[0_12px_40px_rgba(10,10,10,.1)]`}>
        <div className="flex items-center justify-between border-b border-ink-8 px-6 py-5">
          <h3 className="m-0 text-[17px] font-bold text-ink-1">{title}</h3>
          <button onClick={onClose} className="text-ink-5 hover:text-ink-2"><X size={18} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onCancel, onConfirm, confirmLabel, pending }: { onCancel: () => void; onConfirm: () => void; confirmLabel: string; pending: boolean }) {
  return (
    <div className="mt-5 flex justify-end gap-2.5">
      <button onClick={onCancel} className="h-10 rounded-[10px] border border-ink-7 bg-ink-10 px-4 text-[13.5px] font-semibold text-ink-1">Cancel</button>
      <button onClick={onConfirm} disabled={pending} className="flex h-10 items-center gap-2 rounded-[10px] bg-ink-0 px-[18px] text-[13.5px] font-semibold text-white disabled:opacity-60">
        {pending && <Loader2 size={14} className="animate-spin" />}{confirmLabel}
      </button>
    </div>
  );
}

function Pane({ label, url, accent }: { label: string; url?: string | null; accent?: boolean }) {
  return (
    <div className="flex-1">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: accent ? '#7A5208' : 'var(--color-ink-5)' }}>{label}</div>
      <div className="h-[150px] overflow-hidden rounded-lg border border-ink-7 bg-white">
        {url ? <img src={url} alt={label} className="w-full object-top" /> : <div className="p-8 text-center text-[12px] text-ink-5">—</div>}
      </div>
    </div>
  );
}

function FlagModal({ onClose, onConfirm, pending }: { onClose: () => void; onConfirm: (note?: string) => void; pending: boolean }) {
  const [note, setNote] = useState('');
  return (
    <Modal title="Flag for investigation" onClose={onClose}>
      <p className="mb-3.5 text-[13px] leading-relaxed text-ink-4">The old baseline is kept. This page moves to the cross-client Investigations queue.</p>
      <div className="mb-1.5 text-[12px] font-semibold text-ink-4">NOTE</div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full rounded-[10px] border border-ink-7 bg-ink-10 px-3 py-2.5 text-[13px] text-ink-2 outline-none focus:border-ink-3" placeholder="What looks wrong, and what should a dev check?" />
      <ModalActions onCancel={onClose} pending={pending} confirmLabel="Keep old & flag" onConfirm={() => onConfirm(note)} />
    </Modal>
  );
}

function MaskModal({ onClose, onConfirm, pending }: { onClose: () => void; onConfirm: (sel: string) => void; runId: string; pending: boolean }) {
  const [sel, setSel] = useState('');
  return (
    <Modal title="Add region to ignore mask" onClose={onClose}>
      <p className="mb-3.5 text-[13px] leading-relaxed text-ink-4">Exclude a region from the visual diff on this page going forward. Useful for areas that legitimately change.</p>
      <div className="mb-1.5 text-[12px] font-semibold text-ink-4">CSS SELECTOR</div>
      <input value={sel} onChange={(e) => setSel(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-ink-7 bg-ink-10 px-3.5 font-mono text-[13px] text-ink-2 outline-none focus:border-ink-3" placeholder=".testimonials-carousel" />
      <ModalActions onCancel={onClose} pending={pending} confirmLabel="Add mask" onConfirm={() => sel.trim() && onConfirm(sel.trim())} />
    </Modal>
  );
}
