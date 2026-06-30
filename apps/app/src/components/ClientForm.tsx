'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, CalendarClock } from 'lucide-react';
import { SCHEDULE_PRESETS, describeCron, isValidCron, nextRuns, DEFAULT_TIMEZONE } from '@/lib/schedule';

interface ClientInitial {
  name: string;
  primaryUrl: string;
  logoUrl?: string | null;
  notifyEmails: string[];
  lighthouseEnabled: boolean;
  thresholdOverride?: number | null;
  retentionOverride?: number | null;
  scheduleEnabled?: boolean;
  scheduleCron?: string | null;
  timezone?: string | null;
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
  const tz = initial?.timezone || DEFAULT_TIMEZONE;
  const [schedEnabled, setSchedEnabled] = useState(initial?.scheduleEnabled ?? false);
  const [cron, setCron] = useState(initial?.scheduleCron || '0 2 * * 1');

  const cronValid = isValidCron(cron);
  const cronDesc = cronValid ? describeCron(cron) : null;
  const upcoming = schedEnabled && cronValid ? nextRuns(cron, tz, 3) : [];

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

        {/* Schedule builder */}
        <div className="rounded-[12px] border border-ink-7 bg-ink-10 p-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="scheduleEnabled"
              checked={schedEnabled}
              onChange={(e) => setSchedEnabled(e.target.checked)}
              className="h-4 w-4 accent-ink-1"
            />
            <CalendarClock size={16} className="text-ink-3" />
            <span className="text-sm font-medium text-ink-1">Run on a schedule</span>
            <span className="ml-auto text-[12px] text-ink-5">{tz}</span>
          </label>
          <input type="hidden" name="timezone" value={tz} />
          <input type="hidden" name="scheduleCron" value={cron} />

          {schedEnabled && (
            <div className="mt-3.5 flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {SCHEDULE_PRESETS.map((p) => {
                  const on = p.cron === cron;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setCron(p.cron)}
                      className="rounded-[8px] border px-3 py-1.5 text-[12.5px] font-semibold"
                      style={{
                        background: on ? 'var(--color-ink-1)' : 'var(--color-ink-10)',
                        color: on ? '#fff' : 'var(--color-ink-3)',
                        borderColor: on ? 'var(--color-ink-1)' : 'var(--color-ink-7)',
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <div>
                <label className={label}>CRON PATTERN (5-field)</label>
                <input
                  value={cron}
                  onChange={(e) => setCron(e.target.value)}
                  className={`${input} font-mono ${cronValid ? '' : 'border-danger'}`}
                  placeholder="0 2 * * 1"
                />
              </div>
              {cronValid ? (
                <div className="rounded-[9px] border border-ink-8 bg-ink-9 px-3.5 py-2.5">
                  <div className="text-[12.5px] font-medium text-ink-2">{cronDesc}</div>
                  {upcoming.length > 0 && (
                    <div className="mt-1.5 text-[12px] text-ink-5">
                      Next: {upcoming.map((d) => d.toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: tz })).join(' · ')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[12.5px] text-danger">Not a valid cron pattern.</div>
              )}
            </div>
          )}
        </div>

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
