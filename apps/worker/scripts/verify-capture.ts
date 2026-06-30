// Standalone verification of the capture pipeline against a local HTML fixture.
// Runs real Chromium (via CHROMIUM_EXECUTABLE_PATH) + sharp + the parse5 DOM
// normaliser. No DB/Redis required.
//
//   CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
//     pnpm --filter @vigil/worker exec tsx scripts/verify-capture.ts
import http from 'node:http';
import sharp from 'sharp';
import { capturePage, launchBrowser } from '../src/capture/capture.js';
import { normaliseDom } from '../src/capture/normaliseDom.js';

const FIXTURE = `<!doctype html><html><head><meta charset="utf-8"><title>Fixture</title>
<style>@keyframes spin{to{transform:rotate(360deg)}} .anim{animation:spin 1s infinite}</style></head>
<body style="margin:0;font-family:sans-serif">
  <div id="onetrust-consent-sdk" style="position:fixed;bottom:0;left:0;right:0;height:80px;background:#222;color:#fff">We use cookies</div>
  <section class="hero" style="height:700px;background:#f4f1ea;padding:40px">
    <h1>Maximise your web potential.</h1>
    <button id=":r5:" class="Button_x9y8z7 btn--primary">Get a quote</button>
    <img src="/logo.png?v=abcdef123&keep=1" alt="logo" width="120" height="40">
    <p class="ts">Updated 2025-06-30T12:34:56Z</p>
    <div class="anim css-1a2b3c">spinning</div>
  </section>
  <section class="mask-me" style="height:300px;background:#c00;color:#fff;padding:40px">Dynamic promo</section>
  <section style="height:900px;background:#fff;padding:40px"><p>Tall content to force full-page + scroll.</p></section>
</body></html>`;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('  ✗', msg);
    process.exitCode = 1;
  } else {
    console.log('  ✓', msg);
  }
}

async function main() {
  // 1. DOM normaliser unit checks (no browser).
  console.log('normaliseDom:');
  const norm = normaliseDom(FIXTURE);
  assert(!norm.includes('x9y8z7'), 'strips CSS-module hash (Button_x9y8z7)');
  assert(!norm.includes('1a2b3c'), 'strips emotion hash (css-1a2b3c)');
  assert(!norm.includes(':r5:'), 'strips React useId (:r5:)');
  assert(!norm.includes('abcdef123'), 'strips cache-busting ?v= param');
  assert(norm.includes('keep=1'), 'keeps meaningful query params');
  assert(!norm.includes('2025-06-30T12:34:56Z'), 'masks ISO timestamp');
  assert(norm.includes('⟨ts⟩') && norm.includes('⟨id⟩'), 'inserts stable tokens');

  // 2. Full capture against a served fixture.
  console.log('capturePage:');
  const server = http.createServer((_req, res) => {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(FIXTURE);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;
  const url = `http://127.0.0.1:${port}/`;

  const browser = await launchBrowser();
  try {
    const art = await capturePage(browser, { url, viewport: 'desktop', maskSelectors: ['.mask-me'] });
    const meta = await sharp(art.screenshot).metadata();
    assert(meta.format === 'webp', `screenshot is WebP (${meta.format})`);
    assert((meta.width ?? 0) === 1440, `screenshot width is 1440 (${meta.width})`);
    assert((meta.height ?? 0) > 1500, `full-page height captured (${meta.height}px)`);
    assert(art.servedHtml.includes('<h1>Maximise'), 'served HTML captured (pre-JS markup)');
    assert(art.renderedDom.includes('Get a quote'), 'rendered DOM captured');
    assert(!art.renderedDomNormalised.includes('abcdef123'), 'normalised DOM stripped cache-bust');
    console.log(
      `  · screenshot ${Math.round(art.screenshot.length / 1024)}KB · servedHtml ${art.servedHtml.length}B`,
    );
  } finally {
    await browser.close();
    server.close();
  }

  console.log(process.exitCode ? '\nFAILED' : '\nALL CHECKS PASSED');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
