import type { LighthouseScores } from './types';

// Lighthouse drives its own Chrome over the CDP port. We launch a dedicated
// headless instance per audit (serialised by the runner's queue) rather than
// sharing the capture browser, so a crashed audit can't take captures down.
export async function runLighthouse(url: string): Promise<LighthouseScores | null> {
  const { chromium } = await import('playwright');
  const port = 9222 + Math.floor(Math.random() * 500);
  const fs = await import('fs');
  const exe = process.env.CHROMIUM_PATH;
  const browser = await chromium
    .launch({
      args: ['--no-sandbox', '--disable-dev-shm-usage', `--remote-debugging-port=${port}`],
    })
    .catch(() =>
      exe && fs.existsSync(exe)
        ? chromium.launch({
            executablePath: exe,
            args: ['--no-sandbox', '--disable-dev-shm-usage', `--remote-debugging-port=${port}`],
          })
        : Promise.reject(new Error('Chromium launch failed'))
    );
  try {
    const { default: lighthouse } = await import('lighthouse');
    const result = await lighthouse(url, {
      port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });
    if (!result) return null;
    const cats = result.lhr.categories;
    const score = (id: string) => {
      const s = cats[id]?.score;
      return s == null ? null : Math.round(s * 100);
    };
    return {
      performance: score('performance'),
      accessibility: score('accessibility'),
      bestPractices: score('best-practices'),
      seo: score('seo'),
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
