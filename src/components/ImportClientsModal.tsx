'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Check, FileUp, Info } from 'lucide-react';
import { Modal } from './ui';
import { post } from '@/lib/useApi';

// Accepted line formats (header row optional, mixable):
//   https://client-site.com.au/some-page              ← bare URL; client + label derived
//   Client Name,https://client-site.com.au/page       ← explicit client
//   Client Name,/pricing,Pricing,desktop|mobile       ← path + label + viewports
interface ParsedRow {
  raw: string;
  client: string;
  clientUrl: string;
  label: string;
  url: string;
  viewports: string[];
  valid: boolean;
  reason?: string;
}

function titleCase(text: string): string {
  return text
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(' ');
}

function isUrlish(cell: string): boolean {
  return /^https?:\/\//i.test(cell) || /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(cell);
}

function normalizeUrl(cell: string): string {
  return /^https?:\/\//i.test(cell) ? cell : `https://${cell}`;
}

function deriveClientName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return titleCase(host.split('.')[0]);
  } catch {
    return '';
  }
}

function deriveLabel(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '');
    if (!path || path === '/') return 'Homepage';
    return titleCase(decodeURIComponent(path.split('/').filter(Boolean).pop()!));
  } catch {
    return '';
  }
}

function parseViewports(cell: string | undefined): string[] {
  if (!cell) return ['desktop'];
  const list = cell
    .split(/[|;/ ]+/)
    .map((v) => v.trim().toLowerCase())
    .filter((v) => ['desktop', 'mobile'].includes(v));
  return list.length ? list : ['desktop'];
}

export function parseImport(text: string): ParsedRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line, i) => !(i === 0 && /^(client|name)\s*,/i.test(line)))
    .map((raw) => {
      const cells = raw.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
      let client = '';
      let url = '';
      let label = '';
      let viewports: string[] = ['desktop'];

      if (cells.length === 1 || isUrlish(cells[0])) {
        // Bare URL (optionally followed by label, viewports)
        url = normalizeUrl(cells[0]);
        client = deriveClientName(url);
        label = cells[1] || deriveLabel(url);
        viewports = parseViewports(cells[2]);
      } else {
        // client, url-or-path, label?, viewports?
        client = cells[0];
        url = cells[1] || '';
        if (url && !url.startsWith('/')) url = normalizeUrl(url);
        label = cells[2] || (url ? deriveLabel(url.startsWith('/') ? `https://x.com${url}` : url) : '');
        viewports = parseViewports(cells[3]);
      }

      let clientUrl = '';
      let valid = true;
      let reason: string | undefined;
      if (!client) { valid = false; reason = 'no client name'; }
      else if (!url) { valid = false; reason = 'no URL'; }
      else if (url.startsWith('/')) { valid = false; reason = 'path needs a client row with a full URL first'; }
      else {
        try {
          clientUrl = new URL(url).origin;
        } catch {
          valid = false;
          reason = 'invalid URL';
        }
      }
      if (valid && !label) label = 'Homepage';
      return { raw, client, clientUrl, label, url, viewports, valid, reason };
    })
    .map((row, _i, rows) => {
      // Resolve path-only rows against the nearest preceding full URL for the same client.
      if (!row.valid && row.reason?.startsWith('path')) {
        const sibling = rows.find((r) => r.valid && r.client.toLowerCase() === row.client.toLowerCase());
        if (sibling) {
          const cells = row.raw.split(',').map((c) => c.trim());
          const path = cells[1];
          return {
            ...row,
            url: sibling.clientUrl + path,
            clientUrl: sibling.clientUrl,
            label: cells[2] || deriveLabel(sibling.clientUrl + path),
            valid: true,
            reason: undefined,
          };
        }
      }
      return row;
    });
}

export function groupImport(rows: ParsedRow[]) {
  const groups = new Map<string, { name: string; url: string; pages: { label: string; url: string; viewports: string[] }[] }>();
  for (const row of rows.filter((r) => r.valid)) {
    const key = row.client.toLowerCase();
    if (!groups.has(key)) groups.set(key, { name: row.client, url: row.clientUrl, pages: [] });
    groups.get(key)!.pages.push({ label: row.label, url: row.url, viewports: row.viewports });
  }
  return Array.from(groups.values());
}

