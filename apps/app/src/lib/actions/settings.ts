'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@vigil/db';
import { ASSESSMENT_MODELS } from '@vigil/core';
import { getSettings, setAnthropicKey, getAnthropicKey } from '@/lib/settings';
import { testAnthropicKey } from '@/lib/anthropic';

const MODEL_IDS = ASSESSMENT_MODELS.map((m) => m.id) as readonly string[];

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

/** Update the global, non-secret settings (model, thresholds, retention, from-address). */
export async function updateGlobalSettings(formData: FormData): Promise<ActionResult> {
  const settings = await getSettings();

  const model = String(formData.get('assessmentModel') ?? '').trim();
  const threshold = Number(formData.get('globalThresholdPct'));
  const retention = Number(formData.get('globalRetentionDays'));
  const notifyFrom = String(formData.get('notifyFrom') ?? '').trim();

  if (model && !MODEL_IDS.includes(model)) return { ok: false, error: 'Unknown assessment model.' };
  if (!Number.isFinite(threshold) || threshold < 0) return { ok: false, error: 'Threshold must be 0 or more.' };
  if (!Number.isFinite(retention) || retention < 1) return { ok: false, error: 'Retention must be at least 1 day.' };

  await prisma.settings.update({
    where: { id: settings.id },
    data: {
      assessmentModel: model || settings.assessmentModel,
      globalThresholdPct: threshold,
      globalRetentionDays: Math.round(retention),
      notifyFrom: notifyFrom || null,
    },
  });
  revalidatePath('/settings');
  return { ok: true, message: 'Settings saved.' };
}

/** Encrypt + store the Anthropic API key. Empty string clears it. */
export async function saveAnthropicKey(plaintext: string): Promise<ActionResult> {
  const key = plaintext.trim();
  if (!key) {
    await setAnthropicKey(null);
    revalidatePath('/settings');
    return { ok: true, message: 'API key cleared.' };
  }
  if (!key.startsWith('sk-ant-')) {
    return { ok: false, error: 'That does not look like an Anthropic API key (expected an sk-ant-… value).' };
  }
  await setAnthropicKey(key);
  revalidatePath('/settings');
  return { ok: true, message: 'API key saved (encrypted at rest).' };
}

/**
 * Test connectivity. If `plaintext` is provided test that key; otherwise test
 * the stored key. Uses the currently configured assessment model.
 */
export async function testAnthropicConnection(plaintext: string): Promise<ActionResult> {
  const settings = await getSettings();
  const key = plaintext.trim() || (await getAnthropicKey());
  if (!key) return { ok: false, error: 'No API key to test — enter or save one first.' };
  try {
    await testAnthropicKey(key, settings.assessmentModel);
    return { ok: true, message: `Connected — ${settings.assessmentModel} responded.` };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed.';
    return { ok: false, error: message };
  }
}
