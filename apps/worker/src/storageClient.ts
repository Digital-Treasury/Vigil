import { getStorage } from '@vigil/storage';

export const storage = getStorage();

export async function getText(key: string): Promise<string> {
  return (await storage.get(key)).toString('utf8');
}

export async function putBuffer(key: string, body: Buffer, contentType: string) {
  await storage.put(key, body, contentType);
  return key;
}

export async function putText(key: string, text: string, contentType = 'text/plain; charset=utf-8') {
  await storage.put(key, Buffer.from(text, 'utf8'), contentType);
  return key;
}

export async function putJson(key: string, value: unknown) {
  await storage.put(key, Buffer.from(JSON.stringify(value), 'utf8'), 'application/json');
  return key;
}

/** Copy one stored object to a new key (used to give baselines their own copies). */
export async function copyKey(fromKey: string, toKey: string): Promise<string> {
  const bytes = await storage.get(fromKey);
  const ct = (await storage.contentType(fromKey)) ?? 'application/octet-stream';
  await storage.put(toKey, bytes, ct);
  return toKey;
}
