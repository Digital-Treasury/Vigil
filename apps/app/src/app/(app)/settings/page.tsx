import { getSettings, getAnthropicKey } from '@/lib/settings';
import { maskKey } from '@/lib/crypto';
import { env } from '@/lib/env';
import { SettingsForm } from '@/components/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const s = await getSettings();
  const apiKey = await getAnthropicKey();

  return (
    <div className="max-w-[680px] px-10 pb-16 pt-[34px]">
      <div className="dt-eyebrow mb-2">Global</div>
      <h1 className="mb-[22px] text-[30px] font-bold tracking-tight text-ink-1">Settings</h1>

      <SettingsForm
        initial={{
          assessmentModel: s.assessmentModel,
          globalThresholdPct: s.globalThresholdPct,
          globalRetentionDays: s.globalRetentionDays,
          notifyFrom: s.notifyFrom ?? env.notifyFrom,
          hasApiKey: !!apiKey,
          maskedKey: apiKey ? maskKey(apiKey) : null,
        }}
      />
    </div>
  );
}
