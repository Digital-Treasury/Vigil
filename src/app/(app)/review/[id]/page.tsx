'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Columns2, Layers, FlipHorizontal2, LayoutGrid, Monitor, Smartphone, Gauge,
  Sparkles, Flag, Check, EyeOff, RefreshCw, ArrowRight, ArrowUp, ArrowDown, Minus, AlertTriangle, Unplug,
} from 'lucide-react';
import { useApi, post, patch } from '@/lib/useApi';
import { Modal, SeverityBadge, Spinner } from '@/components/ui';
import { diffColor, formatPct, formatWhen } from '@/lib/format';
import type { ClaudeAssessment } from '@/lib/types';

interface Review {
  result: {
    id: number;
    viewport: string;
    status: string;
    review: string;
    reviewed_by: string | null;
    diff_baseline_pct: number | null;
    diff_checkpoint_pct: number | null;
    assessment: ClaudeAssessment | null;
  };
  run: { id: number; started_at: string; trigger: string };
  client: { id: number; name: string; url: string };
  page: { id: number; label: string; url: string };
  checkpoint: { started_at: string } | null;
  images: {
    capture: string | null;
    baseline: string | null;
    checkpoint: string | null;
    diffBaseline: string | null;
    diffCheckpoint: string | null;
  };
  captureError: string | null;
  captureSize: { width: number | null; height: number | null } | null;
  lighthouse: {
    current: Record<string, number | null> | null;
    baseline: Record<string, number | null> | null;
  };
  siblings: { id: number; status: string; review: string }[];
}

interface DiffLine { type: 'context' | 'add' | 'del' | 'hunk'; text: string }

