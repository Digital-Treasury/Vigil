import { spawn } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { storage } from './storageClient.js';
import { env } from './env.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Run pg_dump and return the SQL as a Buffer (plain SQL, owner/priv stripped). */
function pgDump(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn('pg_dump', ['--no-owner', '--no-privileges', url]);
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    proc.stdout.on('data', (d: Buffer) => out.push(d));
    proc.stderr.on('data', (d: Buffer) => err.push(d));
    proc.on('error', (e) =>
      reject(new Error(`pg_dump failed to start (is postgresql-client installed?): ${e.message}`)),
    );
    proc.on('close', (code) =>
      code === 0
        ? resolve(Buffer.concat(out))
        : reject(new Error(`pg_dump exited ${code}: ${Buffer.concat(err).toString().slice(0, 500)}`)),
    );
  });
}

/**
 * Nightly database backup (Scope §13). pg_dump → gzip → storage driver, keyed by
 * weekday so we keep a rolling 7-day window without needing object listing.
 * Restore: `gunzip -c vigil-<Day>.sql.gz | psql "$DATABASE_URL"`.
 */
export async function runDbBackup(): Promise<{ key: string; bytes: number }> {
  if (!env.databaseUrl) throw new Error('DATABASE_URL is not set — cannot back up');
  const sql = await pgDump(env.databaseUrl);
  const gz = gzipSync(sql);
  const weekday = WEEKDAYS[new Date().getDay()];
  const key = `backups/vigil-${weekday}.sql.gz`;
  await storage.put(key, gz, 'application/gzip');
  return { key, bytes: gz.length };
}
