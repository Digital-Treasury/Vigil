'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface PageInitial {
  label: string;
  url: string;
  viewports: ('desktop' | 'mobile')[];
  maskSelectors: string[];
  waitForSelector?: string | null;
}

const labelCls = 'mb-2 block text-xs font-semibold text-ink-4';
const inputCls =
  'h-[42px] w-full rounded-[10px] border border-ink-7 bg-ink-10 px-3.5 text-sm text-ink-1 outline-none focus:border-ink-3';

export function PageForm({
  action,
  initial,
  title,
  submitLabel,
  backHref,
}: {
  action: (formData: FormData) => Promise<void>;
  initial?: PageInitial;
  title: string;
  submitLabel: string;
  backHref: string;
}) {
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    try {
      await action(formData);
    } catch (e) {
      if (e && typeof e === 'object' && 'digest' in e && String((e as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) throw e;
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  const vp = (k: 'desktop' | 'mobile') => initial?.viewports.includes(k) ?? k === 'desktop';

  return (
    <div className="max-w-[560px] px-10 pb-16 pt-6">
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-4 hover:text-ink-1">
        <ChevronLeft size={15} /> Back
      </Link>
      <h1 className="mb-6 text-[26px] font-bold tracking-tight text-ink-1">{title}</h1>

      <form action={onSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelCls}>LABEL</label>
          <input name="label" defaultValue={initial?.label} required className={inputCls} placeholder="Homepage" />
        </div>
        <div>
          <label className={labelCls}>URL</label>
          <input name="url" defaultValue={initial?.url} required className={`${inputCls} font-mono`} placeholder="https://example.com.au/pricing" />
        </div>
        <div>
          <label className={labelCls}>VIEWPORTS</label>
          <div className="flex gap-2.5">
            {(['desktop', 'mobile'] as const).map((k) => (
              <label key={k} className="flex flex-1 items-center gap-2.5 rounded-[10px] border border-ink-7 bg-ink-10 px-4 py-3 capitalize">
                <input type="checkbox" name={`vp_${k}`} defaultChecked={vp(k)} className="h-4 w-4 accent-ink-1" />
                <span className="text-sm font-medium text-ink-1">{k}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>IGNORE MASK SELECTORS (one CSS selector per line)</label>
          <textarea
            name="maskSelectors"
            defaultValue={initial?.maskSelectors.join('\n')}
            rows={3}
            className="w-full rounded-[10px] border border-ink-7 bg-ink-10 px-3.5 py-2.5 font-mono text-[13px] text-ink-1 outline-none focus:border-ink-3"
            placeholder=".testimonials-carousel&#10;#latest-blog-feed"
          />
        </div>
        <div>
          <label className={labelCls}>WAIT-FOR SELECTOR (optional)</label>
          <input name="waitForSelector" defaultValue={initial?.waitForSelector ?? ''} className={`${inputCls} font-mono`} placeholder=".hero-loaded" />
        </div>

        {error && (
          <div className="rounded-[10px] border border-[rgba(192,50,43,.3)] bg-[rgba(192,50,43,.08)] px-3.5 py-2.5 text-[13px] text-danger">{error}</div>
        )}

        <div className="mt-2 flex justify-end gap-2.5">
          <Link href={backHref} className="flex h-10 items-center rounded-[10px] border border-ink-7 bg-ink-10 px-4 text-[13.5px] font-semibold text-ink-1">Cancel</Link>
          <button type="submit" className="flex h-10 items-center rounded-[10px] bg-ink-0 px-[18px] text-[13.5px] font-semibold text-white transition active:scale-[.98]">{submitLabel}</button>
        </div>
      </form>
    </div>
  );
}