type Mode = 'side' | 'overlay' | 'swipe' | '3up';

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, refresh } = useApi<Review>(`/api/results/${id}`);
  const [mode, setMode] = useState<Mode>('side');
  const [highlight, setHighlight] = useState(true);
  const [overlayPct, setOverlayPct] = useState(55);
  const [swipePct, setSwipePct] = useState(50);
  const [compare, setCompare] = useState<'checkpoint' | 'baseline' | null>(null);
  const [codeTab, setCodeTab] = useState<'html' | 'dom'>('html');
  const [assessing, setAssessing] = useState(false);
  const [assessError, setAssessError] = useState<string | null>(null);
  const [modal, setModal] = useState<'accept' | 'flag' | 'mask' | null>(null);
  const [note, setNote] = useState('');
  const [maskSelector, setMaskSelector] = useState('');

  const hasCheckpoint = !!data?.images.checkpoint;
  const activeCompare = compare ?? (hasCheckpoint ? 'checkpoint' : 'baseline');

  const { data: codeDiff } = useApi<{ html: DiffLine[]; dom: DiffLine[] }>(
    data ? `/api/results/${id}/codediff?against=${activeCompare}` : null
  );

  const goNext = useCallback(() => {
    if (!data) return;
    const pending = data.siblings.filter((s) => s.review === 'pending' && s.id !== data.result.id);
    if (pending.length) router.push(`/review/${pending[0].id}`);
    else router.push(`/runs/${data.run.id}`);
  }, [data, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (key === 'a' && data?.result.review === 'pending') setModal('accept');
      if (key === 'k' && data?.result.review === 'pending') setModal('flag');
      if (key === 'j') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data, goNext]);

  if (!data) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><Spinner /></div>;
  }
  const { result, run, client, page, images, lighthouse } = data;
  const before = activeCompare === 'checkpoint' ? images.checkpoint : images.baseline;
  const after = images.capture;
  const diffOverlay = activeCompare === 'checkpoint' ? images.diffCheckpoint : images.diffBaseline;
  const diffPct = activeCompare === 'checkpoint' ? result.diff_checkpoint_pct : result.diff_baseline_pct;
  const assessment = result.assessment;
  const ViewportIcon = result.viewport === 'mobile' ? Smartphone : Monitor;

  if (data.captureError) {
    return (
      <div style={{ padding: '24px 40px' }}>
        <Link href={`/runs/${run.id}`} className="vg-btn vg-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-4)', textDecoration: 'none', marginBottom: 24 }}>
          <ArrowLeft size={15} /> Run report
        </Link>
        <div className="card" style={{ maxWidth: 560, padding: 32, textAlign: 'center', margin: '60px auto' }}>
          <Unplug size={30} color="var(--status-danger)" style={{ display: 'inline-block' }} />
          <h2 style={{ fontSize: 19, fontWeight: 700, margin: '12px 0 6px' }}>Couldn&apos;t capture this page</h2>
          <p style={{ fontSize: 13.5, color: 'var(--ink-4)', margin: '0 0 8px', lineHeight: 1.6 }}>
            {page.label} · {result.viewport} — the capture failed, so there&apos;s nothing to compare and no baseline action is possible.
          </p>
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: '#992822', background: 'rgba(192,50,43,.07)', padding: '6px 12px', borderRadius: 8, display: 'inline-block', marginBottom: 18 }}>
            {data.captureError}
          </code>
          <div>
            <button
              className="vg-btn btn-primary"
              onClick={async () => {
                const { runId } = await post(`/api/clients/${client.id}/run`);
                router.push(`/runs/${runId}`);
              }}
            >
              <RefreshCw size={15} /> Re-run client
            </button>
          </div>
        </div>
      </div>
    );
  }

  const modes: { id: Mode; icon: typeof Columns2; label: string; show: boolean }[] = [
    { id: 'side', icon: Columns2, label: 'Side by side', show: true },
    { id: 'overlay', icon: Layers, label: 'Overlay', show: true },
    { id: 'swipe', icon: FlipHorizontal2, label: 'Swipe', show: true },
    { id: '3up', icon: LayoutGrid, label: '3-up', show: !!(images.baseline && images.checkpoint) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* context bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--ink-7)', padding: '13px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href={`/runs/${run.id}`} className="vg-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--ink-7)', background: 'var(--ink-10)', fontSize: 13, color: 'var(--ink-3)', padding: '7px 12px', borderRadius: 9, textDecoration: 'none' }}>
          <ArrowLeft size={15} /> Run report
        </Link>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{client.name}</span>
          <span style={{ color: 'var(--ink-6)' }}>/</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-2)' }}>{page.label}</span>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-4)', background: 'var(--ink-9)', padding: '4px 10px', borderRadius: 7 }}>
          <ViewportIcon size={13} /> {result.viewport[0].toUpperCase() + result.viewport.slice(1)}
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--ink-5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {page.url.replace(/^https?:\/\/[^/]+/, '') || '/'} · {formatWhen(run.started_at)}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--ink-5)', whiteSpace: 'nowrap' }}>
          <kbd className="vg-kbd">A</kbd> accept <kbd className="vg-kbd">K</kbd> keep <kbd className="vg-kbd">J</kbd> next
        </div>
      </div>

      {/* comparison switcher + diff % */}
      <div style={{ padding: '18px 28px 0', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {hasCheckpoint && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span className="dt-eyebrow">Comparing</span>
            <div style={{ display: 'flex', background: 'var(--ink-9)', border: '1px solid var(--ink-7)', borderRadius: 11, padding: 3 }}>
              {(
                [
                  ['checkpoint', 'Since you started work', 'Checkpoint → Capture'],
                  ['baseline', 'Since last approved', 'Baseline → Capture'],
                ] as const
              ).map(([key, label, sub]) => {
                const active = activeCompare === key;
                return (
                  <button
                    key={key}
                    className="vg-btn"
                    onClick={() => setCompare(key)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, border: 'none', textAlign: 'left', padding: '7px 14px', borderRadius: 9, background: active ? 'var(--ink-1)' : 'transparent', whiteSpace: 'nowrap' }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#fff' : 'var(--ink-3)' }}>{label}</span>
                    <span style={{ fontSize: 11, color: active ? 'rgba(255,255,255,.6)' : 'var(--ink-5)' }}>{sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginLeft: 'auto' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>Visual difference</span>
          <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', color: diffColor(diffPct), lineHeight: 1 }}>
            {formatPct(diffPct)}
          </span>
        </div>
      </div>

      {/* main grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 344px', gap: 18, padding: '16px 28px 110px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--ink-8)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {modes.filter((m) => m.show).map((m) => {
                  const Icon = m.icon;
                  const active = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      className="vg-btn"
                      onClick={() => setMode(m.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${active ? 'var(--ink-1)' : 'var(--ink-7)'}`, background: active ? 'var(--ink-1)' : 'var(--ink-10)', color: active ? '#fff' : 'var(--ink-3)', fontSize: 12.5, fontWeight: 600, padding: '7px 11px', borderRadius: 8 }}
                    >
                      <Icon size={14} /> {m.label}
                    </button>
                  );
                })}
              </div>
              <button
                className="vg-btn"
                onClick={() => setHighlight(!highlight)}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, border: `1px solid ${highlight ? 'var(--diff-highlight)' : 'var(--ink-7)'}`, background: highlight ? 'rgba(255,31,142,.10)' : 'var(--ink-10)', color: highlight ? '#C2156E' : 'var(--ink-4)', fontSize: 12.5, fontWeight: 600, padding: '7px 12px', borderRadius: 8 }}
              >
                <span style={{ width: 11, height: 11, borderRadius: 3, background: 'var(--diff-highlight)' }} />
                Diff highlight
              </button>
            </div>

            {mode === 'overlay' && (
              <SliderRow label="After opacity" value={overlayPct} onChange={setOverlayPct} />
            )}
            {mode === 'swipe' && (
              <SliderRow label="Divider" value={swipePct} onChange={setSwipePct} />
            )}

            <div style={{ padding: 18, background: 'var(--ink-9)' }}>
              <Viewer
                mode={mode}
                before={before}
                after={after}
                baseline={images.baseline}
                checkpoint={images.checkpoint}
                diffOverlay={highlight ? diffOverlay : null}
                overlayPct={overlayPct}
                swipePct={swipePct}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px', borderTop: '1px solid var(--ink-8)', fontSize: 12, color: 'var(--ink-5)' }}>
              <span>Scroll any pane — the others follow</span>
              <span style={{ marginLeft: 'auto' }}>
                Full-page{data.captureSize?.width ? ` · ${data.captureSize.width} × ${data.captureSize.height?.toLocaleString()}px` : ''} · scroll-synced
              </span>
            </div>
          </div>

          {/* code diff */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 14px 0', borderBottom: '1px solid var(--ink-8)' }}>
              {(
                [
                  ['html', 'Source HTML'],
                  ['dom', 'Rendered DOM'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  className="vg-btn"
                  onClick={() => setCodeTab(key)}
                  style={{ border: 'none', background: 'none', fontSize: 13, fontWeight: 600, color: codeTab === key ? 'var(--ink-1)' : 'var(--ink-5)', padding: '10px 12px', borderBottom: `2px solid ${codeTab === key ? 'var(--ink-1)' : 'transparent'}`, marginBottom: -1 }}
                >
                  {label}
                </button>
              ))}
              {codeTab === 'dom' && (
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ink-5)', background: 'var(--ink-9)', border: '1px solid var(--ink-7)', padding: '2px 8px', borderRadius: 999 }}>
                  normalised — volatile attrs stripped
                </span>
              )}
            </div>
            <div className="vg-scroll" style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.7, padding: '6px 0', maxHeight: 360, overflowY: 'auto' }}>
              {!codeDiff ? (
                <div style={{ padding: '14px 16px', color: 'var(--ink-5)' }}>Loading diff…</div>
              ) : (codeTab === 'html' ? codeDiff.html : codeDiff.dom).length === 0 ? (
                <div style={{ padding: '14px 16px', color: 'var(--ink-5)' }}>No {codeTab === 'html' ? 'source' : 'DOM'} differences.</div>
              ) : (
                (codeTab === 'html' ? codeDiff.html : codeDiff.dom).map((line, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '1px 16px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      background: line.type === 'add' ? 'rgba(26,143,95,.08)' : line.type === 'del' ? 'rgba(192,50,43,.08)' : undefined,
                      color: line.type === 'add' ? '#0F6B45' : line.type === 'del' ? '#992822' : line.type === 'hunk' ? 'var(--ink-5)' : 'var(--ink-4)',
                    }}
                  >
                    {line.type === 'add' ? '+ ' : line.type === 'del' ? '− ' : '  '}
                    {line.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Gauge size={16} color="var(--ink-3)" />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Lighthouse</span>
              <span style={{ fontSize: 12, color: 'var(--ink-5)', marginLeft: 'auto' }}>baseline → current</span>
            </div>
            {!lighthouse.current ? (
              <div style={{ fontSize: 12.5, color: 'var(--ink-5)' }}>Not captured on this run.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {(
                  [
                    ['performance', 'Performance'],
                    ['accessibility', 'Accessibility'],
                    ['bestPractices', 'Best practices'],
                    ['seo', 'SEO'],
                  ] as const
                ).map(([key, label]) => {
                  const current = lighthouse.current?.[key] ?? null;
                  const base = lighthouse.baseline?.[key] ?? null;
                  const delta = current != null && base != null ? current - base : null;
                  const DeltaIcon = delta == null || delta === 0 ? Minus : delta > 0 ? ArrowUp : ArrowDown;
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-3)' }}>{label}</span>
                      <span style={{ fontSize: 13, color: 'var(--ink-5)' }}>{base ?? '—'}</span>
                      <ArrowRight size={12} color="var(--ink-6)" />
                      <span style={{ fontSize: 14, fontWeight: 700, width: 26, textAlign: 'right' }}>{current ?? '—'}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 600, width: 38, justifyContent: 'flex-end', color: delta == null || delta === 0 ? 'var(--ink-5)' : delta > 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                        <DeltaIcon size={12} />
                        {delta == null || delta === 0 ? '—' : delta > 0 ? `+${delta}` : delta}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Claude assessment */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Sparkles size={16} color="var(--ink-2)" />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Claude assessment</span>
            </div>
            {assessing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '26px 0' }}>
                <Spinner />
                <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>Assessing the change…</span>
              </div>
            ) : !assessment ? (
              <>
                <p style={{ fontSize: 12.5, color: 'var(--ink-5)', margin: '6px 0 14px', lineHeight: 1.5 }}>
                  Send the before, after, diff overlay and code changes to Claude for a severity read and a recommendation. Manual — it uses the Anthropic API.
                </p>
                {assessError && <p style={{ fontSize: 12.5, color: 'var(--status-danger)', margin: '0 0 10px' }}>{assessError}</p>}
                <button
                  className="vg-btn"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, borderRadius: 10, border: '1px solid var(--ink-2)', background: 'var(--ink-1)', color: '#fff', fontSize: 13.5, fontWeight: 600 }}
                  onClick={async () => {
                    setAssessing(true);
                    setAssessError(null);
                    try {
                      await post(`/api/results/${result.id}/assess`);
                      await refresh();
                    } catch (err) {
                      setAssessError(err instanceof Error ? err.message : String(err));
                    } finally {
                      setAssessing(false);
                    }
                  }}
                >
                  <Sparkles size={16} /> Ask Claude
                </button>
              </>
            ) : (
              <>
                <div style={{ margin: '10px 0 12px' }}>
                  <SeverityBadge severity={assessment.severity} />
                </div>
                <p style={{ fontSize: 13.5, fontWeight: 600, margin: '0 0 6px', lineHeight: 1.45 }}>{assessment.summary}</p>
                <p style={{ fontSize: 12.5, color: 'var(--ink-4)', margin: '0 0 12px', lineHeight: 1.55 }}>{assessment.detail}</p>
                {assessment.affected_areas.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.05em', color: 'var(--ink-5)', marginBottom: 6 }}>AFFECTED AREAS</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                      {assessment.affected_areas.map((area) => (
                        <span key={area} style={{ fontSize: 12, color: 'var(--ink-3)', background: 'var(--ink-9)', padding: '3px 9px', borderRadius: 7 }}>{area}</span>
                      ))}
                    </div>
                  </>
                )}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', borderRadius: 10,
                    background: assessment.recommendation === 'accept' ? 'rgba(26,143,95,.06)' : 'rgba(192,50,43,.06)',
                    border: `1px solid ${assessment.recommendation === 'accept' ? 'rgba(26,143,95,.2)' : 'rgba(192,50,43,.2)'}`,
                  }}
                >
                  {assessment.recommendation === 'accept' ? <Check size={16} color="var(--status-success)" /> : <Flag size={16} color="var(--status-danger)" />}
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
                    <strong style={{ color: assessment.recommendation === 'accept' ? '#0F6B45' : '#992822' }}>
                      Recommended: {assessment.recommendation === 'accept' ? 'Accept' : 'Investigate'}
                    </strong>{' '}
                    — {assessment.reasoning}
                  </div>
                </div>
                <button
                  className="vg-btn vg-link"
                  style={{ marginTop: 10, border: 'none', background: 'none', fontSize: 12, color: 'var(--ink-5)', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}
                  onClick={async () => {
                    setAssessing(true);
                    setAssessError(null);
                    try {
                      await post(`/api/results/${result.id}/assess`);
                      await refresh();
                    } catch (err) {
                      setAssessError(err instanceof Error ? err.message : String(err));
                    } finally {
                      setAssessing(false);
                    }
                  }}
                >
                  <RefreshCw size={12} /> Re-assess
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* decision bar */}
      <div style={{ position: 'sticky', bottom: 0, zIndex: 5, background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--ink-7)', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {assessment && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 13px', borderRadius: 9, background: assessment.recommendation === 'accept' ? 'rgba(26,143,95,.08)' : 'rgba(192,50,43,.08)', color: assessment.recommendation === 'accept' ? '#0F6B45' : '#992822', fontSize: 13, fontWeight: 600 }}>
            {assessment.recommendation === 'accept' ? <Check size={15} /> : <Flag size={15} />}
            Recommended: {assessment.recommendation === 'accept' ? 'Accept' : 'Investigate'}
          </div>
        )}
        {result.review !== 'pending' && result.review !== 'none' && (
          <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>
            {result.review === 'accepted' ? '✓ Accepted as baseline' : '⚑ Kept old baseline & flagged'}
            {result.reviewed_by ? ` by ${result.reviewed_by}` : ''}
          </div>
        )}
        <button className="vg-btn btn-secondary" style={{ height: 42, color: 'var(--ink-3)' }} onClick={() => setModal('mask')}>
          <EyeOff size={16} /> Add region to ignore mask
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="vg-btn"
            disabled={result.status === 'error'}
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', borderRadius: 11, border: '1px solid var(--ink-2)', background: 'var(--ink-10)', color: 'var(--ink-1)', fontSize: 14, fontWeight: 600 }}
            onClick={() => setModal('flag')}
          >
            <Flag size={16} /> Keep old &amp; flag <kbd className="vg-kbd" style={{ marginLeft: 2 }}>K</kbd>
          </button>
          <button
            className="vg-btn"
            disabled={result.status === 'error'}
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', borderRadius: 11, border: 'none', background: 'var(--ink-0)', color: '#fff', fontSize: 14, fontWeight: 600 }}
            onClick={() => setModal('accept')}
          >
            <Check size={16} /> Accept new as baseline
            <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 4, padding: '1px 6px', marginLeft: 2 }}>A</kbd>
          </button>
        </div>
      </div>

      {/* modals */}
      {modal === 'accept' && (
        <Modal
          title="Overwrite the baseline?"
          width={600}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="vg-btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button
                className="vg-btn btn-primary"
                onClick={async () => {
                  await post(`/api/results/${result.id}/accept`);
                  setModal(null);
                  await refresh();
                  goNext();
                }}
              >
                Accept new baseline
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
            <AlertTriangle size={18} color="var(--status-warning)" />
            <span style={{ fontSize: 13.5, color: 'var(--ink-4)' }}>
              The current capture becomes the new accepted-good reference for{' '}
              <strong style={{ color: 'var(--ink-2)' }}>{page.label} · {result.viewport}</strong>. The old baseline will be replaced.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.05em', color: 'var(--ink-5)', marginBottom: 7 }}>CURRENT BASELINE</div>
              <ShotBox src={images.baseline} height={170} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--ink-5)' }}><ArrowRight size={20} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.05em', color: '#7A5208', marginBottom: 7 }}>NEW BASELINE</div>
              <ShotBox src={images.capture} height={170} />
            </div>
          </div>
        </Modal>
      )}

      {modal === 'flag' && (
        <Modal
          title="Flag for investigation"
          width={440}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="vg-btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button
                className="vg-btn btn-primary"
                onClick={async () => {
                  await post(`/api/results/${result.id}/flag`, { note });
                  setModal(null);
                  await refresh();
                  goNext();
                }}
              >
                Keep old &amp; flag
              </button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: '0 0 14px', lineHeight: 1.5 }}>
            The old baseline is kept. This page moves to the cross-client Investigations queue.
          </p>
          <label className="field-label">Note</label>
          <textarea
            className="input"
            style={{ height: 84, paddingTop: 10, resize: 'vertical' }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What looks wrong and who should check it…"
            autoFocus
          />
        </Modal>
      )}

      {modal === 'mask' && (
        <Modal
          title="Add region to ignore mask"
          width={440}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="vg-btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button
                className="vg-btn btn-primary"
                disabled={!maskSelector.trim()}
                onClick={async () => {
                  const detail = await fetch(`/api/pages/${page.id}`).then((r) => r.json());
                  const masks: string[] = detail.page.mask_selectors ?? [];
                  await patch(`/api/pages/${page.id}`, { mask_selectors: [...masks, maskSelector.trim()] });
                  setModal(null);
                  setMaskSelector('');
                }}
              >
                Add mask
              </button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Exclude a region from the visual diff on this page going forward. Useful for areas that legitimately change
            (carousels, feeds, dates). Takes effect from the next capture.
          </p>
          <label className="field-label">CSS selector</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <EyeOff size={15} color="var(--ink-5)" />
            <input
              className="input input-mono"
              value={maskSelector}
              onChange={(e) => setMaskSelector(e.target.value)}
              placeholder=".hero__headline"
              autoFocus
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--ink-8)', background: 'var(--ink-9)' }}>
      <span style={{ fontSize: 12, color: 'var(--ink-4)', minWidth: 84 }}>{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ flex: 1, accentColor: 'var(--ink-1)' }}
      />
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', width: 38, textAlign: 'right' }}>{value}%</span>
    </div>
  );
}

