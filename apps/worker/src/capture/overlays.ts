import type { Page } from 'playwright';

// Maintained best-effort list of cookie / consent / chat / promo dismiss targets.
// Expand as real client sites reveal gaps (Scope §4.3, §15).
export const OVERLAY_DISMISS_SELECTORS: string[] = [
  // cookie/consent
  '#onetrust-accept-btn-handler',
  '.ot-sdk-container #accept-recommended-btn-handler',
  'button#hs-eu-confirmation-button',
  'button[aria-label="Accept all"]',
  'button[aria-label="Accept cookies"]',
  '.cookie-consent button.accept',
  '.cc-allow',
  '.cky-btn-accept',
  '#cookie-accept',
  '#wt-cli-accept-all-btn',
  '[data-cookiebanner="accept_button"]',
  'button:has-text("Accept all")',
  'button:has-text("Accept cookies")',
  'button:has-text("I agree")',
  'button:has-text("Got it")',
  // chat/promo close
  '#hubspot-messages-iframe-container [aria-label="Close"]',
  '.intercom-launcher',
  'button[aria-label="Close message"]',
  '.drift-widget-close',
];

// Elements to hide outright (fixed chat/cookie iframes that resist clicking).
export const OVERLAY_HIDE_SELECTORS: string[] = [
  '#hubspot-messages-iframe-container',
  '#onetrust-consent-sdk',
  '.ot-sdk-row',
  '.intercom-lightweight-app',
  'iframe[title*="chat" i]',
  'iframe[id*="intercom" i]',
  'div[class*="cookie" i][class*="banner" i]',
];

export async function dismissOverlays(page: Page, timeoutMs = 800): Promise<void> {
  for (const sel of OVERLAY_DISMISS_SELECTORS) {
    try {
      const loc = page.locator(sel).first();
      if (await loc.isVisible({ timeout: 150 })) {
        await loc.click({ timeout: timeoutMs, force: false });
        await page.waitForTimeout(150);
      }
    } catch {
      /* best-effort */
    }
  }
  // Hide stubborn fixed widgets so they don't dominate the diff.
  await page
    .addStyleTag({
      content: OVERLAY_HIDE_SELECTORS.map((s) => `${s}{display:none!important;visibility:hidden!important}`).join('\n'),
    })
    .catch(() => {});
}
