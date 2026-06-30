import 'server-only';
import { prisma, type Capture, type Prisma } from '@vigil/db';
import { getStorage, baselineKey } from '@vigil/storage';

// App-side baseline promotion (mirror of the worker helper) — used when a
// reviewer accepts a capture as the new baseline. Baselines keep their own copies
// of artifacts so retention pruning of captures never deletes referenced bytes.
async function copyKey(from: string, to: string): Promise<string> {
  const s = getStorage();
  const bytes = await s.get(from);
  const ct = (await s.contentType(from)) ?? 'application/octet-stream';
  await s.put(to, bytes, ct);
  return to;
}

export async function promoteCaptureToBaseline(
  capture: Capture,
  approvedById?: string,
): Promise<void> {
  if (capture.status !== 'captured' || !capture.screenshotKey) return;
  const baseline = await prisma.baseline.upsert({
    where: { pageId_viewport: { pageId: capture.pageId, viewport: capture.viewport } },
    create: {
      pageId: capture.pageId,
      viewport: capture.viewport,
      screenshotKey: capture.screenshotKey,
      approvedById: approvedById ?? null,
    },
    update: { approvedById: approvedById ?? null, approvedAt: new Date() },
  });

  const data: Prisma.BaselineUpdateInput = {};
  data.screenshotKey = await copyKey(capture.screenshotKey, baselineKey(baseline.id, capture.viewport, 'screenshot'));
  if (capture.servedHtmlKey)
    data.servedHtmlKey = await copyKey(capture.servedHtmlKey, baselineKey(baseline.id, capture.viewport, 'served-html'));
  if (capture.renderedDomKey)
    data.renderedDomKey = await copyKey(capture.renderedDomKey, baselineKey(baseline.id, capture.viewport, 'rendered-dom'));
  if (capture.renderedDomNormalisedKey)
    data.renderedDomNormalisedKey = await copyKey(
      capture.renderedDomNormalisedKey,
      baselineKey(baseline.id, capture.viewport, 'rendered-dom-normalised'),
    );
  if (capture.lighthouseJson !== null && capture.lighthouseJson !== undefined)
    data.lighthouseJson = capture.lighthouseJson as Prisma.InputJsonValue;

  await prisma.baseline.update({ where: { id: baseline.id }, data });
}
