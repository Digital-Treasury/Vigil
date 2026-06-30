import lighthouse from 'lighthouse';
import * as ChromeLauncher from 'chrome-launcher';
import type { LighthouseData } from '@vigil/core';

// Run Lighthouse against a URL on a FRESH Chrome (separate from the screenshot
// pass — sharing a warmed/scrolled page corrupts perf scores). Returns the four
// category scores + key lab metrics, or null on failure.
export async function runLighthouse(url: string): Promise<LighthouseData | null> {
  const chrome = await ChromeLauncher.launch({
    chromePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  });
  try {
    const result = await lighthouse(
      url,
      { port: chrome.port, output: 'json', logLevel: 'error' },
      {
        extends: 'lighthouse:default',
        settings: { onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] },
      },
    );
    const lhr = result?.lhr;
    if (!lhr) return null;

    const score = (id: string) => Math.round((lhr.categories[id]?.score ?? 0) * 100);
    const numeric = (id: string) => {
      const v = lhr.audits[id]?.numericValue;
      return typeof v === 'number' ? Math.round(v) : undefined;
    };

    return {
      scores: {
        performance: score('performance'),
        accessibility: score('accessibility'),
        bestPractices: score('best-practices'),
        seo: score('seo'),
      },
      metrics: {
        lcpMs: numeric('largest-contentful-paint'),
        fcpMs: numeric('first-contentful-paint'),
        tbtMs: numeric('total-blocking-time'),
        cls:
          typeof lhr.audits['cumulative-layout-shift']?.numericValue === 'number'
            ? Number(lhr.audits['cumulative-layout-shift'].numericValue.toFixed(3))
            : undefined,
        siMs: numeric('speed-index'),
      },
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[lighthouse] run failed:', (err as Error).message);
    return null;
  } finally {
    try {
      chrome.kill();
    } catch {
      /* already dead */
    }
  }
}
