import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { StorageDriver } from './types';

// Stores objects on a local volume. Cannot sign URLs, so the app serves bytes
// through an authenticated proxy route. A sidecar `.meta` file records the
// content type so the proxy can set the right header.
export class LocalDriver implements StorageDriver {
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    // Prevent path traversal; keys are app-generated but be defensive.
    const safe = path
      .normalize(key)
      .replace(/^(\.\.(\/|\\|$))+/, '')
      .replace(/^[/\\]+/, '');
    const full = path.join(this.root, safe);
    if (!full.startsWith(path.resolve(this.root))) {
      throw new Error(`Refusing to access key outside storage root: ${key}`);
    }
    return full;
  }

  async put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
    await fs.writeFile(`${full}.meta`, contentType, 'utf8');
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    const full = this.resolve(key);
    await fs.rm(full, { force: true });
    await fs.rm(`${full}.meta`, { force: true });
  }

  async signedGetUrl(): Promise<string | null> {
    return null; // served via authenticated proxy
  }

  async contentType(key: string): Promise<string | undefined> {
    try {
      return (await fs.readFile(`${this.resolve(key)}.meta`, 'utf8')).trim();
    } catch {
      return undefined;
    }
  }
}
