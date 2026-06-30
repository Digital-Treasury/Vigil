import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { env } from './env';

// AES-256-GCM encryption for the Anthropic API key at rest (Scope §12).
// Stored format: base64(iv).base64(authTag).base64(ciphertext). Never logged.

function key(): Buffer {
  if (!env.encryptionKey) {
    throw new Error('ENCRYPTION_KEY is not set — cannot encrypt/decrypt secrets');
  }
  // Accept hex or base64 or any string; derive a stable 32-byte key.
  if (/^[0-9a-fA-F]{64}$/.test(env.encryptionKey)) return Buffer.from(env.encryptionKey, 'hex');
  return createHash('sha256').update(env.encryptionKey).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
}

export function decryptSecret(stored: string): string {
  const [ivB64, tagB64, dataB64] = stored.split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed encrypted secret');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/** Mask a key for display, e.g. sk-ant-···········4f2a. */
export function maskKey(plaintext: string): string {
  if (plaintext.length <= 10) return '••••••••';
  return `${plaintext.slice(0, 6)}${'·'.repeat(20)}${plaintext.slice(-4)}`;
}
