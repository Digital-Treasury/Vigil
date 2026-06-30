import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageDriver } from './types';

export interface S3DriverConfig {
  endpoint?: string; // e.g. https://<account>.r2.cloudflarestorage.com
  region?: string; // R2: "auto"
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

// S3-compatible driver (Cloudflare R2 etc.). Signs real GET URLs.
// Note: R2 presigned URLs work on the r2.cloudflarestorage.com endpoint only.
export class S3Driver implements StorageDriver {
  private readonly client: S3Client;
  constructor(private readonly cfg: S3DriverConfig) {
    this.client = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region ?? 'auto',
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      forcePathStyle: true,
    });
  }

  async put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.cfg.bucket, Key: key }),
    );
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
  }

  async signedGetUrl(key: string, ttlSeconds = 300): Promise<string | null> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.cfg.bucket, Key: key }),
      { expiresIn: ttlSeconds },
    );
  }

  async contentType(key: string): Promise<string | undefined> {
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.cfg.bucket, Key: key }),
      );
      return res.ContentType;
    } catch {
      return undefined;
    }
  }
}
