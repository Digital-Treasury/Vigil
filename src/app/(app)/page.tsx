'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, PlayCircle, Eye, Flag, Plus, Play, Search, ChevronRight, Upload } from 'lucide-react';
import { useApi, post } from '@/lib/useApi';
import { StatusPill, Avatar, Modal, Spinner } from '@/components/ui';
import ImportClientsModal from '@/components/ImportClientsModal';
import { formatWhen } from '@/lib/format';

interface DashboardClient {
  id: number;
  name: string;
  url: string;
  pageCount: number;
  checkpoint: { started_at: string } | null;
  lastRun: {
    id: number;
    status: string;
    started_at: string;
    trigger: string;
    tally: { total: number; passed: number; changes: number; broken: number; errors: number; running: number } | null;
  } | null;
  nextRun: string | null;
}

interface Dashboard {
  stats: { clients: number; runsToday: number; awaiting: number; openInvestigations: number };
  clients: DashboardClient[];
}

function clientStatus(client: DashboardClient): string {
  if (!client.lastRun) return 'resolved';
  if (client.lastRun.status === 'running') return 'running';
  const tally = client.lastRun.tally;
  if (!tally) return 'resolved';
  if (tally.broken > 0 || tally.errors > 0) return 'broken';
  if (tally.changes > 0) return 'changes';
  return 'passed';
}

function lastRunLabel(client: DashboardClient): string {
  const run = client.lastRun;
  if (!run) return 'No runs yet';
  if (run.status === 'running') {
    const done = run.tally ? run.tally.total - run.tally.running : 0;
    return `Capturing ${done} of ${run.tally?.total ?? '?'}…`;
  }
  const t = run.tally!;
  const parts: string[] = [];
  if (t.broken) parts.push(`${t.broken} broken`);
  if (t.errors) parts.push(`${t.errors} failed`);
  if (t.changes) parts.push(`${t.changes} change${t.changes === 1 ? '' : 's'}`);
  parts.push(`${t.passed} passed`);
  return parts.join(' · ');
}