export default function ImportClientsModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = useMemo(() => parseImport(text), [text]);
  const invalid = rows.filter((r) => !r.valid);
  const clients = useMemo(() => groupImport(rows), [rows]);
  const pageCount = clients.reduce((n, c) => n + c.pages.length, 0);

  return (
    <Modal
      title="Import clients"
      width={640}
      onClose={onClose}
      footer={
        <>
          <button className="vg-btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="vg-btn btn-primary"
            disabled={busy || clients.length === 0}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await post('/api/clients/import', { clients });
                onImported();
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
                setBusy(false);
              }
            }}
          >
            Import {clients.length} client{clients.length === 1 ? '' : 's'} · {pageCount} page{pageCount === 1 ? '' : 's'}
          </button>
        </>
      }
    >
      <label style={{ display: 'block', border: '1.5px dashed var(--ink-6)', borderRadius: 12, padding: 20, textAlign: 'center', background: 'var(--ink-9)', marginBottom: 8, cursor: 'pointer' }}>
        <input
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              setFileName(file.name);
              setText(await file.text());
            }
          }}
        />
        <FileUp size={24} color="var(--ink-4)" style={{ display: 'inline-block' }} />
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)', marginTop: 8 }}>
          {fileName ? `${fileName} · ${rows.length} row${rows.length === 1 ? '' : 's'} parsed` : 'Choose a CSV / text file (or paste below)'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-5)', marginTop: 3, lineHeight: 1.6 }}>
          One page per line. Bare URLs work — <code style={{ fontFamily: 'var(--font-mono)' }}>https://site.com.au/pricing</code>
          <br />
          or be explicit: <code style={{ fontFamily: 'var(--font-mono)' }}>Client Name,url-or-path,label?,viewports?</code>
        </div>
      </label>
      <textarea
        className="input input-mono"
        style={{ height: 96, paddingTop: 10, resize: 'vertical', marginBottom: 8 }}
        placeholder={'https://northbridgedental.com.au/\nhttps://northbridgedental.com.au/services\nHarbour Legal,https://harbourlegal.com.au/\nHarbour Legal,/our-team,Our Team,desktop|mobile'}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {clients.length > 0 && (
        <>
          <div className="field-label" style={{ margin: '10px 0 8px' }}>
            Preview — {clients.length} client{clients.length === 1 ? '' : 's'}, {pageCount} page{pageCount === 1 ? '' : 's'}
          </div>
          <div className="vg-scroll" style={{ border: '1px solid var(--ink-7)', borderRadius: 10, overflow: 'auto', maxHeight: 260 }}>
            {clients.map((client) => (
              <div key={client.name} style={{ borderBottom: '1px solid var(--ink-8)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'var(--ink-9)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{client.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-5)', fontFamily: 'var(--font-mono)' }}>{client.url}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-5)', marginLeft: 'auto' }}>{client.pages.length} page{client.pages.length === 1 ? '' : 's'}</span>
                </div>
                {client.pages.map((page, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr auto auto', gap: 12, padding: '7px 14px 7px 26px', fontSize: 12.5, alignItems: 'center' }}>
                    <span style={{ color: 'var(--ink-2)' }}>{page.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.url}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-5)' }}>{page.viewports.join(' · ')}</span>
                    <Check size={14} color="var(--status-success)" />
                  </div>
                ))}
              </div>
            ))}
            {invalid.map((row, i) => (
              <div key={`bad-${i}`} style={{ display: 'flex', gap: 10, padding: '8px 14px', fontSize: 12.5, alignItems: 'center', background: 'rgba(192,50,43,.05)' }}>
                <AlertCircle size={14} color="var(--status-danger)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--status-danger)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{row.raw}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--status-danger)', whiteSpace: 'nowrap' }}>{row.reason}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, fontSize: 12.5, color: 'var(--ink-4)', lineHeight: 1.5 }}>
            <Info size={14} style={{ flex: 'none' }} />
            <span>
              Existing clients are matched by name and topped up; pages a client already tracks are skipped, so re-importing is safe.
              {invalid.length > 0 && ` ${invalid.length} invalid row${invalid.length === 1 ? '' : 's'} will be skipped.`}
            </span>
          </div>
        </>
      )}
      {error && <div style={{ fontSize: 13, color: 'var(--status-danger)', marginTop: 10 }}>{error}</div>}
    </Modal>
  );
}
