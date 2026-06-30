import { notFound } from 'next/navigation';
import { prisma, type ViewportKind, type Assessment } from '@vigil/db';
import { getStorage } from '@vigil/storage';
import { asLighthouse } from '@vigil/core';
import { DiffReview } from '@/components/DiffReview';
import { acceptBaseline, keepAndFlag, addMask } from '@/lib/actions/review';
import { assessComparison, type AssessmentView } from '@/lib/actions/assess';

export const dynamic = 'force-dynamic';

const blob = (key?: string | null) => (key ? `/api/blob?key=${encodeURIComponent(key)}` : null);

function toAssessmentView(a: Assessment | undefined): AssessmentView | null {
  if (!a) return null;
  return {
    model: a.model,
    severity: a.severity,
    confidence: a.confidence,
    summary: a.summary,
    details: a.details,
    affectedAreas: a.affectedAreas,
    recommendation: a.recommendation,
    recommendationReason: a.recommendationReason,
    createdAt: a.createdAt.toISOString(),
  };
}

async function readDiff(key?: string | null): Promise<string> {
  if (!key) return '';
  try {
    const bytes = await getStorage().get(key);
    return bytes.toString('utf8').slice(0, 200_000);
  } catch {
    return '';
  }
}

export default async function DiffReviewPage({
  params,
}: {
  params: Promise<{ runId: string; pageId: string; viewport: string }>;
}) {
  const { runId, pageId, viewport: vpParam } = await params;
  const viewport = vpParam as ViewportKind;

  const run = await prisma.run.findUnique({ where: { id: runId }, include: { client: true } });
  if (!run) notFound();
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) notFound();

  const [capture, comparisons, baseline] = await Promise.all([
    prisma.capture.findFirst({
      where: { runId, pageId, viewport, status: 'captured' },
      orderBy: { capturedAt: 'desc' },
    }),
    prisma.comparison.findMany({ where: { runId, pageId, viewport } }),
    prisma.baseline.findUnique({ where: { pageId_viewport: { pageId, viewport } } }),
  ]);
  if (!capture) notFound();

  const baselineComp = comparisons.find((c) => c.kind === 'baseline_vs_capture');
  const checkpointComp = comparisons.find((c) => c.kind === 'checkpoint_vs_capture');
  const checkpointCapture = run.checkpointId
    ? await prisma.capture.findFirst({
        where: { checkpointId: run.checkpointId, pageId, viewport, status: 'captured' },
      })
    : null;

  const assessments = await prisma.assessment.findMany({
    where: { comparisonId: { in: comparisons.map((c) => c.id) } },
  });
  const assessmentByComp = new Map(assessments.map((a) => [a.comparisonId, a]));

  const baselineBlock = baselineComp
    ? {
        comparisonId: baselineComp.id,
        pct: baselineComp.changedPixelPct,
        beforeUrl: blob(baseline?.screenshotKey),
        afterUrl: blob(capture.screenshotKey),
        diffUrl: blob(baselineComp.diffImageKey),
        htmlDiff: await readDiff(baselineComp.sourceHtmlDiffKey),
        domDiff: await readDiff(baselineComp.domDiffKey),
        assessment: toAssessmentView(assessmentByComp.get(baselineComp.id)),
      }
    : null;

  const checkpointBlock = checkpointComp
    ? {
        comparisonId: checkpointComp.id,
        pct: checkpointComp.changedPixelPct,
        beforeUrl: blob(checkpointCapture?.screenshotKey),
        afterUrl: blob(capture.screenshotKey),
        diffUrl: blob(checkpointComp.diffImageKey),
        htmlDiff: await readDiff(checkpointComp.sourceHtmlDiffKey),
        domDiff: await readDiff(checkpointComp.domDiffKey),
        assessment: toAssessmentView(assessmentByComp.get(checkpointComp.id)),
      }
    : null;

  const threeUp =
    baseline?.screenshotKey && checkpointCapture?.screenshotKey && capture.screenshotKey
      ? {
          baselineUrl: blob(baseline.screenshotKey)!,
          checkpointUrl: blob(checkpointCapture.screenshotKey)!,
          captureUrl: blob(capture.screenshotKey)!,
        }
      : null;

  // next unreviewed unit in this run (flagged primary still pending)
  const allComps = await prisma.comparison.findMany({
    where: { runId },
    include: { page: true },
    orderBy: { createdAt: 'asc' },
  });
  const seen = new Set<string>();
  let nextHref: string | null = null;
  for (const c of allComps) {
    const k = `${c.pageId}_${c.viewport}`;
    if (seen.has(k) || (c.pageId === pageId && c.viewport === viewport)) {
      seen.add(k);
      continue;
    }
    seen.add(k);
    if (c.flagged && c.status === 'pending') {
      nextHref = `/runs/${runId}/review/${c.pageId}/${c.viewport}`;
      break;
    }
  }

  return (
    <DiffReview
      data={{
        runId,
        pageId,
        viewport,
        clientName: run.client.name,
        pageLabel: page.label,
        pageUrl: page.url,
        capturedAt: capture.capturedAt.toISOString(),
        isMaintenance: !!run.checkpointId,
        baseline: baselineBlock,
        checkpoint: checkpointBlock,
        threeUp,
        nextHref,
        lighthouse: {
          current: asLighthouse(capture.lighthouseJson),
          baseline: asLighthouse(baseline?.lighthouseJson),
        },
      }}
      onAccept={acceptBaseline.bind(null, runId, pageId, viewport)}
      onFlag={keepAndFlag.bind(null, runId, pageId, viewport)}
      onAddMask={addMask.bind(null, pageId)}
      onAssess={assessComparison}
    />
  );
}
