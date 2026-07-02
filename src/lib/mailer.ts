import nodemailer from 'nodemailer';
import { getDb, getSetting } from './db';
import type { Client, Run, RunResult } from './types';

function smtpConfigured(): boolean {
  return !!process.env.SMTP_HOST;
}

function transport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === '1',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

const LOGO_SVG = `<svg viewBox="0 0 107.72 53.86" width="20" xmlns="http://www.w3.org/2000/svg"><path d="m0,0h26.93C41.79,0,53.86,12.07,53.86,26.93h0c0,14.86-12.07,26.93-26.93,26.93H0V0H0Z" fill="#0A0A0A"/><rect x="53.86" width="53.86" height="19.84" fill="#0A0A0A"/></svg>`;

export function renderRunEmail(opts: {
  clientName: string;
  passed: number;
  changes: number;
  broken: number;
  errors: number;
  finishedAt: string;
  reviewUrl: string;
  maintenance: boolean;
}): { subject: string; html: string } {
  const flagged = opts.changes + opts.broken;
  const subject = opts.maintenance
    ? `Vigil — ${opts.clientName}: maintenance run complete${flagged ? ` · ${flagged} page${flagged === 1 ? '' : 's'} changed` : ''}`
    : flagged
      ? `Vigil — ${opts.clientName}: ${flagged} page${flagged === 1 ? '' : 's'} changed`
      : `Vigil — ${opts.clientName}: all pages passed`;

  const pill = (dot: string, text: string, color = '#1A1A1A', bg = '#F8F8F8') =>
    `<span style="display:inline-block;font:600 13px Inter,Arial,sans-serif;color:${color};background:${bg};padding:6px 12px;border-radius:8px;margin:0 4px">` +
    `<span style="display:inline-block;width:7px;height:7px;border-radius:99px;background:${dot};margin-right:6px"></span>${text}</span>`;

  const headline = flagged
    ? `${flagged} of ${opts.passed + flagged + opts.errors} pages have changes`
    : `All ${opts.passed} pages passed`;

  const html = `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#F8F8F8">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #E6E6E6;border-radius:12px;overflow:hidden;font-family:Inter,Arial,sans-serif">
    <div style="padding:28px 28px 24px;text-align:center">
      <div style="padding:4px 0 20px">${LOGO_SVG}<span style="font:700 16px Inter,Arial,sans-serif;color:#0A0A0A;letter-spacing:-.02em;vertical-align:top;margin-left:8px">Vigil</span></div>
      <h2 style="font:700 19px Inter,Arial,sans-serif;color:#0A0A0A;margin:0 0 6px;letter-spacing:-.01em">${headline}</h2>
      <p style="font:400 13.5px/1.55 Inter,Arial,sans-serif;color:#6B6B6B;margin:0 0 22px">${opts.clientName} · run finished ${opts.finishedAt}.${flagged ? '<br>Pages over threshold are awaiting your review.' : ''}</p>
      <div style="margin-bottom:24px">
        ${pill('#1A8F5F', `${opts.passed} passed`)}
        ${pill('#B47A12', `${opts.changes} changes`, '#7A5208', 'rgba(180,122,18,.10)')}
        ${pill(opts.broken ? '#C0322B' : '#9A9A9A', `${opts.broken} broken`, opts.broken ? '#992822' : '#6B6B6B')}
        ${opts.errors ? pill('#C0322B', `${opts.errors} capture failed`, '#992822', 'rgba(192,50,43,.07)') : ''}
      </div>
      <a href="${opts.reviewUrl}" style="display:block;font:600 14px Inter,Arial,sans-serif;background:#0A0A0A;color:#fff;text-decoration:none;padding:15px 0;border-radius:10px">Review run →</a>
    </div>
    <div style="border-top:1px solid #F2F2F2;padding:14px 28px;text-align:center">
      <span style="font:400 11px Inter,Arial,sans-serif;color:#9A9A9A">Digital Treasury · you're on the ${opts.clientName} notify list</span>
    </div>
  </div></body></html>`;

  return { subject, html };
}

export async function sendRunEmail(runId: number) {
  const db = getDb();
  const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as Run;
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(run.client_id) as Client;
  const results = db.prepare('SELECT * FROM run_results WHERE run_id = ?').all(runId) as RunResult[];

  const tally = {
    passed: results.filter((r) => r.status === 'passed').length,
    changes: results.filter((r) => r.status === 'changes').length,
    broken: results.filter((r) => r.status === 'broken').length,
    errors: results.filter((r) => r.status === 'error').length,
  };

  const recipients = (JSON.parse(client.notify_emails || '[]') as string[]).filter(Boolean);
  const onlyOnChanges = getSetting('notify_only_on_changes') === '1';
  const flagged = tally.changes + tally.broken + tally.errors;
  if (recipients.length === 0) return;
  if (onlyOnChanges && flagged === 0 && run.trigger !== 'maintenance') return;
  if (!smtpConfigured()) {
    console.log(`[vigil] SMTP not configured — skipping email for run ${runId}`);
    return;
  }

  const base = process.env.APP_URL || 'http://localhost:3000';
  const { subject, html } = renderRunEmail({
    clientName: client.name,
    ...tally,
    finishedAt: new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Melbourne',
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date()),
    reviewUrl: `${base}/runs/${runId}`,
    maintenance: run.trigger === 'maintenance',
  });

  await transport().sendMail({
    from: getSetting('notify_from'),
    to: recipients.join(', '),
    subject,
    html,
  });
  db.prepare('UPDATE runs SET email_sent = 1 WHERE id = ?').run(runId);
}

export async function testSmtp(): Promise<{ ok: boolean; error?: string }> {
  if (!smtpConfigured()) return { ok: false, error: 'SMTP_HOST not set' };
  try {
    await transport().verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
