'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@vigil/db';
import { getStorage } from '@vigil/storage';
import type { RecommendationKey, SeverityKey } from '@vigil/core';
import { currentUser } from '@/lib/session';
import { getAnthropicKey, getSettings } from '@/lib/settings';
import { callClaudeAssessment } from '@/lib/anthropic';
import { summariseUnifiedDiff } from '@/lib/diffsummary';

export interface AssessmentView {
  model: string;
  severity: SeverityKey;
  confidence: number;
  summary: string;
  details: string;
  affectedAreas: string[];
  recommendation: RecommendationKey;
  recommendationReason: string;
  createdAt: string;
}

export type AssessResult =
  | { ok: true; assessment: AssessmentView }
  | { ok: false; error: string };

async function readBytes(key?: string | null): Promise<Buffer | null> {
  if (!key) return null;
  try {
    return await getStorage().get(key);
  } catch {
    return null;
  }
}

async function readText(key?: string | null): Promise<string> {
  const bytes = await readBytes(key);
  return bytes ? bytes.toString('utf8').slice(0, 200_000) : '';
}

/**
 * Run a manual Claude severity assessment for one comparison (Scope §4.6).
 * Loads the before/after/diff images + the HTML/DOM diffs, sends a concise
 * multimodal prompt to the configured vision model, persists the strict-JSON
 * result, and returns it for immediate render. The human always decides.
 */
export async function assessComparison(comparisonId: string): Promise<AssessResult> {
  const comparison = await prisma.comparison.findUnique({
    where: { id: comparisonId },
    include: { toCapture: true, fromCapture: true },
  });
  if (!comparison) return { ok: false, error: 'Comparison not found.' };

  const apiKey = await getAnthropicKey();
  if (!apiKey) {
    return { ok: false, error: 'No Anthropic API key set. Add one in Settings first.' };
  }
  const settings = await getSettings();
  const model = settings.assessmentModel;

  // Resolve the "before" screenshot: a baseline or the checkpoint capture.
  let beforeKey: string | null = null;
  if (comparison.kind === 'baseline_vs_capture') {
    if (comparison.fromBaselineId) {
      const baseline = await prisma.baseline.findUnique({ where: { id: comparison.fromBaselineId } });
      beforeKey = baseline?.screenshotKey ?? null;
    }
  } else {
    beforeKey = comparison.fromCapture?.screenshotKey ?? null;
  }

  const [beforePng, afterPng, diffPng] = await Promise.all([
    readBytes(beforeKey),
    readBytes(comparison.toCapture?.screenshotKey),
    readBytes(comparison.diffImageKey),
  ]);
  if (!beforePng || !afterPng) {
    return { ok: false, error: 'Before/after screenshots are unavailable for this comparison.' };
  }
  if (!diffPng) {
    return { ok: false, error: 'No diff image for this comparison — nothing to assess.' };
  }

  const [htmlDiff, domDiff] = await Promise.all([
    readText(comparison.sourceHtmlDiffKey),
    readText(comparison.domDiffKey),
  ]);
  const diffSummary = [
    summariseUnifiedDiff('Source HTML', htmlDiff),
    summariseUnifiedDiff('Rendered DOM (normalised)', domDiff),
  ].join('\n\n');

  let result;
  try {
    ({ result } = await callClaudeAssessment({ apiKey, model, beforePng, afterPng, diffPng, diffSummary }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Assessment request failed.';
    return { ok: false, error: message };
  }

  const user = await currentUser();
  const saved = await prisma.assessment.upsert({
    where: { comparisonId },
    create: {
      comparisonId,
      model,
      severity: result.severity,
      confidence: result.confidence,
      summary: result.summary,
      details: result.details,
      affectedAreas: result.affected_areas,
      recommendation: result.recommendation,
      recommendationReason: result.recommendation_reason,
      createdById: user?.id ?? null,
    },
    update: {
      model,
      severity: result.severity,
      confidence: result.confidence,
      summary: result.summary,
      details: result.details,
      affectedAreas: result.affected_areas,
      recommendation: result.recommendation,
      recommendationReason: result.recommendation_reason,
      createdById: user?.id ?? null,
    },
  });

  revalidatePath(`/runs/${comparison.runId}/review/${comparison.pageId}/${comparison.viewport}`);

  return {
    ok: true,
    assessment: {
      model: saved.model,
      severity: saved.severity,
      confidence: saved.confidence,
      summary: saved.summary,
      details: saved.details,
      affectedAreas: saved.affectedAreas,
      recommendation: saved.recommendation,
      recommendationReason: saved.recommendationReason,
      createdAt: saved.createdAt.toISOString(),
    },
  };
}
