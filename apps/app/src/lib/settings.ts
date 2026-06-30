import 'server-only';
import { prisma, type Settings } from '@vigil/db';
import { env } from './env';
import { decryptSecret, encryptSecret } from './crypto';

// The Settings singleton. Seeded from env defaults on first access.
export async function getSettings(): Promise<Settings> {
  const existing = await prisma.settings.findFirst();
  if (existing) return existing;
  return prisma.settings.create({
    data: {
      assessmentModel: env.defaultAssessmentModel,
      globalThresholdPct: env.defaultThresholdPct,
      globalRetentionDays: env.defaultRetentionDays,
      notifyFrom: env.notifyFrom,
    },
  });
}

/** Decrypted Anthropic key, or null if unset. */
export async function getAnthropicKey(): Promise<string | null> {
  const s = await getSettings();
  if (!s.anthropicApiKeyEnc) return null;
  try {
    return decryptSecret(s.anthropicApiKeyEnc);
  } catch {
    return null;
  }
}

export async function setAnthropicKey(plaintext: string | null): Promise<void> {
  const s = await getSettings();
  await prisma.settings.update({
    where: { id: s.id },
    data: { anthropicApiKeyEnc: plaintext ? encryptSecret(plaintext) : null },
  });
}
