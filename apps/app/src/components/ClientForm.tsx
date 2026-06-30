'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface ClientInitial {
  name: string;
  primaryUrl: string;
  logoUrl?: string | null;
  notifyEmails: string[];
  lighthouseEnabled: boolean;
  thresholdOverride?: number | null;
  retentionOverride?: number | null;
}

const label = 'mb-2 block text-xs font-semibold text-ink-4';
const input =
  'h-[42px] w-full rounded-[10px] border border-ink-7 bg-ink-10 px-3.5 text-sm text-ink-1 outline-none focus:border-ink-3';

export function ClientForm({
  action,
  initial,
  title,
  submitLabel,
  backHref = '/',
}: {
  action: (formData: FormData) => Promise<void>;
  initial?: ClientInitial;
  title: string;
  submitLabel: string;
  backHref?: string;
}) {
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    try {
      await action(formData);
    } catch (e) {
      if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e;
      // next redirect throws a special error; rethrow it, show others
      if (e && typeof e === 'object' && 'digest' in e && String((e as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) throw e;
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  return (
    <div className="max-w-[560px] px-10 pb-16 pt-6">
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-4 hover:text-ink-1">
        <ChevronLeft size={15} /> Back
      </Link>
      <h1 className="mb-6 text-[26px] font-bold tracking-tight text-ink-1">{title}</h1>

      <form action={onSubmit} className="flex flex-col gap-4">
        <div>
          <label className={label}>CLIENT NAME</label>
          <input name="name" defaultValue={initial?.name} required className={input} placeholder="Northbridge Dental" />
        </div>
        <div>
          <label className={label}>PRIMARY URL</label>
          <input name="primaryUrl" defaultValue={initial?.primaryUrl} required className={`${input} font-mono`} placeholder="https://example.com.au" />
        </div>
        <div>
          <label className={label}>LOGO URL (OPTIONAL)</label>
          <input name="logoUrl" defaultValue={initial?.logoUrl ?? ''} className={input} placeholder="https://…" />
        </div>
        <div>
          <label className={label}>NOTIFY EMAILS (comma or space separated)</label>
          <input name="notifyEmails" defaultValue={initial?.notifyEmails.join(', ')} className={input} placeholder="sara@digitaltreasury.com.au" />
        </div>
        <div className="flex gap-3.5">
          <div className="flex-1">
            <label className={label}>THRESHOLD OVERRIDE %</label>
            <input name="thresholdOverride" type="number" step="0.1" min="0" defaultValue={initial?.thresholdOverride ?? ''} className={input} placeholder="global default" />
          </div>
          <div className="flex-1">
            <label className={label}>RETENTION OVERRIDE (days)</label>
            <input name="retentionOverride" type="number" min="1" defaultValue={initial?.retentionOverride ?? ''} className={input} placeholder="global cap" />
          </div>
        </div>
        <label className="flex items-center gap-3 rounded-[10px] border border-ink-7 bg-ink-10 px-4 py-3">
          <input type="checkbox" name="lighthouseEnabled" defaultChecked={initial?.lighthouseEnabled ?? true} className="h-4 w-4 accent-ink-1" />
          <span className="text-sm font-medium text-ink-1">Run Lighthouse on every capture</span>
        </label>

        {error && (
          <div className="rounded-[10px] border border-[rgba(192,50,43,.3)] bg-[rgba(192,50,43,.08)] px-3.5 py-2.5 text-[13px] text-danger">
            {error}
          </div>
        )}

        <div className="mt-2 flex justify-end gap-2.5">
          <Link href={backHref} className="flex h-10 items-center rounded-[10px] border border-ink-7 bg-ink-10 px-4 text-[13.5px] font-semibold text-ink-1">
            Cancel
          </Link>
          <button type="submit" className="flex h-10 items-center rounded-[10px] bg-ink-0 px-[18px] text-[13.5px] font-semibold text-white transition active:scale-[.98]">
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
