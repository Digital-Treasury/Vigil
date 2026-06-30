import { LocalDriver } from './local';
import { S3Driver } from './s3';
import type { StorageDriver } from './types';

export * from './types';
export * from './keys';
export { LocalDriver } from './local';
export { S3Driver } from './s3';

let cached: StorageDriver | undefined;

/** Build the configured storage driver from env (memoised). */
export function getStorage(): StorageDriver {
  if (cached) return cached;
  const driver = process.env.STORAGE_DRIVER ?? 'local';

  if (driver === 's3') {
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error('STORAGE_DRIVER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY');
    }
    cached = new S3Driver({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      bucket,
      accessKeyId,
      secretAccessKey,
    });
  } else {
    cached = new LocalDriver(process.env.STORAGE_LOCAL_PATH ?? './storage-data');
  }
  return cached;
}

export const SIGNED_URL_TTL = Number(process.env.SIGNED_URL_TTL ?? '300');
