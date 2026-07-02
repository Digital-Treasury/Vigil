'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookmarkCheck, ChevronLeft, EyeOff, Hourglass, RefreshCw } from 'lucide-react';
import { useApi, post } from '@/lib/useApi';
import { Spinner } from '@/components/ui';
import { diffColor, formatPct, formatWhen } from '@/lib/format';
import { STATUS_META } from '@/lib/types';

interface PageDetail {
  page: {
    id: number;
    label: string;
    url: string;
    viewports: string[];
    mask_selectors: string[];
    wait_selector: string | null;
    baselines: { viewport: string; screenshot: string | null; approved_by: string; approved_at: string }[];
  };
  client: { id: number; name: string; url: string };
  history: {
    id: number;
    run_id: number;
    viewport: string;
    status: string;
    review: string;
    diff_baseline_pct: number | null;
    run_started: string;
    trigger: string;
  }[];
}

export default function PageDetailScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, loading, refresh } = useApi<PageDetail>(`/api/pages/${id}`, 8000);

  if (loading && !data) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><Spinner /></div>;
  }
  if (!data) return <div style={{ padding: 40 }}>Page not found.</div>;
  const { page, client, history } = data;
  const desktopBaseline = page.baselines.find((b) => b.viewport === 'desktop');
  const mobileBaseline = page.baselines.find((b) => b.viewport === 'mobile');
  const anyBaseline = page.baselines[0];

  return (
    <div style={{ padding: '24px 40px 60px', maxWidth: 1040 }}>
      <Link href={`/clients/${client.id}`} className="vg-btn vg-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-4)', textDecoration: 'none', marginBottom: 16 }}>
        <ChevronLeft size={15} /> {client.name}
      </Link>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>{page.label}</h1>
          <div style={{ fontSize: 13.5, color: 'var(--ink-4)', marginTop: 3 }}>
            {page.url} · {page.viewports.map((v) => v[0].toUpperCase() + v.slice(1)).join(' & ')}
          </div>
        </div>
        <button
          className="vg-btn btn-secondary"
          onClick={async () => {
            await post(`/api/pages/${page.id}/rebaseline`);
            alert('Re-capture queued — the new capture will become the baseline in a minute or two.');
            refresh();
          }}
        >
          <RefreshCw size={15} /> Re-capture &amp; set baseline
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
              <BookmarkCheck size={17} color={anyBaseline ? 'var(--status-success)' : 'var(--ink-5)'} />
              <span style={{ fontSize: 15, fontWeight: 600 }}>Current baseline</span>
              {anyBaseline && (
                <span style={{ fontSize: 12.5, color: 'var(--ink-5)', marginLeft: 'auto' }}>
                  Approved {formatWhen(anyBaseline.approved_at)} · by {anyBaseline.approved_by}
                </span>
              )}
            </div>
            {!anyBaseline ? (
              <div style={{ padding: '26px 0', fontSize: 13.5, color: 'var(--ink-4)', textAlign: 'center' }}>
                No baseline yet — the first successful capture becomes the baseline automatically.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 16 }}>
                {page.viewports.includes('desktop') && (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.05em', color: 'var(--ink-5)', marginBottom: 7 }}>DESKTOP · 1440×full</div>
                    <BaselineShot src={desktopBaseline?.screenshot ?? null} ratio="16/11" />
                  </div>
                )}
                {page.viewports.includes('mobile') && (
                  <div style={{ width: 120 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.05em', color: 'var(--ink-5)', marginBottom: 7 }}>MOBILE</div>
                    <BaselineShot src={mobileBaseline?.screenshot ?? null} ratio="9/16" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Ignore masks</span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-5)' }}>edit from the client&apos;s Pages tab</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-5)', marginBottom: 14 }}>
              Regions excluded from the visual diff — for content that legitimately changes.
            </div>
            {page.mask_selectors.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-5)', padding: '4px 0' }}>No masks configured.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {page.mask_selectors.map((selector) => (
                  <div key={selector} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--ink-9)', borderRadius: 9 }}>
                    <EyeOff size={15} color="var(--ink-5)" />
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-2)', flex: 1 }}>{selector}</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 13 }}>Capture history</div>
            {history.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--ink-5)' }}>No captures yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {history.map((entry, i) => {
                  const meta = STATUS_META[entry.status] ?? STATUS_META.resolved;
                  return (
                    <div key={entry.id} style={{ display: 'flex', gap: 11 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ width: 9, height: 9, borderRadius: 999, background: meta.color, marginTop: 4 }} />
                        {i < history.length - 1 && <span style={{ width: 1, flex: 1, background: 'var(--ink-7)' }} />}
                      </div>
                      <div
                        style={{ paddingBottom: i < history.length - 1 ? 16 : 0, cursor: entry.status !== 'error' ? 'pointer' : 'default' }}
                        onClick={() => entry.status !== 'error' && router.push(`/review/${entry.id}`)}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {formatWhen(entry.run_started)} ·{' '}
                          <span style={{ color: diffColor(entry.diff_baseline_pct) }}>
                            {entry.status === 'error' ? 'failed' : formatPct(entry.diff_baseline_pct)}
                          </span>{' '}
                          <span style={{ fontSize: 11, color: 'var(--ink-5)', fontWeight: 500 }}>{entry.viewport}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-5)' }}>
                          {entry.trigger === 'maintenance' ? 'Maintenance run' : entry.trigger === 'scheduled' ? 'Scheduled' : 'Manual'} ·{' '}
                          {entry.status === 'error' ? 'capture failed' : entry.review === 'pending' ? 'awaiting review' : entry.review === 'accepted' ? 'accepted' : entry.review === 'flagged' ? 'flagged' : meta.label.toLowerCase()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Wait before capture</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-5)', marginBottom: 12 }}>
              Optionally wait for a selector before screenshotting.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 38, padding: '0 12px', border: '1px solid var(--ink-7)', borderRadius: 9 }}>
              <Hourglass size={14} color="var(--ink-5)" />
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: page.wait_selector ? 'var(--ink-2)' : 'var(--ink-5)' }}>
                {page.wait_selector || 'not set'}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BaselineShot({ src, ratio }: { src: string | null; ratio: string }) {
  return (
    <div
      style={{
        aspectRatio: ratio,
        borderRadius: 8,
        background: 'var(--ink-9)',
        border: '1px solid var(--ink-7)',
        overflow: 'hidden',
        backgroundImage: src ? undefined : 'repeating-linear-gradient(45deg, var(--ink-8), var(--ink-8) 7px, var(--ink-9) 7px, var(--ink-9) 14px)',
      }}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
      )}
    </div>
  );
}
