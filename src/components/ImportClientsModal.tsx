'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Check, Download, FileUp, Info } from 'lucide-react';
import { Modal } from './ui';
import { post } from '@/lib/useApi';
import { downloadCsv } from '@/lib/download';
import { parseImport, groupImport, CLIENT_TEMPLATE } from '@/lib/importParse';

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-5)' }}>
          Fill the template in Excel/Sheets, export as CSV, upload it here.
        </span>
        <button
          className="vg-btn btn-secondary btn-sm"
          onClick={() => downloadCsv('vigil-clients-template.csv', CLIENT_TEMPLATE)}
        >
          <Download size={14} /> Download template
        </button>
      </div>
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
