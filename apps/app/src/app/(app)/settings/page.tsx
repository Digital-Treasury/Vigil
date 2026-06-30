import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// Minimal settings view for P0 (full editor — API key, model selector,
// test-connection — lands in P6).
export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <div className="max-w-[680px] px-10 pb-16 pt-[34px]">
      <div className="dt-eyebrow mb-2">Global</div>
      <h1 className="mb-[22px] text-[30px] font-bold tracking-tight text-ink-1">Settings</h1>

      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3.5">
          <div className="flex-1 rounded-[14px] border border-ink-7 bg-ink-10 px-6 py-[22px]">
            <div className="mb-1 text-sm font-semibold text-ink-1">Default diff threshold</div>
            <p className="mb-3 text-[12.5px] leading-relaxed text-ink-5">Clients can override this.</p>
            <div className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-ink-7 px-3.5 text-sm font-semibold text-ink-1">
              {s.globalThresholdPct} <span className="font-normal text-ink-5">%</span>
            </div>
          </div>
          <div className="flex-1 rounded-[14px] border border-ink-7 bg-ink-10 px-6 py-[22px]">
            <div className="mb-1 text-sm font-semibold text-ink-1">Retention cap</div>
            <p className="mb-3 text-[12.5px] leading-relaxed text-ink-5">Caps any per-client value.</p>
            <div className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-ink-7 px-3.5 text-sm font-semibold text-ink-1">
              {s.globalRetentionDays} <span className="font-normal text-ink-5">days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
