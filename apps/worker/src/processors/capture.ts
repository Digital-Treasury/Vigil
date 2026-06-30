import type { Job } from 'bullmq';
import { prisma, type CaptureFailureReason } from '@vigil/db';
import { captureKey } from '@vigil/storage';
import type { CaptureJobData } from '@vigil/core';
import { getBrowser } from '../browser.js';
import { capturePage, CaptureFailure } from '../capture/capture.js';
import { putBuffer, putText } from '../storageClient.js';
import { ensureFirstBaseline, promoteToBaseline } from '../baseline.js';
import { lighthouseQueue } from '../producers.js';

// Screenshot + served-HTML + rendered-DOM(+normalised) pass for one
// (page × viewport). Failures are recorded, never thrown past the job boundary
// (a failed capture must be visible, not fatal to the run).
export async function captureProcessor(job: Job<CaptureJobData>) {
  const { pageId, viewport, runId, checkpointId, promoteBaseline } = job.data;
  const page = await prisma.page.findUnique({ where: { id: pageId }, include: { client: true } });
  if (!page) return { skipped: true };

  try {
    const browser = await getBrowser();
    const art = await capturePage(browser, {
      url: page.url,
      viewport,
      maskSelectors: page.maskSelectors,
      waitForSelector: page.waitForSelector,
    });

    const capture = await prisma.capture.create({
      data: { runId, checkpointId, pageId, viewport, status: 'captured', width: art.width, height: art.height },
    });

    const [screenshotKey, servedHtmlKey, renderedDomKey, renderedDomNormalisedKey] = await Promise.all([
      putBuffer(captureKey(capture.id, viewport, 'screenshot'), art.screenshot, 'image/webp'),
      putText(captureKey(capture.id, viewport, 'served-html'), art.servedHtml, 'text/html; charset=utf-8'),
      putText(captureKey(capture.id, viewport, 'rendered-dom'), art.renderedDom, 'text/html; charset=utf-8'),
      putText(captureKey(capture.id, viewport, 'rendered-dom-normalised'), art.renderedDomNormalised, 'text/html; charset=utf-8'),
    ]);

    const updated = await prisma.capture.update({
      where: { id: capture.id },
      data: { screenshotKey, servedHtmlKey, renderedDomKey, renderedDomNormalisedKey },
    });

    // Explicit re-bless force-promotes; otherwise the first run capture auto-baselines.
    if (promoteBaseline) await promoteToBaseline(updated);
    else if (runId) await ensureFirstBaseline(updated);

    // Lighthouse is decoupled (own queue); run captures only, when enabled.
    if (runId && page.client.lighthouseEnabled) {
      await lighthouseQueue.add(
        'lighthouse',
        { captureId: capture.id, pageId, viewport },
        { removeOnComplete: 200, removeOnFail: 200 },
      );
    }
    return { captureId: capture.id, status: 'captured' as const };
  } catch (e) {
    const reason: CaptureFailureReason = e instanceof CaptureFailure ? e.reason : 'unknown';
    const capture = await prisma.capture.create({
      data: {
        runId,
        checkpointId,
        pageId,
        viewport,
        status: 'failed',
        failureReason: reason,
        failureDetail: (e as Error).message?.slice(0, 500),
      },
    });
    return { captureId: capture.id, status: 'failed' as const };
  }
}
