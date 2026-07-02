'use client';

import { use, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Keyboard, Unplug, Wrench, Clock, Hand } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { Spinner, StatusPill, Thumb } from '@/components/ui';
import { diffColor, formatPct, formatWhen } from '@/lib/format';

interface RunReport {
  run: {
    id: number;
    client_id: number;
    trigger: string;
    status: string;
    started_at: string;
    checkpoint: { started_at: string } | null;
  };
  client: { id: number; name: string; url: string };
  tally: { total: number; passed: number; changes: number; broken: number; errors: number; running: number };
  results: {
    id: number;
    label: string;
    viewport: string;
    status: string;
    review: string;
    diff_baseline_pct: number | null;
    diff_checkpoint_pct: number | null;
    error: string | null;
    thumbs: { before: string | null; after: string | null; diff: string | null };
    lighthouse: { performance: number | null; accessibility: number | null; bestPractices: number | null; seo: number | null } | null;
    baselineLighthouse: { performance: number | null } | null;
  }[];
}

export default function RunReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, loading } = useApi<RunReport>(`/api/runs/${id}`, 3000);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!data || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'j') {
        const next = data.results.find((r) => r.review === 'pending');
        if (next) router.push(`/review/${next.id}`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data, router]);

  if (loading && !data) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><Spinner /></div>;
  }
  if (!data) return <div style={{ padding: 40 }}>Run not found.</div>;
  const { run, client, tally, results } = data;
  const isMaintenance = run.trigger === 'maintenance';
  const TriggerIcon = isMaintenance ? Wrench : run.trigger === 'scheduled' ? Clock : Hand;

  return (
    <div style={{ padding: '24px 40px 60px', maxWidth: 1180 }}>
      <Link href={`/clients/${client.id}`} className="vg-btn vg-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-4)', textDecoration: 'none', marginBottom: 16 }}>
        <ChevronLeft size={15} /> {client.name}
      </Link>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>{client.name} — run report</h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', background: 'var(--ink-8)', border: '1px solid var(--ink-7)', padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>
              <TriggerIcon size={13} /> {isMaintenance ? 'Maintenance run' : run.trigger === 'scheduled' ? 'Scheduled run' : 'Manual run'}
            </span>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-4)' }}>
            {formatWhen(run.started_at)} AEST ·{' '}
            {run.checkpoint ? (
              <>compared against checkpoint started <strong style={{ color: 'var(--ink-2)' }}>{formatWhen(run.checkpoint.started_at)}</strong> and last approved baseline.</>
            ) : (
              <>compared against the last approved baseline.</>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <Tally dot="var(--status-success)" label={`${tally.passed} passed`} />
        {tally.changes > 0 && (
          <Tally dot="var(--status-warning)" label={`${tally.changes} change${tally.changes === 1 ? '' : 's'}`} bg="rgba(180,122,18,.08)" border="rgba(180,122,18,.25)" color="#7A5208" />
        )}
        {tally.broken > 0 && (
          <Tally dot="var(--status-danger)" label={`${tally.broken} likely regression${tally.broken === 1 ? '' : 's'}`} bg="rgba(192,50,43,.07)" border="rgba(192,50,43,.22)" color="#992822" />
        )}
        {tally.errors > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 16px', background: 'rgba(192,50,43,.07)', border: '1px solid rgba(192,50,43,.22)', borderRadius: 11 }}>
            <Unplug size={15} color="var(--status-danger)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#992822' }}>{tally.errors} capture{tally.errors === 1 ? '' : 's'} failed</span>
          </div>
        )}
        {tally.running > 0 && (
          <Tally dot="var(--status-info)" label={`${tally.running} capturing…`} pulse />
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--ink-5)' }}>
          <Keyboard size={15} /> Press <kbd className="vg-kbd">J</kbd> to jump to the next unreviewed page
        </div>
      </div>

      {run.status === 'complete' && tally.changes === 0 && tally.broken === 0 && tally.errors === 0 && (
        <div className="card" style={{ marginTop: 14, padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--status-success)' }}>
            {tally.passed} of {tally.total} passed
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-4)', marginTop: 4 }}>Nothing needs your attention on this run.</div>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden', marginTop: 14 }}>
        <div className="table-head" style={{ gridTemplateColumns: '1.7fr 168px 1.5fr 1.2fr 1fr auto', gap: 14 }}>
          <span>Page</span><span>Before / After / Diff</span><span>Comparison</span><span>Status</span><span>Lighthouse</span><span />
        </div>
        {results.map((result) => {
          const isError = result.status === 'error';
          const lh = result.lighthouse;
          const lhBase = result.baselineLighthouse;
          const perfDelta = lh?.performance != null && lhBase?.performance != null ? lh.performance - lhBase.performance : null;
          return (
            <div
              key={result.id}
              className="table-row vg-row-hover"
              style={{ gridTemplateColumns: '1.7fr 168px 1.5fr 1.2fr 1fr auto', gap: 14, cursor: isError ? 'default' : 'pointer' }}
              onClick={() => !isError && router.push(`/review/${result.id}`)}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{result.label}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-5)' }}>{result.viewport[0].toUpperCase() + result.viewport.slice(1)}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <Thumb src={result.thumbs.before} />
                <Thumb src={result.thumbs.after} />
                {isError ? (
                  <div style={{ width: 48, height: 32, borderRadius: 5, background: 'rgba(192,50,43,.06)', border: '1px solid rgba(192,50,43,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Unplug size={14} color="var(--status-danger)" />
                  </div>
                ) : (
                  <Thumb src={result.thumbs.after} overlaySrc={result.thumbs.diff} />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12.5 }}>
                {result.diff_checkpoint_pct != null && (
                  <span style={{ color: 'var(--ink-4)' }}>
                    vs start <strong style={{ color: diffColor(result.diff_checkpoint_pct), fontWeight: 700 }}>{formatPct(result.diff_checkpoint_pct)}</strong>
                  </span>
                )}
                <span style={{ color: 'var(--ink-4)' }}>
                  vs baseline <strong style={{ color: isError ? 'var(--status-danger)' : diffColor(result.diff_baseline_pct), fontWeight: 700 }}>{isError ? '—' : formatPct(result.diff_baseline_pct)}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <StatusPill status={result.status} small />
                {result.review === 'accepted' && <span style={{ fontSize: 11, color: 'var(--ink-5)' }}>accepted</span>}
                {result.review === 'flagged' && <span style={{ fontSize: 11, color: 'var(--status-danger)' }}>flagged</span>}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: perfDelta != null && perfDelta < 0 ? 'var(--status-danger)' : 'var(--ink-5)' }}>
                {isError ? '—' : lh?.performance != null ? (lhBase?.performance != null && lhBase.performance !== lh.performance ? `Perf ${lhBase.performance}→${lh.performance}` : perfDelta === 0 ? 'No change' : `Perf ${lh.performance}`) : '—'}
              </div>
              {isError ? (
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--status-danger)', whiteSpace: 'nowrap' }} title={result.error ?? ''}>
                  {shortError(result.error)}
                </span>
              ) : (
                <span className="vg-link" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-4)' }}>Review →</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tally({ dot, label, bg, border, color, pulse }: { dot: string; label: string; bg?: string; border?: string; color?: string; pulse?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 16px', background: bg ?? 'var(--ink-10)', border: `1px solid ${border ?? 'var(--ink-7)'}`, borderRadius: 11 }}>
      <span style={{ width: 9, height: 9, borderRadius: 999, background: dot, animation: pulse ? 'vg-pulse 1s var(--ease-in-out) infinite' : undefined }} />
      <span style={{ fontSize: 14, fontWeight: 600, color: color ?? 'var(--ink-1)' }}>{label}</span>
    </div>
  );
}

function shortError(error: string | null): string {
  if (!error) return 'Failed';
  if (/HTTP (\d+)/.test(error)) return error.match(/HTTP \d+/)![0];
  if (/timeout/i.test(error)) return 'Timed out';
  return 'Failed';
}
