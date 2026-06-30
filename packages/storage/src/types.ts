export interface StorageDriver {
  /** Store bytes at `key` with a content type. */
  put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void>;
  /** Read bytes at `key`. Throws if missing. */
  get(key: string): Promise<Buffer>;
  /** True if an object exists at `key`. */
  exists(key: string): Promise<boolean>;
  /** Delete an object (no-op if absent). */
  delete(key: string): Promise<void>;
  /**
   * A short-lived signed GET URL, or null if the driver can't sign (LocalDriver).
   * When null, the app serves bytes through an authenticated proxy route instead.
   */
  signedGetUrl(key: string, ttlSeconds?: number): Promise<string | null>;
  /** Content type recorded for a key, if known. */
  contentType(key: string): Promise<string | undefined>;
}
