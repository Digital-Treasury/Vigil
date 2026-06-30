import type { Browser } from 'playwright';
import { launchBrowser } from './capture/capture.js';

// One shared Chromium across capture jobs (fresh context per capture for
// isolation). Lighthouse uses its own fresh browser — see processors/lighthouse.
let browser: Browser | undefined;
let launching: Promise<Browser> | undefined;

export async function getBrowser(): Promise<Browser> {
  if (browser?.isConnected()) return browser;
  if (!launching) {
    launching = launchBrowser().then((b) => {
      browser = b;
      b.on('disconnected', () => {
        browser = undefined;
        launching = undefined;
      });
      return b;
    });
  }
  return launching;
}

export async function closeBrowser(): Promise<void> {
  if (browser) await browser.close().catch(() => {});
  browser = undefined;
  launching = undefined;
}
