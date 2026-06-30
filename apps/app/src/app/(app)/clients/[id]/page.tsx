import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flag,
  Plus,
  Pencil,
  Clock,
  Wrench,
  Hand,
  CalendarCheck,
} from 'lucide-react';
import { prisma } from '@vigil/db';
import { VIEWPORTS } from '@vigil/core';
import { StatusPill } from '@/components/Status';
import { RunNowButton } from '@/components/RunNowButton';
import { CheckpointToggle } from '@/components/CheckpointToggle';
import { CsvImport } from '@/components/CsvImport';
import { DeleteButton } from '@/components/DeleteButton';
import { deleteClient } from '@/lib/actions/clients';
import { deletePage } from '@/lib/actions/pages';
import { describeCron, deriveHealth, relativeTime } from '@/lib/health';
import { nextRuns } from '@/lib/schedule';

export const dynamic = 'force-dynamic';

type Tab = 'pages' | 'runs' | 'schedule' | 'settings';
const TABS: { key: Tab; label: string }[] = [
  { key: 'pages', label: 'Pages' },
  { key: 'runs', label: 'Runs' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'settings', label: 'Settings' },
];

const triggerIcon = { manual: Hand, scheduled: Clock, maintenance: Wrench } as const;

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab: Tab = (['pages', 'runs', 'schedule', 'settings'] as Tab[]).includes(tabParam as Tab)
    ? (tabParam as Tab)
    : 'pages';

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      pages: { orderBy: { createdAt: 'asc' }, include: { viewports: true, baselines: true } },
      runs: { orderBy: { createdAt: 'desc' }, take: 20 },
      activeCheckpoint: true,
    },
  });
  if (!client) notFound();

  const cpActive = !!client.activeCheckpointId;

  return (
    <div className="max-w-[1180px] px-10 pb-16 pt-6">
      <Link href="/" className="mb-[18px] inline-flex items-center gap-1.5 text-[13px] text-ink-4 hover:text-ink-1">
        <ChevronLeft size={15} /> Dashboard
      </Link>

      {/* header */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-[54px] w-[54px] items-center justify-center rounded-[13px] bg-ink-1 text-[19px] font-semibold text-white">
            {initials(client.name)}
          </div>
          <div>
            <h1 className="m-0 text-[26px] font-bold tracking-tight text-ink-1">{client.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <a href={client.primaryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13.5px] text-ink-4 hover:text-ink-1">
                {new URL(client.primaryUrl).host} <ExternalLink size={12} />
              </a>
              <span className="text-ink-6">·</span>
              <span className="text-[13.5px] text-ink-4">{client.pages.length} valuable pages</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <CheckpointToggle clientId={client.id} active={cpActive} />
          <RunNowButton clientId={client.id} variant="solid" />
        </div>
      </div>

      {cpActive && (
        <div className="mt-[18px] flex items-center gap-3 rounded-[11px] border border-[rgba(180,122,18,.3)] bg-[rgba(180,122,18,.1)] px-[18px] py-3">
          <Flag size={18} style={{ color: '#B47A12' }} />
          <span className="flex-1 text-[13.5px] text-[#7A5208]">
            <strong>Maintenance checkpoint active</strong>
            {client.activeCheckpoint?.startedAt
              ? ` — started ${client.activeCheckpoint.startedAt.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}.`
              : '.'}{' '}
            Captures will compare against this “before” snapshot.
          </span>
        </div>
      )}

      {/* tabs */}
      <div className="mt-6 flex gap-1 border-b border-ink-7">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Link
              key={t.key}
              href={`/clients/${id}?tab=${t.key}`}
              className="-mb-px border-b-2 px-3.5 py-2.5 text-sm"
              style={{
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--color-ink-1)' : 'var(--color-ink-4)',
                borderColor: active ? 'var(--color-ink-1)' : 'transparent',
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* PAGES */}
      {tab === 'pages' && (
        <>
          <div className="my-3 flex items-center justify-between">
            <span className="text-[13px] text-ink-5">{client.pages.length} pages captured each run</span>
            <div className="flex gap-2.5">
              <CsvImport clientId={client.id} primaryUrl={client.primaryUrl} />
              <Link href={`/clients/${id}/pages/new`} className="flex h-9 items-center gap-1.5 rounded-[9px] bg-ink-0 px-3.5 text-[13px] font-semibold text-white">
                <Plus size={15} /> Add page
              </Link>
            </div>
          </div>

          {client.pages.length === 0 ? (
            <div className="rounded-[14px] border border-ink-7 bg-ink-10 px-10 py-14 text-center text-sm text-ink-4">
              No pages yet. Add one or import a CSV to start watching.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[14px] border border-ink-7 bg-ink-10">
              <div className="grid grid-cols-[64px_2.2fr_1.3fr_1.4fr_auto] gap-4 border-b border-ink-7 px-[22px] py-[11px] text-[11px] font-semibold uppercase tracking-wide text-ink-5">
                <span>Baseline</span><span>Page</span><span>Viewports</span><span>Status</span><span />
              </div>
              {client.pages.map((p) => (
                <div key={p.id} className="grid grid-cols-[64px_2.2fr_1.3fr_1.4fr_auto] items-center gap-4 border-b border-ink-8 px-[22px] py-3 transition hover:bg-ink-9">
                  <div className="h-[34px] w-12 rounded-md border border-ink-7 bg-[repeating-linear-gradient(45deg,var(--color-ink-8),var(--color-ink-8)_5px,var(--color-ink-9)_5px,var(--color-ink-9)_10px)]" />
                  <Link href={`/clients/${id}/pages/${p.id}`} className="min-w-0">
                    <div className="text-sm font-semibold text-ink-1">{p.label}</div>
                    <div className="truncate text-[12.5px] text-ink-5">{p.url}</div>
                  </Link>
                  <div className="text-[12.5px] text-ink-4">
                    {p.viewports.length
                      ? p.viewports.map((v) => VIEWPORTS[v.kind].label).join(' · ')
                      : '—'}
                  </div>
                  <div className="text-[13px] text-ink-4">
                    {p.baselines.length ? 'Baseline set' : 'No baseline yet'}
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href={`/clients/${id}/pages/${p.id}/edit`} className="text-ink-5 hover:text-ink-2"><Pencil size={15} /></Link>
                    <DeleteButton action={deletePage.bind(null, id, p.id)} confirmMessage={`Delete page “${p.label}”?`} iconOnly />
                    <Link href={`/clients/${id}/pages/${p.id}`} className="text-ink-5 hover:text-ink-2"><ChevronRight size={17} /></Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* RUNS */}
      {tab === 'runs' && (
        <div className="mt-[22px] overflow-hidden rounded-[14px] border border-ink-7 bg-ink-10">
          <div className="grid grid-cols-[1.4fr_1.4fr_1.6fr_auto] gap-4 border-b border-ink-7 px-[22px] py-[11px] text-[11px] font-semibold uppercase tracking-wide text-ink-5">
            <span>When</span><span>Trigger</span><span>Result</span><span />
          </div>
          {client.runs.length === 0 ? (
            <div className="px-[22px] py-12 text-center text-sm text-ink-4">No runs yet — hit “Run now”.</div>
          ) : (
            client.runs.map((r) => {
              const h = deriveHealth(r);
              const Icon = triggerIcon[r.trigger];
              return (
                <Link key={r.id} href={`/runs/${r.id}`} className="grid grid-cols-[1.4fr_1.4fr_1.6fr_auto] items-center gap-4 border-b border-ink-8 px-[22px] py-3.5 transition hover:bg-ink-9">
                  <span className="text-[13.5px] font-semibold text-ink-1">
                    {relativeTime(r.completedAt ?? r.createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[13px] capitalize text-ink-4"><Icon size={14} /> {r.trigger}</span>
                  <span className="text-[13px] text-ink-3">{h.lastRunLabel}</span>
                  <span className="text-[13px] font-semibold text-ink-4">View report →</span>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* SCHEDULE */}
      {tab === 'schedule' && (
        <div className="mt-[22px] max-w-[560px] rounded-[14px] border border-ink-7 bg-ink-10 p-[26px]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[15px] font-semibold text-ink-1">Scheduled runs</div>
              <div className="mt-1 text-[13px] text-ink-5">Capture automatically on a cadence ({client.timezone}).</div>
            </div>
            <Link href={`/clients/${id}/edit`} className="flex h-9 items-center gap-1.5 rounded-[9px] border border-ink-7 bg-ink-10 px-3.5 text-[13px] font-semibold text-ink-1">
              <Pencil size={14} /> Edit schedule
            </Link>
          </div>
          <div className="mt-5 flex items-center gap-2.5 rounded-[10px] bg-ink-9 px-4 py-3.5">
            <CalendarCheck size={16} className="text-ink-4" />
            <span className="text-[13px] text-ink-3">
              {client.scheduleEnabled && client.scheduleCron
                ? describeCron(client.scheduleCron, client.timezone)
                : 'No schedule — manual runs only.'}
            </span>
          </div>
          {client.scheduleEnabled && client.scheduleCron && (
            <div className="mt-3">
              <div className="dt-eyebrow mb-1.5">Next runs</div>
              <div className="flex flex-col gap-1">
                {nextRuns(client.scheduleCron, client.timezone, 4).map((d, i) => (
                  <span key={i} className="text-[13px] text-ink-3">
                    {d.toLocaleString('en-AU', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: client.timezone })}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SETTINGS */}
      {tab === 'settings' && (
        <div className="mt-[22px] flex max-w-[560px] flex-col gap-3.5">
          <div className="rounded-[14px] border border-ink-7 bg-ink-10 px-6 py-[22px]">
            <div className="text-sm font-semibold text-ink-1">Diff threshold override</div>
            <div className="mt-2 inline-flex h-10 items-center gap-2 rounded-[10px] border border-ink-7 px-3.5 text-sm font-semibold text-ink-1">
              {client.thresholdOverride ?? '—'} <span className="font-normal text-ink-5">%</span>
            </div>
          </div>
          <div className="rounded-[14px] border border-ink-7 bg-ink-10 px-6 py-[22px]">
            <div className="text-sm font-semibold text-ink-1">Notify list</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {client.notifyEmails.length ? (
                client.notifyEmails.map((e) => (
                  <span key={e} className="inline-flex h-8 items-center rounded-full bg-ink-8 px-3 text-[13px] text-ink-2">{e}</span>
                ))
              ) : (
                <span className="text-[13px] text-ink-5">No recipients.</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-[14px] border border-ink-7 bg-ink-10 px-6 py-[22px]">
            <div className="text-sm font-semibold text-ink-1">Lighthouse on every run</div>
            <span className="text-[13px] font-semibold" style={{ color: client.lighthouseEnabled ? '#1A8F5F' : 'var(--color-ink-5)' }}>
              {client.lighthouseEnabled ? 'On' : 'Off'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <Link href={`/clients/${id}/edit`} className="flex h-10 items-center gap-1.5 rounded-[10px] border border-ink-7 bg-ink-10 px-4 text-[13.5px] font-semibold text-ink-1">
              <Pencil size={15} /> Edit client
            </Link>
            <DeleteButton action={deleteClient.bind(null, id)} confirmMessage={`Delete ${client.name} and all its data? This cannot be undone.`} label="Delete client" />
          </div>
        </div>
      )}
    </div>
  );
}