function ShotBox({ src, height }: { src: string | null; height: number }) {
  return (
    <div style={{ height, borderRadius: 8, border: '1px solid var(--ink-7)', background: 'var(--ink-9)', overflow: 'hidden' }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
      )}
    </div>
  );
}

// ---------- the multi-mode, scroll-synced viewer ----------

function Viewer({
  mode, before, after, baseline, checkpoint, diffOverlay, overlayPct, swipePct,
}: {
  mode: Mode;
  before: string | null;
  after: string | null;
  baseline: string | null;
  checkpoint: string | null;
  diffOverlay: string | null;
  overlayPct: number;
  swipePct: number;
}) {
  const panes = useRef<(HTMLDivElement | null)[]>([]);
  const syncing = useRef(false);

  const onScroll = (index: number) => {
    if (syncing.current) return;
    syncing.current = true;
    const source = panes.current[index];
    if (source) {
      const ratio = source.scrollTop / Math.max(1, source.scrollHeight - source.clientHeight);
      panes.current.forEach((pane, i) => {
        if (pane && i !== index) {
          pane.scrollTop = ratio * (pane.scrollHeight - pane.clientHeight);
        }
      });
    }
    requestAnimationFrame(() => { syncing.current = false; });
  };

  const pane = (index: number, src: string | null, label: string, overlay?: string | null, style?: React.CSSProperties) => (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.05em', color: 'var(--ink-5)', textTransform: 'uppercase' }}>{label}</div>
      <div
        ref={(el) => { panes.current[index] = el; }}
        onScroll={() => onScroll(index)}
        className="vg-scroll"
        style={{ height: 460, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--ink-7)', background: '#fff', position: 'relative' }}
      >
        {src ? (
          <div style={{ position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={label} style={{ width: '100%', display: 'block' }} />
            {overlay && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={overlay} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%' }} />
            )}
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, color: 'var(--ink-5)' }}>
            No capture
          </div>
        )}
      </div>
    </div>
  );

  if (mode === 'side') {
    return (
      <div style={{ display: 'flex', gap: 14 }}>
        {pane(0, before, 'Before')}
        {pane(1, after, 'After · capture', diffOverlay)}
      </div>
    );
  }

  if (mode === '3up') {
    return (
      <div style={{ display: 'flex', gap: 12 }}>
        {pane(0, baseline, 'Baseline')}
        {pane(1, checkpoint, 'Checkpoint')}
        {pane(2, after, 'Capture', diffOverlay)}
      </div>
    );
  }

  if (mode === 'overlay') {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div
          ref={(el) => { panes.current[0] = el; }}
          className="vg-scroll"
          style={{ height: 460, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--ink-7)', background: '#fff' }}
        >
          <div style={{ position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {before && <img src={before} alt="Before" style={{ width: '100%', display: 'block' }} />}
            {after && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={after} alt="After" style={{ position: 'absolute', top: 0, left: 0, width: '100%', opacity: overlayPct / 100 }} />
            )}
            {diffOverlay && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={diffOverlay} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%' }} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // swipe
  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div
        className="vg-scroll"
        style={{ height: 460, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--ink-7)', background: '#fff', position: 'relative' }}
      >
        <div style={{ position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {before && <img src={before} alt="Before" style={{ width: '100%', display: 'block' }} />}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, clipPath: `inset(0 ${100 - swipePct}% 0 0)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {after && <img src={after} alt="After" style={{ width: '100%', display: 'block' }} />}
            {diffOverlay && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={diffOverlay} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%' }} />
            )}
          </div>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${swipePct}%`, width: 2, background: 'var(--diff-highlight)', boxShadow: '0 0 0 1px rgba(255,255,255,.6)' }} />
        </div>
      </div>
    </div>
  );
}
