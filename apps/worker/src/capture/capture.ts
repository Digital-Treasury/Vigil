import { chromium, type Browser, type BrowserContext } from 'playwright';
import sharp from 'sharp';
import { VIEWPORTS, type ViewportKey } from '@vigil/core';
import { normaliseDom } from './normaliseDom.js';
import { dismissOverlays } from './overlays.js';
import { env } from '../env.js';

export type CaptureFailureReason =
  | 'http_error'
  | 'timeout'
  | 'redirected'
  | 'login_wall'
  | 'navigation_error'
  | 'screenshot_error'
  | 'unknown';

export class CaptureFailure extends Error {
  constructor(
    public readonly reason: CaptureFailureReason,
    message: string,
  ) {
    super(message);
    this.name = 'CaptureFailure';
  }
}

export interface CaptureOptions {
  url: string;
  viewport: ViewportKey;
  maskSelectors?: string[];
  waitForSelector?: string | null;
}

export interface CaptureArtifacts {
  screenshot: Buffer; // WebP lossless
  servedHtml: string;
  renderedDom: string;
  renderedDomNormalised: string;
  width: number;
  height: number;
  finalUrl: string;
}

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// Determinism: pin Date and Math.random before any page script runs.
const PIN_SCRIPT = `(() => {
  const FIXED = 1700000000000;
  try {
    const _D = Date;
    function FakeDate(...a){ return a.length ? new _D(...a) : new _D(FIXED); }
    FakeDate.now = () => FIXED;
    FakeDate.parse = _D.parse; FakeDate.UTC = _D.UTC;
    FakeDate.prototype = _D.prototype;
    // @ts-ignore
    window.Date = FakeDate;
  } catch {}
  try {
    let seed = 42;
    Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  } catch {}
})();`;

const CSS_RESET = `*,*::before,*::after{animation:none!important;animation-duration:0s!important;transition:none!important;transition-duration:0s!important;caret-color:transparent!important;scroll-behavior:auto!important}
html{scroll-behavior:auto!important}`;

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
    proxy: process.env.CAPTURE_PROXY_SERVER
      ? { server: process.env.CAPTURE_PROXY_SERVER }
      : undefined,
  });
}

async function newContext(browser: Browser, viewport: ViewportKey): Promise<BrowserContext> {
  const width = VIEWPORTS[viewport].width;
  if (viewport === 'mobile') {
    return browser.newContext({
      viewport: { width, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: MOBILE_UA,
      reducedMotion: 'reduce',
    });
  }
  return browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
}

async function autoScroll(context: BrowserContext, page: import('playwright').Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let y = 0;
      const step = 400;
      const timer = setInterval(() => {
        const max = document.documentElement.scrollHeight;
        window.scrollTo(0, y);
        y += step;
        if (y >= max) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 80);
    });
  });
}

export async function capturePage(browser: Browser, opts: CaptureOptions): Promise<CaptureArtifacts> {
  const context = await newContext(browser, opts.viewport);
  await context.addInitScript(PIN_SCRIPT);
  const page = await context.newPage();

  try {
    let response;
    try {
      response = await page.goto(opts.url, {
        waitUntil: 'domcontentloaded',
        timeout: env.navTimeoutMs,
      });
    } catch (e) {
      throw new CaptureFailure('timeout', `Navigation failed: ${(e as Error).message}`);
    }
    if (!response) throw new CaptureFailure('navigation_error', 'No response from server');
    const status = response.status();
    if (status >= 400) throw new CaptureFailure('http_error', `HTTP ${status}`);

    const servedHtml = await response.text().catch(() => '');

    // settle: network-idle with a hard cap so polling pages can't stall the queue.
    await page
      .waitForLoadState('networkidle', { timeout: Math.min(env.navTimeoutMs, 15000) })
      .catch(() => {});

    await page.addStyleTag({ content: CSS_RESET }).catch(() => {});

    if (opts.waitForSelector) {
      await page.waitForSelector(opts.waitForSelector, { timeout: 10000 }).catch(() => {});
    }

    await dismissOverlays(page);
    await autoScroll(context, page);
    await page.waitForTimeout(env.settleMs);

    const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const width = VIEWPORTS[opts.viewport].width;
    const clip =
      docHeight > env.screenshotMaxHeight
        ? { x: 0, y: 0, width, height: env.screenshotMaxHeight }
        : undefined;

    let pngBuf: Buffer;
    try {
      pngBuf = await page.screenshot({
        fullPage: !clip,
        clip,
        type: 'png',
        scale: 'css',
        animations: 'disabled',
        caret: 'hide',
        mask: (opts.maskSelectors ?? []).map((s) => page.locator(s)),
        maskColor: '#000000',
      });
    } catch (e) {
      throw new CaptureFailure('screenshot_error', `Screenshot failed: ${(e as Error).message}`);
    }

    const renderedDom = await page.content();
    const renderedDomNormalised = normaliseDom(renderedDom);

    const webp = await sharp(pngBuf).webp({ lossless: true, effort: 4 }).toBuffer();
    const meta = await sharp(webp).metadata();

    return {
      screenshot: webp,
      servedHtml,
      renderedDom,
      renderedDomNormalised,
      width: meta.width ?? width,
      height: meta.height ?? docHeight,
      finalUrl: page.url(),
    };
  } finally {
    await context.close().catch(() => {});
  }
}
