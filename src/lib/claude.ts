import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { PNG } from 'pngjs';
import { getDb, getSetting, CAPTURES_DIR } from './db';
import type { Capture, ClaudeAssessment, Page, RunResult } from './types';
import { codeDiffSummary } from './codediff';

const MODEL = 'claude-opus-4-8';

// Claude vision caps out at 2576px on the long edge; full-page captures are
// far taller, so downsample (and re-encode) before sending.
const MAX_EDGE = 2000;

const ASSESSMENT_SCHEMA = {
  type: 'object' as const,
  properties: {
    severity: {
      type: 'string',
      enum: ['intentional', 'minor', 'regression', 'broken'],
      description:
        'intentional = deliberate content/design change; minor = cosmetic drift; regression = something functional or important broke; broken = page is unusable',
    },
    summary: { type: 'string', description: 'One-line summary of what changed' },
    detail: {
      type: 'string',
      description: 'A paragraph explaining the change, its likely cause, and why it matters',
    },
    affected_areas: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short labels for the page areas affected, e.g. "Hero CTA"',
    },
    recommendation: {
      type: 'string',
      enum: ['accept', 'investigate'],
      description: 'accept = safe to promote as new baseline; investigate = keep old baseline and flag',
    },
    reasoning: { type: 'string', description: 'One sentence justifying the recommendation' },
  },
  required: ['severity', 'summary', 'detail', 'affected_areas', 'recommendation', 'reasoning'],
  additionalProperties: false,
};

function scaledPngBase64(rel: string): string | null {
  try {
    const png = PNG.sync.read(fs.readFileSync(path.join(CAPTURES_DIR, rel)));
    const scale = Math.min(1, MAX_EDGE / Math.max(png.width, png.height));
    if (scale === 1) {
      return fs.readFileSync(path.join(CAPTURES_DIR, rel)).toString('base64');
    }
    const w = Math.max(1, Math.round(png.width * scale));
    const h = Math.max(1, Math.round(png.height * scale));
    const out = new PNG({ width: w, height: h });
    for (let y = 0; y < h; y++) {
      const sy = Math.min(png.height - 1, Math.round(y / scale));
      for (let x = 0; x < w; x++) {
        const sx = Math.min(png.width - 1, Math.round(x / scale));
        const si = (sy * png.width + sx) * 4;
        const di = (y * w + x) * 4;
        png.data.copy(out.data, di, si, si + 4);
      }
    }
    return PNG.sync.write(out).toString('base64');
  } catch {
    return null;
  }
}

export async function assessResult(resultId: number, user: string): Promise<ClaudeAssessment> {
  const apiKey = getSetting('anthropic_api_key');
  if (!apiKey) throw new Error('Anthropic API key is not set — add it in Settings.');

  const db = getDb();
  const result = db.prepare('SELECT * FROM run_results WHERE id = ?').get(resultId) as RunResult;
  if (!result?.capture_id) throw new Error('Result has no capture');
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(result.page_id) as Page;
  const capture = db.prepare('SELECT * FROM captures WHERE id = ?').get(result.capture_id) as Capture;

  // Prefer the checkpoint comparison when it exists — it isolates what the update changed.
  const beforeId = result.checkpoint_capture_id ?? result.baseline_capture_id;
  const before = beforeId
    ? (db.prepare('SELECT * FROM captures WHERE id = ?').get(beforeId) as Capture)
    : null;
  if (!before) throw new Error('No baseline or checkpoint capture to compare against');
  const diffImg = result.checkpoint_capture_id ? result.diff_checkpoint_img : result.diff_baseline_img;
  const diffPct = result.checkpoint_capture_id ? result.diff_checkpoint_pct : result.diff_baseline_pct;

  const content: Anthropic.ContentBlockParam[] = [];
  const addImage = (rel: string | null, label: string) => {
    if (!rel) return;
    const data = scaledPngBase64(rel);
    if (!data) return;
    content.push({ type: 'text', text: `${label}:` });
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data } });
  };
  addImage(before.screenshot_path, 'BEFORE (reference)');
  addImage(capture.screenshot_path, 'AFTER (current capture)');
  addImage(diffImg, 'DIFF OVERLAY (changed pixels in magenta)');

  const codeDiff = codeDiffSummary(before, capture);
  content.push({
    type: 'text',
    text:
      `Page: "${page.label}" (${page.url}) · viewport: ${result.viewport} · visual diff: ${diffPct ?? '?'}%\n` +
      `The site belongs to a web agency's client; this comparison follows a maintenance update (plugins/theme/core). ` +
      `Assess whether the change is routine content drift or a regression caused by the update.\n\n` +
      `SOURCE HTML DIFF (truncated):\n${codeDiff.html}\n\nRENDERED DOM DIFF (normalised, truncated):\n${codeDiff.dom}`,
  });

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema: ASSESSMENT_SCHEMA } },
    system:
      'You are a visual-regression triage assistant for a web agency. You compare before/after captures of client sites taken around maintenance updates and judge whether changes are intentional content drift or regressions. Be decisive and concrete; name the specific elements affected.',
    messages: [{ role: 'user', content }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('Assessment was declined by the model.');
  }
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('No assessment returned');
  const parsed = JSON.parse(text.text) as Omit<ClaudeAssessment, 'assessed_at' | 'assessed_by'>;

  const assessment: ClaudeAssessment = {
    ...parsed,
    assessed_at: new Date().toISOString(),
    assessed_by: user,
  };
  db.prepare('UPDATE run_results SET assessment = ? WHERE id = ?').run(
    JSON.stringify(assessment),
    resultId
  );
  return assessment;
}

export async function testAnthropicKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = new Anthropic({ apiKey });
    await client.models.retrieve(MODEL);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
