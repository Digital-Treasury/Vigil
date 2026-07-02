import { NextResponse } from 'next/server';
import { handler, requireUser } from '@/lib/api';
import { getDb } from '@/lib/db';
import { startRun } from '@/lib/runner';
import type { Client } from '@/lib/types';

// Fleet-wide run: one run per client that has pages and isn't already running.
// Captures are processed serially by the job queue, so this enqueues the whole
// fleet without hammering client sites.
export const POST = handler(async () => {
  await requireUser();
  const db = getDb();
  const clients = db.prepare('SELECT * FROM clients ORDER BY name').all() as Client[];

  const started: number[] = [];
  let skippedRunning = 0;
  let skippedEmpty = 0;

  for (const client of clients) {
    const pageCount = (
      db.prepare('SELECT COUNT(*) AS n FROM pages WHERE client_id = ?').get(client.id) as { n: number }
    ).n;
    if (pageCount === 0) {
      skippedEmpty++;
      continue;
    }
    const active = db
      .prepare(`SELECT id FROM runs WHERE client_id = ? AND status = 'running' LIMIT 1`)
      .get(client.id);
    if (active) {
      skippedRunning++;
      continue;
    }
    started.push(startRun(client.id, 'manual'));
  }

  return NextResponse.json({
    started: started.length,
    skippedRunning,
    skippedEmpty,
    runIds: started,
  });
});
