'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Filter } from 'lucide-react';
import { useApi, post } from '@/lib/useApi';
import { Avatar, SeverityBadge, Spinner, Thumb } from '@/components/ui';
import { formatPct, formatWhen } from '@/lib/format';
import type { ClaudeAssessment } from '@/lib/types';

interface Investigation {
  id: number;
  result_id: number;
  client: { id: number; name: string };
  page: { id: number; label: string };
  viewport: string;
  note: string;
  flagged_by: string;
  flagged_at: string;
  diff_pct: number | null;
  diff_img: string | null;
  assessment: ClaudeAssessment | null;
}

export default function InvestigationsPage() {
  const router = useRouter();
  const { data, loading, refresh } = useApi<{ investigations: Investigation[] }>('/api/investigations', 15000);
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  if (loading && !data) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><Spinner /></div>;
  }
  const all = data?.investigations ?? [];
  const clients = Array.from(new Set(all.map((iv) => iv.client.name))).sort();
  const items = all.filter(
    (iv) =>
      (clientFilter === 'all' || iv.client.name === clientFilter) &&
      (severityFilter === 'all' || iv.assessment?.severity === severityFilter)
  );

  return (
    <div style={{ padding: '34px 40px 60px', maxWidth: 1100 }}>
      <div className="dt-eyebrow" style={{ marginBottom: 8 }}>Cross-client queue</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 22 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>Investigations</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 10px 0 13px', border: '1px solid var(--ink-7)', borderRadius: 9, background: 'var(--ink-10)', fontSize: 13, color: 'var(--ink-3)' }}>
            <Filter size={14} />
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', background: 'transparent', color: 'var(--ink-3)' }}
            >
              <option value="all">All clients</option>
              {clients.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 10px', border: '1px solid var(--ink-7)', borderRadius: 9, background: 'var(--ink-10)', fontSize: 13, color: 'var(--ink-3)' }}>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', background: 'transparent', color: 'var(--ink-3)' }}
            >
              <option value="all">All severities</option>
              <option value="intentional">Intentional change</option>
              <option value="minor">Minor cosmetic</option>
              <option value="regression">Likely regression</option>
              <option value="broken">Broken</option>
            </select>
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card" style={{ padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Nothing to investigate</div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-4)' }}>
            {all.length === 0 ? 'Flagged pages land here until someone resolves them.' : 'No items match the current filters.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((iv) => (
            <div
              key={iv.id}
              className="card vg-card-hover"
              style={{ display: 'flex', gap: 16, padding: 16, cursor: 'pointer' }}
              onClick={() => router.push(`/review/${iv.result_id}`)}
            >
              <Thumb src={iv.diff_img} width={108} height={72} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                  <Avatar name={iv.client.name} size={24} radius={6} />
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{iv.client.name}</span>
                  <span style={{ color: 'var(--ink-6)' }}>·</span>
                  <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>{iv.page.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-5)', background: 'var(--ink-9)', padding: '2px 8px', borderRadius: 6 }}>
                    {iv.viewport[0].toUpperCase() + iv.viewport.slice(1)}
                  </span>
                  <span style={{ marginLeft: 'auto' }}>
                    {iv.assessment && <SeverityBadge severity={iv.assessment.severity} />}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: '0 0 8px', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {iv.note || (iv.assessment ? iv.assessment.summary : 'No note added.')}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--ink-5)' }}>
                  <span>Flagged {formatWhen(iv.flagged_at)}</span>
                  <span>by {iv.flagged_by}</span>
                  <span style={{ fontWeight: 700, color: 'var(--status-danger)' }}>{formatPct(iv.diff_pct)} diff</span>
                  <button
                    className="vg-btn btn-secondary btn-sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      await post(`/api/investigations/${iv.id}/resolve`);
                      refresh();
                    }}
                  >
                    <Check size={14} /> Resolve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
