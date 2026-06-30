import { Resend } from 'resend';
import { prisma } from '@vigil/db';
import { env } from './env.js';

export interface RunSummaryCounts {
  passed: number;
  changes: number;
  broken: number;
  failed: number;
  total: number;
}

interface RunNotification {
  runId: string;
  clientName: string;
  notifyEmails: string[];
  isMaintenance: boolean;
  summary: RunSummaryCounts;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function row(label: string, count: number, color: string): string {
  if (count <= 0) return '';
  return `<tr>
    <td style="padding:4px 0;font:14px -apple-system,Segoe UI,Roboto,sans-serif;color:#4a4a4a;">
      <span style="display:inline-block;width:9px;height:9px;border-radius:9px;background:${color};margin-right:9px;"></span>${label}
    </td>
    <td style="padding:4px 0;text-align:right;font:600 14px -apple-system,Segoe UI,Roboto,sans-serif;color:#0a0a0a;">${count}</td>
  </tr>`;
}

function buildEmail(n: RunNotification, url: string): { subject: string; html: string } {
  const { clientName, isMaintenance, summary } = n;
  const needsReview = summary.changes + summary.broken + summary.failed > 0;

  const kind = isMaintenance ? 'Maintenance run' : 'Run';
  const subject = needsReview
    ? `${clientName}: changes found — ${summary.changes + summary.broken} to review`
    : `${clientName}: ${kind.toLowerCase()} complete — all clear`;

  const headline = needsReview
    ? `Changes found on ${esc(clientName)}`
    : `${esc(clientName)} — ${esc(kind.toLowerCase())} complete`;
  const lede = needsReview
    ? `Vigil flagged differences that need a human decision before they reach the client.`
    : isMaintenance
      ? `The maintenance run finished with no flagged changes against the checkpoint or baseline.`
      : `The run finished with no flagged changes.`;

  const html = `<!doctype html><html><body style="margin:0;background:#f8f8f8;padding:28px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e6e6e6;border-radius:14px;">
    <tr><td style="padding:26px 28px 0;">
      <div style="font:600 12px -apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#9a9a9a;">Vigil</div>
      <h1 style="margin:8px 0 6px;font:700 21px -apple-system,Segoe UI,Roboto,sans-serif;color:#0a0a0a;">${headline}</h1>
      <p style="margin:0 0 18px;font:14px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#6b6b6b;">${lede}</p>
    </td></tr>
    <tr><td style="padding:0 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f2f2f2;border-bottom:1px solid #f2f2f2;padding:6px 0;">
        ${row('Passed', summary.passed, '#1a8f5f')}
        ${row('Changes', summary.changes, '#b47a12')}
        ${row('Likely broken', summary.broken, '#c0322b')}
        ${row('Capture failed', summary.failed, '#992822')}
      </table>
    </td></tr>
    <tr><td style="padding:22px 28px 28px;">
      <a href="${url}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;font:600 14px -apple-system,Segoe UI,Roboto,sans-serif;padding:11px 20px;border-radius:10px;">Open run report →</a>
      <p style="margin:16px 0 0;font:12px -apple-system,Segoe UI,Roboto,sans-serif;color:#9a9a9a;">${summary.total} page-viewport${summary.total === 1 ? '' : 's'} captured.</p>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html };
}

/**
 * Send the run-completion notification (Scope §4.7). Two variants — "changes
 * found" and "complete / all clear". Clean routine runs are skipped to avoid
 * noise; maintenance runs always notify so the team knows they finished.
 * Never throws — email failure must not fail the run.
 */
export async function sendRunNotification(n: RunNotification): Promise<void> {
  if (!env.resendApiKey) {
    console.warn('[email] RESEND_API_KEY unset — skipping run notification');
    return;
  }
  if (n.notifyEmails.length === 0) return;

  const needsReview = n.summary.changes + n.summary.broken + n.summary.failed > 0;
  if (!needsReview && !n.isMaintenance) return;

  const from = (await prisma.settings.findFirst())?.notifyFrom ?? env.notifyFrom;
  const url = `${env.appUrl}/runs/${n.runId}`;
  const { subject, html } = buildEmail(n, url);

  try {
    const resend = new Resend(env.resendApiKey);
    await resend.emails.send({ from, to: n.notifyEmails, subject, html });
    console.log(`[email] sent "${subject}" to ${n.notifyEmails.length} recipient(s)`);
  } catch (err) {
    console.error('[email] send failed:', (err as Error).message);
  }
}
