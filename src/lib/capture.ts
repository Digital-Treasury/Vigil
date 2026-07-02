import fs from 'fs';
import path from 'path';
import { chromium, type Browser } from 'playwright';
import { CAPTURES_DIR, getDb } from './db';
import type { Viewport } from './types';
import { normalizeDom } from './normalize';
import { runLighthouse } from './lighthouse';

const VIEWPORTS: Record<Viewport, { width: number; height: number; isMobile: boolean }> = {
  desktop: { width: 1440, height: 900, isMobile: false },
  mobile: { width: 390, height: 844, isMobile: true },
};

const NAV_TIMEOUT = 45_000;

declare global {
  // eslint-disable-next-line no-var
  var __vigilBrowser: Promise<Browser> | undefined;
}

async function getBrowser(): Promise<Browser> {
  if (!globalThis.__vigilBrowser) {
    globalThis.__vigilBrowser = launch();
  }
  const browser = await globalThis.__vigilBrowser;
  if (!browser.isConnected()) {
    globalThis.__vigilBrowser = launch();
    return globalThis.__vigilBrowser;
  }
  return browser;
}

async function launch(): Promise<Browser> {
  // Respect an outbound proxy when the host requires one.
  const proxyServer = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const opts = {
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    proxy: proxyServer
      ? { server: proxyServer, bypass: process.env.NO_PROXY || undefined }
      : undefined,
  };
  try {
    return await chromium.launch(opts);
  } catch (err) {
    // Fall back to an explicitly provided binary (e.g. distro chromium in Docker).
    const exe = process.env.CHROMIUM_PATH;
    if (exe && fs.existsSync(exe)) {
      return chromium.launch({ ...opts, executablePath: exe });
    }
    throw err;
  }
}

export interface CaptureOptions {
  pageId: number;
  runId?: number | null;
  checkpointId?: number | null;
  url: string;
  viewport: Viewport;
  maskSelectors: string[];
  waitSelector?: string | null;
  lighthouse?: boolean;
}

export interface MaskRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Captures one page at one viewport; always inserts a capture row (ok or error) and returns its id. */
export async function capturePage(opts: CaptureOptions): Promise<number> {
  const db = getDb();
  try {
    const browser = await getBrowser();
    const vp = VIEWPORTS[opts.viewport];
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      deviceScaleFactor: 1,
      // For environments whose proxy re-signs TLS (set VIGIL_IGNORE_HTTPS_ERRORS=1).
      ignoreHTTPSErrors: process.env.VIGIL_IGNORE_HTTPS_ERRORS === '1',
      userAgent: vp.isMobile
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 VigilBot'
        : undefined,
    });
    try {
      const page = await context.newPage();
      const response = await page.goto(opts.url, { waitUntil: 'load', timeout: NAV_TIMEOUT });
      if (!response) throw new Error('No response from page');
      if (response.status() >= 400) throw new Error(`Page returned HTTP ${response.status()}`);
      const servedHtml = await response.text().catch(() => '');

      if (opts.waitSelector) {
        await page.waitForSelector(opts.waitSelector, { timeout: 15_000 });
      }
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      // Let lazy-loaded content settle: scroll the full page once, then return to top.
      await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
          let y = 0;
          const step = () => {
            y += 800;
            window.scrollTo(0, y);
            if (y >= document.body.scrollHeight) {
              window.scrollTo(0, 0);
              setTimeout(resolve, 400);
            } else setTimeout(step, 80);
          };
          step();
        });
      }).catch(() => {});
      await page.waitForTimeout(500);

      // Bounding boxes of masked regions (full-page coordinates).
      const maskRects: MaskRect[] = [];
      for (const selector of opts.maskSelectors) {
        const rects = await page
          .evaluate((sel) => {
            const out: { x: number; y: number; width: number; height: number }[] = [];
            document.querySelectorAll(sel).forEach((el) => {
              const r = el.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                out.push({
                  x: r.x + window.scrollX,
                  y: r.y + window.scrollY,
                  width: r.width,
                  height: r.height,
                });
              }
            });
            return out;
          }, selector)
          .catch(() => [] as MaskRect[]);
        maskRects.push(...rects);
      }

      const domHtml = normalizeDom(
        await page.evaluate(() => document.documentElement.outerHTML)
      );

      const dir = path.join(CAPTURES_DIR, String(opts.pageId));
      fs.mkdirSync(dir, { recursive: true });
      const stamp = `${Date.now()}-${opts.viewport}`;
      const screenshotPath = path.join(dir, `${stamp}.png`);
      const htmlPath = path.join(dir, `${stamp}.html`);
      const domPath = path.join(dir, `${stamp}.dom.html`);

      await page.screenshot({ path: screenshotPath, fullPage: true, timeout: 60_000 });
      fs.writeFileSync(htmlPath, servedHtml);
      fs.writeFileSync(domPath, domHtml);

      // Read PNG dimensions from the IHDR header.
      const buf = fs.readFileSync(screenshotPath);
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);

      let lighthouseJson: string | null = null;
      if (opts.lighthouse && opts.viewport === 'desktop') {
        const scores = await runLighthouse(opts.url).catch(() => null);
        if (scores) lighthouseJson = JSON.stringify(scores);
      }

      await context.close();

      const info = db
        .prepare(
          `INSERT INTO captures (page_id, run_id, checkpoint_id, viewport, status, screenshot_path, html_path, dom_path, mask_rects, lighthouse, width, height)
           VALUES (?, ?, ?, ?, 'ok', ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          opts.pageId,
          opts.runId ?? null,
          opts.checkpointId ?? null,
          opts.viewport,
          path.relative(CAPTURES_DIR, screenshotPath),
          path.relative(CAPTURES_DIR, htmlPath),
          path.relative(CAPTURES_DIR, domPath),
          JSON.stringify(maskRects),
          lighthouseJson,
          width,
          height
        );
      return Number(info.lastInsertRowid);
    } finally {
      await context.close().catch(() => {});
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const info = db
      .prepare(
        `INSERT INTO captures (page_id, run_id, checkpoint_id, viewport, status, error)
         VALUES (?, ?, ?, ?, 'error', ?)`
      )
      .run(opts.pageId, opts.runId ?? null, opts.checkpointId ?? null, opts.viewport, message);
    return Number(info.lastInsertRowid);
  }
}
