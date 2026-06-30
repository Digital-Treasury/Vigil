'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Flag, RotateCcw, Loader2, Sparkles, Pencil } from 'lucide-react';
import {
  VIEWPORTS,
  SEVERITY,
  diffColor,
  formatDiffPct,
  type ViewportKey,
  type SeverityKey,
  type RecommendationKey,
} from '@vigil/core';
import {
  acceptInvestigation,
  resolveInvestigation,
  reopenInvestigation,
  updateInvestigationNote,
} from '@/lib/actions/investigations';

export interface InvestigationItem {
  id: string;
  status: 'open' | 'resolved';
  clientId: string;
  clientName: string;
  pageLabel: string;
  pageUrl: string;
  pageId: string;
  viewport: ViewportKey;
  runId: string;
  notes: string | null;
  flaggedAt: string;
  diffPct: number | null;
  diffUrl: string | null;
  severity: SeverityKey | null;
  recommendation: RecommendationKey | null;
  assessmentSummary: string | null;
}

export function InvestigationCard({ item }: { item: InvestigationItem }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(item.notes ?? '');
  const resolved = item.status === 'resolved';
  const reviewHref = `/runs/${item.runId}/review/${item.pageId}/${item.viewport}`;

  const flaggedAt = new Date(item.flaggedAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });

  const saveNote = () => start(async () => { await updateInvestigationNote(item.id, note); setEditing(false); });
  const onAccept = () => start(async () => { await acceptInvestigation(item.id); });
  const onResolve = () => start(async () => { await resolveInvestigation(item.id, note); });
  const onReopen = () => start(async () => { await reopenInvestigation(item.id); });

  return (
    <div
      className="flex gap-4 rounded-[14px] border border-ink-7 bg-ink-10 p-4"
      style={resolved ? { opacity: 0.72 } : undefined}
    >
      {/* diff thumbnail */}
      <Link href={reviewHref} className="block h-[88px] w-[120px] flex-none overflow-hidden rounded-[8px] border border-ink-7 bg-ink-9">
        {item.diffUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.diffUrl} alt="" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-ink-5">no diff</div>
        )}
      </Link>

      {/* body */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-ink-1">{item.clientName}</span>
          <span className="text-ink-6">/</span>
          <span className="text-sm font-semibold text-ink-2">{item.pageLabel}</span>
          <span className="rounded-[6px] bg-ink-9 px-2 py-0.5 text-[11px] text-ink-4">{VIEWPORTS[item.viewport].label}</span>
          {resolved && (
            <span className="rounded-full bg-ink-8 px-2 py-0.5 text-[11px] font-semibold text-ink-4">Resolved</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
          <span className="text-ink-5">
            Visual diff{' '}
            <strong style={{ color: diffColor(item.diffPct) }}>{formatDiffPct(item.diffPct)}</strong>
          </span>
          {item.severity && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold"
              style={{ color: SEVERITY[item.severity].color, background: SEVERITY[item.severity].bg }}
            >
              <Sparkles size={11} /> {SEVERITY[item.severity].label}
            </span>
          )}
          <span className="text-ink-5">flagged {flaggedAt}</span>
        </div>

        {item.assessmentSummary && (
          <p className="text-[12.5px] leading-relaxed text-ink-4">{item.assessmentSummary}</p>
        )}

        {/* note */}
        {editing ? (
          <div className="mt-1 flex flex-col gap-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-[9px] border border-ink-7 bg-ink-10 px-3 py-2 text-[13px] text-ink-2 outline-none focus:border-ink-3"
              placeholder="What looks wrong, and what should a dev check?"
            />
            <div className="flex gap-2">
              <button onClick={saveNote} disabled={pending} className="flex h-8 items-center gap-1.5 rounded-[8px] bg-ink-0 px-3 text-[12.5px] font-semibold text-white disabled:opacity-60">
                {pending && <Loader2 size={12} className="animate-spin" />} Save note
              </button>
              <button onClick={() => { setNote(item.notes ?? ''); setEditing(false); }} className="h-8 rounded-[8px] border border-ink-7 px-3 text-[12.5px] font-semibold text-ink-3">Cancel</button>
            </div>
          </div>
        ) : item.notes ? (
          <div className="mt-1 flex items-start gap-2 rounded-[9px] border border-ink-8 bg-ink-9 px-3 py-2 text-[12.5px] text-ink-3">
            <span className="flex-1 whitespace-pre-wrap">{item.notes}</span>
            <button onClick={() => setEditing(true)} className="text-ink-5 hover:text-ink-2" title="Edit note"><Pencil size={13} /></button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="mt-0.5 inline-flex w-fit items-center gap-1.5 text-[12.5px] font-medium text-ink-5 hover:text-ink-2">
            <Pencil size={12} /> Add a note
          </button>
        )}
      </div>

      {/* actions */}
      <div className="flex w-[170px] flex-none flex-col gap-2">
        <Link href={reviewHref} className="flex h-9 items-center justify-center gap-1.5 rounded-[9px] border border-ink-7 bg-ink-10 text-[12.5px] font-semibold text-ink-1">
          Review <ArrowRight size={14} />
        </Link>
        {resolved ? (
          <button onClick={onReopen} disabled={pending} className="flex h-9 items-center justify-center gap-1.5 rounded-[9px] border border-ink-7 bg-ink-10 text-[12.5px] font-semibold text-ink-3 disabled:opacity-60">
            {pending ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Reopen
          </button>
        ) : (
          <>
            <button onClick={onAccept} disabled={pending} className="flex h-9 items-center justify-center gap-1.5 rounded-[9px] bg-ink-0 text-[12.5px] font-semibold text-white disabled:opacity-60">
              {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />} Accept as baseline
            </button>
            <button onClick={onResolve} disabled={pending} className="flex h-9 items-center justify-center gap-1.5 rounded-[9px] border border-ink-2 bg-ink-10 text-[12.5px] font-semibold text-ink-1 disabled:opacity-60">
              <Flag size={13} /> Mark resolved
            </button>
          </>
        )}
      </div>
    </div>
  );
}