export default function DashboardPage() {
  const router = useRouter();
  const { data, loading, refresh } = useApi<Dashboard>('/api/dashboard', 8000);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [runningAll, setRunningAll] = useState(false);
  const [query, setQuery] = useState('');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Spinner />
      </div>
    );
  }
  if (!data) return null;

  const clients = data.clients
    .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      const rank = (c: DashboardClient) =>
        ({ broken: 0, changes: 1, running: 2, passed: 3, resolved: 4 })[clientStatus(c)] ?? 5;
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });

  const stats = [
    { icon: Building2, label: 'Active clients', value: data.stats.clients, color: 'var(--ink-1)', accent: 'var(--ink-4)' },
    { icon: PlayCircle, label: 'Runs today', value: data.stats.runsToday, color: 'var(--ink-1)', accent: 'var(--ink-4)' },
    { icon: Eye, label: 'Pages awaiting review', value: data.stats.awaiting, color: data.stats.awaiting ? 'var(--status-warning)' : 'var(--ink-1)', accent: data.stats.awaiting ? 'var(--status-warning)' : 'var(--ink-4)' },
    { icon: Flag, label: 'Open investigations', value: data.stats.openInvestigations, color: data.stats.openInvestigations ? 'var(--status-danger)' : 'var(--ink-1)', accent: data.stats.openInvestigations ? 'var(--status-danger)' : 'var(--ink-4)' },
  ];

  return (
    <div style={{ padding: '34px 40px 60px', maxWidth: 1180 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 26 }}>
        <div>
          <div className="dt-eyebrow" style={{ marginBottom: 8 }}>Fleet overview</div>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>{greeting}.</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-4)' }}>
            {data.stats.awaiting > 0
              ? `${data.stats.awaiting} page${data.stats.awaiting === 1 ? '' : 's'} need${data.stats.awaiting === 1 ? 's' : ''} your eyes.`
              : 'All quiet across the fleet.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <button
            className="vg-btn btn-secondary"
            style={{ height: 42 }}
            disabled={runningAll || data.clients.every((c) => c.pageCount === 0)}
            onClick={async () => {
              const eligible = data.clients.filter((c) => c.pageCount > 0 && clientStatus(c) !== 'running').length;
              if (!confirm(`Run audits for ${eligible} client${eligible === 1 ? '' : 's'} now? The queue captures one page at a time, so a full fleet run takes a while.`)) return;
              setRunningAll(true);
              try {
                const result = await post('/api/run-all');
                refresh();
                if (result.skippedRunning) {
                  alert(`Started ${result.started} runs (${result.skippedRunning} client${result.skippedRunning === 1 ? ' was' : 's were'} already running).`);
                }
              } finally {
                setRunningAll(false);
              }
            }}
          >
            <PlayCircle size={16} /> {runningAll ? 'Starting…' : 'Run all'}
          </button>
          <button className="vg-btn btn-secondary" style={{ height: 42 }} onClick={() => setShowImport(true)}>
            <Upload size={16} /> Import clients
          </button>
          <button className="vg-btn btn-primary" style={{ height: 42, padding: '0 18px' }} onClick={() => setShowAdd(true)}>
            <Plus size={17} /> Add client
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-4)', fontSize: 12.5, fontWeight: 500, marginBottom: 12 }}>
                <Icon size={15} color={s.accent} /> {s.label}
              </div>
              <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-.02em', color: s.color, lineHeight: 1 }}>{s.value}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Clients</h2>
          <span style={{ fontSize: 13, color: 'var(--ink-5)' }}>sorted by — needs attention first</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px', border: '1px solid var(--ink-7)', borderRadius: 9, background: 'var(--ink-10)', width: 240 }}>
          <Search size={15} color="var(--ink-5)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients…"
            style={{ border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', width: '100%', background: 'transparent' }}
          />
        </div>
      </div>

      {data.clients.length === 0 ? (
        <div className="card" style={{ padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Add your first client</div>
          <p style={{ fontSize: 13.5, color: 'var(--ink-4)', margin: '0 0 20px', lineHeight: 1.6 }}>
            Vigil captures your clients&apos; valuable pages, stores an accepted-good baseline,
            <br />
            and flags anything that changes — before the client sees it.
          </p>
          <div style={{ display: 'flex', gap: 9, justifyContent: 'center' }}>
            <button className="vg-btn btn-secondary" onClick={() => setShowImport(true)}>
              <Upload size={15} /> Import clients
            </button>
            <button className="vg-btn btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add client
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-head" style={{ gridTemplateColumns: '2.4fr 1.5fr 1.3fr 1fr auto' }}>
            <span>Client</span>
            <span>Last run</span>
            <span>Status</span>
            <span>Next run</span>
            <span />
          </div>
          {clients.map((client) => (
            <div
              key={client.id}
              className="table-row vg-row-hover"
              style={{ gridTemplateColumns: '2.4fr 1.5fr 1.3fr 1fr auto', cursor: 'pointer', padding: '15px 22px' }}
              onClick={() => router.push(`/clients/${client.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
                <Avatar name={client.name} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{client.name}</span>
                    {client.checkpoint && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', background: 'var(--ink-8)', border: '1px solid var(--ink-7)', padding: '1px 7px', borderRadius: 999 }}>
                        <Flag size={11} /> checkpoint
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {client.url.replace(/^https?:\/\//, '')} · {client.pageCount} page{client.pageCount === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', minWidth: 0 }}>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastRunLabel(client)}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-5)' }}>
                  {client.lastRun ? formatWhen(client.lastRun.started_at) : '—'}
                </div>
              </div>
              <div><StatusPill status={clientStatus(client)} /></div>
              <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>{client.nextRun ?? '—'}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="vg-btn btn-secondary btn-sm"
                  disabled={client.pageCount === 0 || clientStatus(client) === 'running'}
                  onClick={async (e) => {
                    e.stopPropagation();
                    const { runId } = await post(`/api/clients/${client.id}/run`);
                    router.push(`/runs/${runId}`);
                  }}
                >
                  <Play size={14} /> Run now
                </button>
                <ChevronRight size={17} color="var(--ink-5)" style={{ alignSelf: 'center' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showImport && (
        <ImportClientsModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            refresh();
          }}
        />
      )}
      {showAdd && (
        <AddClientModal
          onClose={() => setShowAdd(false)}
          onCreated={(id) => {
            setShowAdd(false);
            refresh();
            router.push(`/clients/${id}`);
          }}
        />
      )}
    </div>
  );
}

function AddClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [emails, setEmails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal
      title="Add client"
      onClose={onClose}
      footer={
        <>
          <button className="vg-btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="vg-btn btn-primary"
            disabled={busy || !name.trim() || !url.trim()}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const { id } = await post('/api/clients', {
                  name,
                  url,
                  notify_emails: emails.split(/[,\s]+/).filter((e) => e.includes('@')),
                });
                onCreated(id);
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
                setBusy(false);
              }
            }}
          >
            Add client &amp; capture pages
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="field-label">Client name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Northbridge Dental" autoFocus />
        </div>
        <div>
          <label className="field-label">Primary URL</label>
          <input className="input input-mono" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://northbridgedental.com.au" />
        </div>
        <div>
          <label className="field-label">Notify emails</label>
          <input className="input" value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="sara@digitaltreasury.com.au, tom@…" />
          <div style={{ fontSize: 12, color: 'var(--ink-5)', marginTop: 6 }}>
            Who gets emailed when a run finds changes. Schedule can be set after creation.
          </div>
        </div>
        {error && <div style={{ fontSize: 13, color: 'var(--status-danger)' }}>{error}</div>}
      </div>
    </Modal>
  );
}
