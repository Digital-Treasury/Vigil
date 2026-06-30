import { prisma, type Capture, type Prisma } from '@vigil/db';
import { baselineKey } from '@vigil/storage';
import { copyKey } from './storageClient.js';

// Give a baseline its own copies of a capture's artifacts so retention pruning
// of old captures never deletes bytes a baseline still points at.
async function copyArtifacts(baselineId: string, viewport: string, capture: Capture) {
  const out: Prisma.BaselineUpdateInput = {};
  if (capture.screenshotKey) {
    out.screenshotKey = await copyKey(capture.screenshotKey, baselineKey(baselineId, viewport, 'screenshot'));
  }
  if (capture.servedHtmlKey) {
    out.servedHtmlKey = await copyKey(capture.servedHtmlKey, baselineKey(baselineId, viewport, 'served-html'));
  }
  if (capture.renderedDomKey) {
    out.renderedDomKey = await copyKey(capture.renderedDomKey, baselineKey(baselineId, viewport, 'rendered-dom'));
  }
  if (capture.renderedDomNormalisedKey) {
    out.renderedDomNormalisedKey = await copyKey(
      capture.renderedDomNormalisedKey,
      baselineKey(baselineId, viewport, 'rendered-dom-normalised'),
    );
  }
  if (capture.lighthouseJson !== null && capture.lighthouseJson !== undefined) {
    out.lighthouseJson = capture.lighthouseJson as Prisma.InputJsonValue;
  }
  return out;
}

/** Promote a successful capture to the (page × viewport) baseline. */
export async function promoteToBaseline(capture: Capture, approvedById?: string): Promise<void> {
  if (capture.status !== 'captured' || !capture.screenshotKey) return;
  const baseline = await prisma.baseline.upsert({
    where: { pageId_viewport: { pageId: capture.pageId, viewport: capture.viewport } },
    create: {
      pageId: capture.pageId,
      viewport: capture.viewport,
      screenshotKey: capture.screenshotKey, // replaced below with an owned copy
      approvedById: approvedById ?? null,
    },
    update: { approvedById: approvedById ?? null, approvedAt: new Date() },
  });
  const data = await copyArtifacts(baseline.id, capture.viewport, capture);
  await prisma.baseline.update({ where: { id: baseline.id }, data });
}

/** First successful capture auto-becomes the baseline (Scope §4.4). */
export async function ensureFirstBaseline(capture: Capture): Promise<boolean> {
  if (capture.status !== 'captured') return false;
  const existing = await prisma.baseline.findUnique({
    where: { pageId_viewport: { pageId: capture.pageId, viewport: capture.viewport } },
  });
  if (existing) return false;
  await promoteToBaseline(capture);
  return true;
}
