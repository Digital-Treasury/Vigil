import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import { ASSESSMENT_JSON_SCHEMA, parseAssessment, type AssessmentResult } from '@vigil/core';

const PROMPT = `You are reviewing a flagged visual + code regression on a client website for a web agency.
You are given three images — BEFORE (the accepted-good reference), AFTER (the new capture), and a DIFF
overlay (changed pixels painted magenta) — plus a concise summary of the source-HTML and normalised-DOM
changes. Decide how serious the change is and what the team should do.

Severity guidance:
- intentional_change: a deliberate content/design update, not a defect.
- cosmetic_minor: a small visual shift unlikely to matter (spacing, minor copy).
- likely_regression: something probably broke (missing/moved CTA, broken layout, lost styling).
- broken: a major failure (blank/erroring section, collapsed layout, critical element gone).

Recommend accept_new_baseline only when the change is clearly intended or harmless; otherwise
keep_and_investigate. The human always makes the final call. Report via the tool.`;

async function downscaleToJpegB64(buf: Buffer): Promise<string> {
  const jpeg = await sharp(buf)
    .resize({ width: 1024, withoutEnlargement: true })
    .jpeg({ quality: 78 })
    .toBuffer();
  return jpeg.toString('base64');
}

function imageBlock(b64: string) {
  return { type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: b64 } };
}

export interface AssessmentInput {
  apiKey: string;
  model: string;
  beforePng: Buffer;
  afterPng: Buffer;
  diffPng: Buffer;
  diffSummary: string;
}

/** Call the Anthropic Messages API with a forced tool call for strict structured output. */
export async function callClaudeAssessment(
  input: AssessmentInput,
): Promise<{ result: AssessmentResult; raw: unknown }> {
  const client = new Anthropic({ apiKey: input.apiKey });
  const [before, after, diff] = await Promise.all([
    downscaleToJpegB64(input.beforePng),
    downscaleToJpegB64(input.afterPng),
    downscaleToJpegB64(input.diffPng),
  ]);

  const res = await client.messages.create({
    model: input.model,
    max_tokens: 1024,
    tools: [
      {
        name: 'report_assessment',
        description: 'Report the structured severity assessment and recommendation for the flagged change.',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        input_schema: ASSESSMENT_JSON_SCHEMA as any,
      },
    ],
    tool_choice: { type: 'tool', name: 'report_assessment' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Image 1 = BEFORE. Image 2 = AFTER. Image 3 = DIFF overlay (magenta = changed pixels).' },
          imageBlock(before),
          imageBlock(after),
          imageBlock(diff),
          { type: 'text', text: `${PROMPT}\n\nCode change summary:\n${input.diffSummary}` },
        ],
      },
    ],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolUse = (res.content as any[]).find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Claude did not return a structured assessment');
  return { result: parseAssessment(toolUse.input), raw: res };
}

/** Lightweight connectivity + key check for Settings → Test connection. */
export async function testAnthropicKey(apiKey: string, model: string): Promise<boolean> {
  const client = new Anthropic({ apiKey });
  await client.messages.create({
    model,
    max_tokens: 4,
    messages: [{ role: 'user', content: 'ping' }],
  });
  return true;
}
