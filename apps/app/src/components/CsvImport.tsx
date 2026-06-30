'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileUp, Check, AlertCircle, X, Info, Loader2 } from 'lucide-react';
import { parsePagesCsv, type CsvParseResult } from '@vigil/core';
import { importPagesCsv } from '@/lib/actions/pages';

export function CsvImport({ clientId, primaryUrl }: { clientId: string; primaryUrl: string }) {
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [filename, setFilename] = useState('');
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  async function onFile(file: File) {
    const text = await file.text();
    setCsv(text);
    setFilename(file.name);
    setResult(parsePagesCsv(text, primaryUrl));
  }

  function close() {
    setOpen(false);
    setCsv('');
    setFilename('');
    setResult(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-[9px] border border-ink-7 bg-ink-10 px-[13px] text-[13px] font-semibold text-ink-1"
      >
        <Upload size={15} /> Import CSV
      </button>

      {open && (
        <div onClick={close} className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,10,10,.58)] p-6">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-ink-10 shadow-[0_12px_40px_rgba(10,10,10,.1)]">
            <div className="flex items-center justify-between border-b border-ink-8 px-6 py-5">
              <h3 className="m-0 text-[18px] font-bold tracking-tight text-ink-1">Import pages from CSV</h3>
              <button onClick={close} className="text-ink-5 hover:text-ink-2"><X size={18} /></button>
            </div>

            <div className="px-6 py-[22px]">
              <label className="mb-2 block cursor-pointer rounded-xl border-[1.5px] border-dashed border-ink-6 bg-ink-9 px-6 py-6 text-center">
                <FileUp className="mx-auto text-ink-4" size={26} />
                <div className="mt-2 text-[13.5px] font-semibold text-ink-2">
                  {filename ? `${filename} · ${result?.rows.length ?? 0} rows parsed` : 'Choose a CSV file'}
                </div>
                <div className="mt-1 text-xs text-ink-5">
                  Expected — <code className="font-mono">label,url,viewports?</code>
                </div>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                />
              </label>

              {result && (
                <>
                  <div className="mb-2 mt-4 text-xs font-semibold text-ink-4">PREVIEW</div>
                  <div className="overflow-hidden rounded-[10px] border border-ink-7">
                    <div className="grid grid-cols-[1fr_1.6fr_auto] gap-3 border-b border-ink-7 bg-ink-9 px-3.5 py-2 text-[11px] font-semibold uppercase text-ink-5">
                      <span>Label</span><span>URL</span><span />
                    </div>
                    <div className="max-h-[240px] overflow-y-auto">
                      {result.rows.map((r, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[1fr_1.6fr_auto] items-center gap-3 border-b border-ink-8 px-3.5 py-2 text-[13px] last:border-0"
                          style={{ background: r.valid ? undefined : 'rgba(192,50,43,.05)' }}
                        >
                          <span className="truncate text-ink-2">{r.label || '—'}</span>
                          <span className="truncate font-mono text-[12px]" style={{ color: r.valid ? 'var(--color-ink-4)' : '#C0322B' }}>
                            {r.valid ? r.url : `${r.url || '(empty)'} (${r.error})`}
                          </span>
                          {r.valid ? (
                            <Check size={15} className="text-pass" />
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-danger">
                              <AlertCircle size={14} /> invalid
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-ink-4">
                    <Info size={14} /> {result.validCount} valid · {result.invalidCount} invalid will be skipped.
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2.5 border-t border-ink-8 px-6 py-4">
              <button onClick={close} className="h-10 rounded-[10px] border border-ink-7 bg-ink-10 px-4 text-[13.5px] font-semibold text-ink-1">Cancel</button>
              <button
                disabled={!result || result.validCount === 0 || pending}
                onClick={() =>
                  start(async () => {
                    await importPagesCsv(clientId, csv);
                    router.refresh();
                    close();
                  })
                }
                className="flex h-10 items-center gap-2 rounded-[10px] bg-ink-0 px-[18px] text-[13.5px] font-semibold text-white disabled:opacity-50"
              >
                {pending && <Loader2 size={14} className="animate-spin" />}
                Import {result?.validCount ?? 0} pages
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
