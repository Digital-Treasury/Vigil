'use server';

import { revalidatePath } from 'next/cache';
import { prisma, type ViewportKind } from '@vigil/db';
import { currentUser } from '@/lib/session';
import { promoteCaptureToBaseline } from '@/lib/baseline';

async function unitContext(runId: string, pageId: string, viewport: ViewportKind) {
  const [run, capture, comparisons] = await Promise.all([
    prisma.run.findUnique({ where: { id: runId } }),
    prisma.capture.findFirst({
      where: { runId, pageId, viewport, status: 'captured' },
      orderBy: { capturedAt: 'desc' },
    }),
    prisma.comparison.findMany({ where: { runId, pageId, viewport } }),
  ]);
  return { run, capture, comparisons };
}

function revalidateUnit(run: { clientId: string }, runId: string) {
  revalidatePath(`/runs/${runId}`);
  revalidatePath('/');
  revalidatePath(`/clients/${run.clientId}`);
  revalidatePath('/investigations');
}

/** Accept the run's capture as the new baseline for this page × viewport. */
export async function acceptBaseline(runId: string, pageId: string, viewport: ViewportKind) {
  const { run, capture, comparisons } = await unitContext(runId, pageId, viewport);
  if (!run || !capture) return;
  const user = await currentUser();
  await promoteCaptureToBaseline(capture, user?.id);

  await prisma.comparison.updateMany({
    where: { id: { in: comparisons.map((c) => c.id) } },
    data: { status: 'accepted', flagged: false },
  });
  // resolve any open investigations for these comparisons
  await prisma.investigation.updateMany({
    where: { comparisonId: { in: comparisons.map((c) => c.id) }, status: 'open' },
    data: { status: 'resolved', resolvedById: user?.id ?? null, resolvedAt: new Date() },
  });
  revalidateUnit(run, runId);
}

/** Keep the old baseline; flag the primary comparison for investigation. */
export async function keepAndFlag(
  runId: string,
  pageId: string,
  viewport: ViewportKind,
  note?: string,
) {
  const { run, comparisons } = await unitContext(runId, pageId, viewport);
  if (!run) return;
  const user = await currentUser();

  // primary = checkpoint comparison during maintenance, else baseline comparison
  const primary =
    comparisons.find((c) => c.kind === 'checkpoint_vs_capture') ??
    comparisons.find((c) => c.kind === 'baseline_vs_capture') ??
    comparisons[0];
  if (!primary) return;

  await prisma.comparison.update({ where: { id: primary.id }, data: { status: 'flagged', flagged: true } });
  await prisma.investigation.upsert({
    where: { comparisonId: primary.id },
    create: {
      comparisonId: primary.id,
      clientId: run.clientId,
      pageId,
      viewport,
      status: 'open',
      notes: note?.trim() || null,
      flaggedById: user?.id ?? null,
    },
    update: { status: 'open', notes: note?.trim() || undefined },
  });
  revalidateUnit(run, runId);
}

/** Add a CSS selector to the page's ignore mask (applies to future runs). */
export async function addMask(pageId: string, selector: string, runId?: string) {
  const sel = selector.trim();
  if (!sel) return;
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) return;
  if (!page.maskSelectors.includes(sel)) {
    await prisma.page.update({
      where: { id: pageId },
      data: { maskSelectors: { set: [...page.maskSelectors, sel] } },
    });
  }
  if (runId) revalidatePath(`/runs/${runId}`);
  revalidatePath(`/clients/${page.clientId}/pages/${pageId}`);
}
