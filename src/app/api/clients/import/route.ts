import { NextResponse } from 'next/server';
import { ApiError, handler, requireUser } from '@/lib/api';
import { getDb } from '@/lib/db';
import type { Client } from '@/lib/types';

interface ImportPage {
  label: string;
  url: string;
  viewports?: string[];
}

interface ImportClient {
  name: string;
  url: string;
  pages: ImportPage[];
}

// Bulk onboarding: creates clients and their pages in one shot.
// Matches existing clients by name (case-insensitive) and skips pages the
// client already tracks, so re-importing an updated list is safe.
export const POST = handler(async (req) => {
  await requireUser();
  const body = await req.json();
  const inputs: ImportClient[] = Array.isArray(body.clients) ? body.clients : [];
  if (!inputs.length) throw new ApiError(400, 'No clients supplied');

  const db = getDb();
  const summary = { clientsCreated: 0, clientsMatched: 0, pagesAdded: 0, pagesSkipped: 0 };

  const insertClient = db.prepare('INSERT INTO clients (name, url, notify_emails) VALUES (?, ?, ?)');
  const insertPage = db.prepare(
    `INSERT INTO pages (client_id, label, url, viewports, sort) VALUES (?, ?, ?, ?, ?)`
  );

  const importAll = db.transaction((clients: ImportClient[]) => {
    for (const input of clients) {
      const name = String(input.name || '').trim();
      let clientUrl = String(input.url || '').trim();
      if (!name || !clientUrl) continue;
      if (!/^https?:\/\//i.test(clientUrl)) clientUrl = `https://${clientUrl}`;

      const existing = db
        .prepare('SELECT * FROM clients WHERE LOWER(name) = LOWER(?)')
        .get(name) as Client | undefined;
      let clientId: number;
      if (existing) {
        clientId = existing.id;
        summary.clientsMatched++;
      } else {
        clientId = Number(insertClient.run(name, clientUrl, '[]').lastInsertRowid);
        summary.clientsCreated++;
      }

      const existingUrls = new Set(
        (db.prepare('SELECT url FROM pages WHERE client_id = ?').all(clientId) as { url: string }[]).map(
          (p) => p.url.replace(/\/+$/, '').toLowerCase()
        )
      );
      let sort = (db.prepare('SELECT COUNT(*) AS n FROM pages WHERE client_id = ?').get(clientId) as { n: number }).n;

      for (const page of input.pages || []) {
        const label = String(page.label || '').trim();
        let url = String(page.url || '').trim();
        if (!label || !url) continue;
        if (url.startsWith('/')) url = clientUrl.replace(/\/+$/, '') + url;
        else if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
        if (existingUrls.has(url.replace(/\/+$/, '').toLowerCase())) {
          summary.pagesSkipped++;
          continue;
        }
        const viewports = (page.viewports || ['desktop']).filter((v) => ['desktop', 'mobile'].includes(v));
        insertPage.run(clientId, label, url, JSON.stringify(viewports.length ? viewports : ['desktop']), sort++);
        existingUrls.add(url.replace(/\/+$/, '').toLowerCase());
        summary.pagesAdded++;
      }
    }
  });
  importAll(inputs);

  return NextResponse.json(summary);
});
