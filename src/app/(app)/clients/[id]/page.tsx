'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, ExternalLink, Flag, Play, Plus, Upload, Clock, Hand, Wrench,
  CalendarCheck, FileUp, Check, AlertCircle, Info, Trash2, Download,
} from 'lucide-react';
import { downloadCsv } from '@/lib/download';
import { PAGE_TEMPLATE } from '@/lib/importParse';
import { useApi, post, patch, del } from '@/lib/useApi';
import { Avatar, Modal, Spinner, StatusPill, Toggle, Thumb } from '@/components/ui';
import { diffColor, formatPct, formatWhen } from '@/lib/format';

interface PageRow {
  id: number;
  label: string;
  url: string;
  viewports: string[];
  mask_selectors: string[];
  wait_selector: string | null;
  baselines: { viewport: string; screenshot: string | null }[];
  lastResult: { id: number; status: string; diff_baseline_pct: number | null } | null;
}

interface RunRow {
  id: number;
  trigger: string;
  status: string;
  started_at: string;
  tally: { total: number; passed: number; changes: number; broken: number; errors: number; running: number };
}

interface ClientDetail {
  client: {
    id: number;
    name: string;
    url: string;
    notify_emails: string[];
    threshold_override: number | null;
    retention_override: number | null;
    lighthouse_enabled: boolean;
    schedule: { enabled: boolean; freq: 'daily' | 'weekly'; day: number; time: string };
    checkpoint: { id: number; started_at: string; started_by: string } | null;
  };
  pages: PageRow[];
  runs: RunRow[];
  nextRun: string | null;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, loading, refresh } = useApi<ClientDetail>(`/api/clients/${id}`, 8000);
  const [tab, setTab] = useState<'pages' | 'runs' | 'schedule' | 'settings'>('pages');
  const [modal, setModal] = useState<'addPage' | 'csv' | null>(null);
  const [editPage, setEditPage] = useState<PageRow | null>(null);

  if (loading && !data) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><Spinner /></div>;
  }
  if (!data) return <div style={{ padding: 40 }}>Client not found.</div>;
  const { client, pages, runs } = data;

  const tabs = [
    ['pages', 'Pages'], ['runs', 'Runs'], ['schedule', 'Schedule'], ['settings', 'Settings'],
  ] as const;

  return (
    <div style={{ padding: '24px 40px 60px', maxWidth: 1180 }}>
      <Link href="/" className="vg-btn vg-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-4)', textDecoration: 'none', marginBottom: 18 }}>
        <ChevronLeft size={15} /> Dashboard
      </Link>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar name={client.name} size={54} radius={13} />
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>{client.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <a href={client.url} target="_blank" rel="noreferrer" className="vg-link" style={{ fontSize: 13.5, color: 'var(--ink-4)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {client.url.replace(/^https?:\/\//, '')} <ExternalLink size={12} />
              </a>
              <span style={{ color: 'var(--ink-6)' }}>·</span>
              <span style={{ fontSize: 13.5, color: 'var(--ink-4)' }}>{pages.length} valuable page{pages.length === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="vg-btn btn-secondary"
            onClick={async () => {
              await post(`/api/clients/${client.id}/checkpoint`, { action: client.checkpoint ? 'end' : 'start' });
              refresh();
            }}
          >
            <Flag size={16} /> {client.checkpoint ? 'End checkpoint' : 'Start checkpoint'}
          </button>
          <button
            className="vg-btn btn-primary"
            disabled={pages.length === 0}
            onClick={async () => {
              const { runId } = await post(`/api/clients/${client.id}/run`);
              router.push(`/runs/${runId}`);
            }}
          >
            <Play size={16} /> Run now
          </button>
        </div>
      </div>

      {client.checkpoint && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, padding: '13px 18px', borderRadius: 11, background: 'rgba(180,122,18,.10)', border: '1px solid rgba(180,122,18,.30)' }}>
          <Flag size={18} color="#B47A12" />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#7A5208' }}>Maintenance checkpoint active</span>
            <span style={{ fontSize: 13, color: '#8A6614' }}>
              {' '}— started {formatWhen(client.checkpoint.started_at)} by {client.checkpoint.started_by}. Captures will compare against this &quot;before&quot; snapshot.
            </span>
          </div>
          <button
            className="vg-btn"
            style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(180,122,18,.4)', background: 'transparent', color: '#7A5208', fontSize: 12.5, fontWeight: 600 }}
            onClick={async () => {
              await post(`/api/clients/${client.id}/checkpoint`, { action: 'end' });
              refresh();
            }}
          >
            End checkpoint
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, margin: '24px 0 0', borderBottom: '1px solid var(--ink-7)' }}>
        {tabs.map(([key, label]) => (
          <button
            key={key}
            className="vg-btn"
            onClick={() => setTab(key)}
            style={{
              border: 'none', background: 'none', fontSize: 14,
              fontWeight: tab === key ? 600 : 500,
              color: tab === key ? 'var(--ink-1)' : 'var(--ink-4)',
              padding: '10px 14px',
              borderBottom: `2px solid ${tab === key ? 'var(--ink-1)' : 'transparent'}`,
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'pages' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 0 12px' }}>
            <span style={{ fontSize: 13, color: 'var(--ink-5)' }}>
              {pages.length ? `${pages.length} page${pages.length === 1 ? '' : 's'} captured each run` : 'No pages yet'}
            </span>
            <div style={{ display: 'flex', gap: 9 }}>
              <button className="vg-btn btn-secondary" style={{ height: 36, fontSize: 13 }} onClick={() => setModal('csv')}>
                <Upload size={15} /> Import CSV
              </button>
              <button className="vg-btn btn-primary" style={{ height: 36, fontSize: 13 }} onClick={() => setModal('addPage')}>
                <Plus size={15} /> Add page
              </button>
            </div>
          </div>
          {pages.length === 0 ? (
            <div className="card" style={{ padding: '54px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Mark the pages that matter</div>
              <p style={{ fontSize: 13.5, color: 'var(--ink-4)', margin: '0 0 18px', lineHeight: 1.6 }}>
                Add each valuable page by hand, or import a CSV (<code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>label,url,viewports?</code>).
                <br />
                The first successful capture of each page becomes its baseline automatically.
              </p>
              <div style={{ display: 'flex', gap: 9, justifyContent: 'center' }}>
                <button className="vg-btn btn-secondary" onClick={() => setModal('csv')}><Upload size={15} /> Import CSV</button>
                <button className="vg-btn btn-primary" onClick={() => setModal('addPage')}><Plus size={15} /> Add page</button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="table-head" style={{ gridTemplateColumns: '64px 2.2fr 1.3fr 1.4fr auto' }}>
                <span>Baseline</span><span>Page</span><span>Viewports</span><span>Last result</span><span />
              </div>
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="table-row vg-row-hover"
                  style={{ gridTemplateColumns: '64px 2.2fr 1.3fr 1.4fr auto', cursor: 'pointer', padding: '13px 22px' }}
                  onClick={() => router.push(`/pages/${page.id}`)}
                >
                  <Thumb src={page.baselines[0]?.screenshot ?? null} width={48} height={34} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{page.label}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{page.url.replace(/^https?:\/\/[^/]+/, '') || '/'}</div>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>
                    {page.viewports.map((v) => v[0].toUpperCase() + v.slice(1)).join(' · ')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    {page.lastResult ? (
                      <>
                        <StatusPill status={page.lastResult.status} small />
                        <span style={{ fontSize: 13, fontWeight: 700, color: diffColor(page.lastResult.diff_baseline_pct) }}>
                          {formatPct(page.lastResult.diff_baseline_pct)}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 12.5, color: 'var(--ink-5)' }}>
                        {page.baselines.length ? 'Baseline set' : 'Not yet captured'}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      className="vg-btn vg-link"
                      style={{ border: 'none', background: 'none', fontSize: 12.5, color: 'var(--ink-5)', padding: 0 }}
                      onClick={(e) => { e.stopPropagation(); setEditPage(page); }}
                    >
                      Edit
                    </button>
                    <ChevronRight size={17} color="var(--ink-5)" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'runs' && (
        <div className="card" style={{ overflow: 'hidden', marginTop: 22 }}>
          {runs.length === 0 ? (
            <div style={{ padding: '44px 24px', textAlign: 'center', fontSize: 13.5, color: 'var(--ink-4)' }}>
              No runs yet — hit <strong>Run now</strong> to capture every page.
            </div>
          ) : (
            <>
              <div className="table-head" style={{ gridTemplateColumns: '1.4fr 1.4fr 1.6fr auto' }}>
                <span>When</span><span>Trigger</span><span>Result</span><span />
              </div>
              {runs.map((run) => {
                const TriggerIcon = run.trigger === 'scheduled' ? Clock : run.trigger === 'maintenance' ? Wrench : Hand;
                const status = run.status === 'running' ? 'running' : run.tally.broken || run.tally.errors ? 'broken' : run.tally.changes ? 'changes' : 'passed';
                return (
                  <div
                    key={run.id}
                    className="table-row vg-row-hover"
                    style={{ gridTemplateColumns: '1.4fr 1.4fr 1.6fr auto', cursor: 'pointer' }}
                    onClick={() => router.push(`/runs/${run.id}`)}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{formatWhen(run.started_at)}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--ink-4)' }}>
                      <TriggerIcon size={14} />
                      {run.trigger === 'maintenance' ? 'Maintenance run' : run.trigger === 'scheduled' ? 'Scheduled' : 'Manual'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)' }}>
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: { running: 'var(--status-info)', broken: 'var(--status-danger)', changes: 'var(--status-warning)', passed: 'var(--status-success)' }[status] }} />
                      {run.status === 'running'
                        ? `Capturing ${run.tally.total - run.tally.running} of ${run.tally.total}…`
                        : [run.tally.broken && `${run.tally.broken} broken`, run.tally.errors && `${run.tally.errors} failed`, run.tally.changes && `${run.tally.changes} change${run.tally.changes === 1 ? '' : 's'}`, `${run.tally.passed} passed`].filter(Boolean).join(' · ')}
                    </span>
                    <span className="vg-link" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-4)' }}>View report →</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {tab === 'schedule' && <ScheduleTab client={client} nextRun={data.nextRun} refresh={refresh} />}
      {tab === 'settings' && <SettingsTab client={client} refresh={refresh} onDeleted={() => router.push('/')} />}

      {modal === 'addPage' && (
        <PageModal
          clientId={client.id}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refresh(); }}
        />
      )}
      {editPage && (
        <PageModal
          clientId={client.id}
          page={editPage}
          onClose={() => setEditPage(null)}
          onSaved={() => { setEditPage(null); refresh(); }}
        />
      )}
      {modal === 'csv' && (
        <CsvModal clientId={client.id} onClose={() => setModal(null)} onImported={() => { setModal(null); refresh(); }} />
      )}
    </div>
  );
}

// ---------- Schedule tab ----------

function ScheduleTab({
  client, nextRun, refresh,
}: {
  client: ClientDetail['client'];
  nextRun: string | null;
  refresh: () => void;
}) {
  const [schedule, setSchedule] = useState(client.schedule);
  const save = async (next: typeof schedule) => {
    setSchedule(next);
    await patch(`/api/clients/${client.id}`, { schedule: next });
    refresh();
  };

  return (
    <div className="card" style={{ maxWidth: 560, marginTop: 22, padding: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 18, borderBottom: '1px solid var(--ink-8)' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Scheduled runs</div>
          <div style={{ fontSize: 13, color: 'var(--ink-5)', marginTop: 2 }}>Capture automatically on a cadence.</div>
        </div>
        <Toggle on={schedule.enabled} onChange={(on) => save({ ...schedule, enabled: on })} />
      </div>
      {schedule.enabled && (
        <div style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div className="field-label">Frequency</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['daily', 'weekly'] as const).map((freq) => (
                <button
                  key={freq}
                  className="vg-btn"
                  onClick={() => save({ ...schedule, freq })}
                  style={{
                    padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                    background: schedule.freq === freq ? 'var(--ink-1)' : 'var(--ink-10)',
                    border: schedule.freq === freq ? 'none' : '1px solid var(--ink-7)',
                    color: schedule.freq === freq ? '#fff' : 'var(--ink-4)',
                  }}
                >
                  {freq[0].toUpperCase() + freq.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {schedule.freq === 'weekly' && (
            <div>
              <div className="field-label">Day</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {DAYS.map((day, i) => (
                  <button
                    key={day}
                    className="vg-btn"
                    onClick={() => save({ ...schedule, day: i })}
                    style={{
                      width: 42, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 9, fontSize: 13, fontWeight: schedule.day === i ? 600 : 500,
                      background: schedule.day === i ? 'var(--ink-1)' : 'var(--ink-10)',
                      border: schedule.day === i ? 'none' : '1px solid var(--ink-7)',
                      color: schedule.day === i ? '#fff' : 'var(--ink-4)',
                    }}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div className="field-label">Time</div>
              <input
                type="time"
                className="input"
                style={{ width: 130, fontWeight: 600 }}
                value={schedule.time}
                onChange={(e) => save({ ...schedule, time: e.target.value })}
              />
            </div>
            <div>
              <div className="field-label">Timezone</div>
              <div style={{ height: 42, display: 'flex', alignItems: 'center', padding: '0 14px', background: 'var(--ink-9)', borderRadius: 10, fontSize: 14, color: 'var(--ink-4)' }}>
                Australia/Melbourne
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 16px', background: 'var(--ink-9)', borderRadius: 10 }}>
            <CalendarCheck size={16} color="var(--ink-4)" />
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              Next run — <strong>{nextRun ?? '…'}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Client settings tab ----------

function SettingsTab({
  client, refresh, onDeleted,
}: {
  client: ClientDetail['client'];
  refresh: () => void;
  onDeleted: () => void;
}) {
  const [threshold, setThreshold] = useState(client.threshold_override?.toString() ?? '');
  const [retention, setRetention] = useState(client.retention_override?.toString() ?? '');
  const [emailInput, setEmailInput] = useState('');
  const emails = client.notify_emails;

  return (
    <div style={{ maxWidth: 560, marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ padding: '22px 24px' }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Diff threshold override</div>
        <div style={{ fontSize: 13, color: 'var(--ink-5)', margin: '2px 0 14px' }}>
          Changes above this percentage are flagged for review. Leave blank to use the global default.
        </div>
        <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
          <input
            className="input"
            style={{ width: 110, fontWeight: 600 }}
            value={threshold}
            placeholder="global"
            onChange={(e) => setThreshold(e.target.value)}
            onBlur={async () => {
              const value = threshold.trim() === '' ? null : parseFloat(threshold);
              await patch(`/api/clients/${client.id}`, { threshold_override: value === null || isNaN(value) ? null : value });
              refresh();
            }}
          />
          <span style={{ color: 'var(--ink-5)' }}>%</span>
        </div>
      </div>

      <div className="card" style={{ padding: '22px 24px' }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Notify list</div>
        <div style={{ fontSize: 13, color: 'var(--ink-5)', margin: '2px 0 14px' }}>Who gets emailed when a run finds changes.</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {emails.map((email) => (
            <span key={email} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 32, padding: '0 10px 0 12px', borderRadius: 999, background: 'var(--ink-8)', fontSize: 13, color: 'var(--ink-2)' }}>
              {email}
              <button
                className="vg-btn"
                style={{ border: 'none', background: 'none', padding: 0, color: 'var(--ink-5)', display: 'flex' }}
                onClick={async () => {
                  await patch(`/api/clients/${client.id}`, { notify_emails: emails.filter((e) => e !== email) });
                  refresh();
                }}
              >
                ✕
              </button>
            </span>
          ))}
          <input
            className="input"
            style={{ height: 32, width: 220, borderStyle: 'dashed', borderRadius: 999, fontSize: 13 }}
            placeholder="+ Add email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && emailInput.includes('@')) {
                await patch(`/api/clients/${client.id}`, { notify_emails: [...emails, emailInput.trim()] });
                setEmailInput('');
                refresh();
              }
            }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Lighthouse on every run</div>
          <div style={{ fontSize: 13, color: 'var(--ink-5)', marginTop: 2 }}>Capture Performance / A11y / Best practices / SEO.</div>
        </div>
        <Toggle
          on={client.lighthouse_enabled}
          onChange={async (on) => {
            await patch(`/api/clients/${client.id}`, { lighthouse_enabled: on });
            refresh();
          }}
        />
      </div>

      <div className="card" style={{ padding: '22px 24px' }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Retention override</div>
        <div style={{ fontSize: 13, color: 'var(--ink-5)', margin: '2px 0 14px' }}>
          Days of capture history to keep (capped by the global setting). Blank = global.
        </div>
        <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
          <input
            className="input"
            style={{ width: 110, fontWeight: 600 }}
            value={retention}
            placeholder="global"
            onChange={(e) => setRetention(e.target.value)}
            onBlur={async () => {
              const value = retention.trim() === '' ? null : parseInt(retention, 10);
              await patch(`/api/clients/${client.id}`, { retention_override: value === null || isNaN(value) ? null : value });
              refresh();
            }}
          />
          <span style={{ color: 'var(--ink-5)' }}>days</span>
        </div>
      </div>

      <div className="card" style={{ padding: '22px 24px', borderColor: 'rgba(192,50,43,.25)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#992822' }}>Remove client</div>
        <div style={{ fontSize: 13, color: 'var(--ink-5)', margin: '2px 0 14px' }}>
          Deletes the client, its pages, baselines and full capture history.
        </div>
        <button
          className="vg-btn btn-secondary"
          style={{ borderColor: 'rgba(192,50,43,.4)', color: '#992822' }}
          onClick={async () => {
            if (confirm(`Delete ${client.name} and all its history? This cannot be undone.`)) {
              await del(`/api/clients/${client.id}`);
              onDeleted();
            }
          }}
        >
          <Trash2 size={15} /> Delete client
        </button>
      </div>
    </div>
  );
}

// ---------- Add / edit page modal ----------

function PageModal({
  clientId, page, onClose, onSaved,
}: {
  clientId: number;
  page?: PageRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(page?.label ?? '');
  const [url, setUrl] = useState(page?.url ?? '');
  const [viewports, setViewports] = useState<string[]>(page?.viewports ?? ['desktop']);
  const [masks, setMasks] = useState((page?.mask_selectors ?? []).join('\n'));
  const [wait, setWait] = useState(page?.wait_selector ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleViewport = (v: string) =>
    setViewports((current) =>
      current.includes(v) ? (current.length > 1 ? current.filter((x) => x !== v) : current) : [...current, v]
    );

  return (
    <Modal
      title={page ? 'Edit page' : 'Add page'}
      onClose={onClose}
      footer={
        <>
          {page && (
            <button
              className="vg-btn btn-secondary"
              style={{ marginRight: 'auto', borderColor: 'rgba(192,50,43,.4)', color: '#992822' }}
              onClick={async () => {
                if (confirm('Remove this page and its history?')) {
                  await del(`/api/pages/${page.id}`);
                  onSaved();
                }
              }}
            >
              Remove
            </button>
          )}
          <button className="vg-btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="vg-btn btn-primary"
            disabled={busy || !label.trim() || !url.trim()}
            onClick={async () => {
              setBusy(true);
              setError(null);
              const payload = {
                label,
                url,
                viewports,
                mask_selectors: masks.split('\n').map((s) => s.trim()).filter(Boolean),
                wait_selector: wait.trim() || null,
              };
              try {
                if (page) await patch(`/api/pages/${page.id}`, payload);
                else await post(`/api/clients/${clientId}/pages`, payload);
                onSaved();
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
                setBusy(false);
              }
            }}
          >
            {page ? 'Save changes' : 'Add page'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="field-label">Label</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Homepage" autoFocus />
        </div>
        <div>
          <label className="field-label">URL</label>
          <input className="input input-mono" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/ or https://…" />
          <div style={{ fontSize: 12, color: 'var(--ink-5)', marginTop: 5 }}>Paths like <code>/pricing</code> resolve against the client&apos;s primary URL.</div>
        </div>
        <div>
          <label className="field-label">Viewports</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['desktop', 'mobile'].map((v) => (
              <button
                key={v}
                className="vg-btn"
                onClick={() => toggleViewport(v)}
                style={{
                  padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                  background: viewports.includes(v) ? 'var(--ink-1)' : 'var(--ink-10)',
                  border: viewports.includes(v) ? 'none' : '1px solid var(--ink-7)',
                  color: viewports.includes(v) ? '#fff' : 'var(--ink-4)',
                }}
              >
                {v === 'desktop' ? 'Desktop · 1440' : 'Mobile · 390'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="field-label">Ignore masks (CSS selectors, one per line)</label>
          <textarea
            className="input input-mono"
            style={{ height: 74, paddingTop: 10, resize: 'vertical' }}
            value={masks}
            onChange={(e) => setMasks(e.target.value)}
            placeholder={'.testimonials-carousel\n#latest-blog-feed'}
          />
        </div>
        <div>
          <label className="field-label">Wait for selector (optional)</label>
          <input className="input input-mono" value={wait} onChange={(e) => setWait(e.target.value)} placeholder=".hero-loaded" />
        </div>
        {error && <div style={{ fontSize: 13, color: 'var(--status-danger)' }}>{error}</div>}
      </div>
    </Modal>
  );
}

// ---------- CSV import modal ----------

interface CsvRow { label: string; url: string; viewports: string[]; valid: boolean; reason?: string }

function parseCsv(text: string): CsvRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line, i) => !(i === 0 && /^label\s*,/i.test(line)))
    .map((line) => {
      const [label = '', url = '', vps = ''] = line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
      const viewports = vps
        ? vps.split(/[|;/ ]+/).map((v) => v.toLowerCase()).filter((v) => ['desktop', 'mobile'].includes(v))
        : ['desktop'];
      const valid = !!label && !!url && (url.startsWith('/') || /^https?:\/\//i.test(url));
      return {
        label, url, viewports: viewports.length ? viewports : ['desktop'], valid,
        reason: !label ? 'missing label' : !url ? 'missing url' : valid ? undefined : 'invalid URL (needs / or https://)',
      };
    });
}

function CsvModal({ clientId, onClose, onImported }: { clientId: number; onClose: () => void; onImported: () => void }) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rows = useMemo(() => parseCsv(text), [text]);
  const valid = rows.filter((r) => r.valid);

  return (
    <Modal
      title="Import pages from CSV"
      width={560}
      onClose={onClose}
      footer={
        <>
          <button className="vg-btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="vg-btn btn-primary"
            disabled={busy || valid.length === 0}
            onClick={async () => {
              setBusy(true);
              await post(`/api/clients/${clientId}/pages`, { pages: valid });
              onImported();
            }}
          >
            Import {valid.length} page{valid.length === 1 ? '' : 's'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-5)' }}>
          Paths resolve against this client&apos;s primary URL.
        </span>
        <button
          className="vg-btn btn-secondary btn-sm"
          onClick={() => downloadCsv('vigil-pages-template.csv', PAGE_TEMPLATE)}
        >
          <Download size={14} /> Download template
        </button>
      </div>
      <label
        style={{ display: 'block', border: '1.5px dashed var(--ink-6)', borderRadius: 12, padding: 24, textAlign: 'center', background: 'var(--ink-9)', marginBottom: 8, cursor: 'pointer' }}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              setFileName(file.name);
              setText(await file.text());
            }
          }}
        />
        <FileUp size={26} color="var(--ink-4)" style={{ display: 'inline-block' }} />
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)', marginTop: 8 }}>
          {fileName ? `${fileName} · ${rows.length} row${rows.length === 1 ? '' : 's'} parsed` : 'Choose a CSV file (or paste below)'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-5)', marginTop: 3 }}>
          Expected format — <code style={{ fontFamily: 'var(--font-mono)' }}>label,url,viewports?</code>
        </div>
      </label>
      <textarea
        className="input input-mono"
        style={{ height: 84, paddingTop: 10, resize: 'vertical', marginBottom: 8 }}
        placeholder={'Homepage,/\nServices,/services,desktop|mobile'}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {rows.length > 0 && (
        <>
          <div className="field-label" style={{ margin: '10px 0 8px' }}>Preview</div>
          <div style={{ border: '1px solid var(--ink-7)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr auto', gap: 12, padding: '8px 14px', background: 'var(--ink-9)', borderBottom: '1px solid var(--ink-7)', fontSize: 11, fontWeight: 600, color: 'var(--ink-5)', textTransform: 'uppercase' }}>
              <span>Label</span><span>URL</span><span />
            </div>
            {rows.map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr auto', gap: 12, padding: '9px 14px', borderBottom: i < rows.length - 1 ? '1px solid var(--ink-8)' : 'none', fontSize: 13, alignItems: 'center', background: row.valid ? undefined : 'rgba(192,50,43,.05)' }}>
                <span style={{ color: 'var(--ink-2)' }}>{row.label || '—'}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: row.valid ? 'var(--ink-4)' : 'var(--status-danger)' }}>
                  {row.url || '—'}{!row.valid && row.reason ? ` (${row.reason})` : ''}
                </span>
                {row.valid ? (
                  <Check size={15} color="var(--status-success)" />
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--status-danger)' }}>
                    <AlertCircle size={14} /> invalid
                  </span>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, fontSize: 12.5, color: 'var(--ink-4)' }}>
            <Info size={14} /> {valid.length} valid{rows.length - valid.length ? ` · ${rows.length - valid.length} invalid row${rows.length - valid.length === 1 ? '' : 's'} will be skipped` : ''}.
          </div>
        </>
      )}
    </Modal>
  );
}
