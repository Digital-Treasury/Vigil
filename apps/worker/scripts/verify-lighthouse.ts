// Verify Lighthouse runs end-to-end (fresh Chrome via chrome-launcher) against a
// served fixture and returns the four category scores + metrics.
//   CHROMIUM_EXECUTABLE_PATH=… pnpm --filter @vigil/worker exec tsx scripts/verify-lighthouse.ts
import http from 'node:http';
import { runLighthouse } from '../src/lighthouse/run.js';

const FIXTURE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vigil Lighthouse fixture</title><meta name="description" content="A small fixture page."></head>
<body><h1>Hello</h1><p>Content for Lighthouse to score.</p></body></html>`;

async function main() {
  const server = http.createServer((_req, res) => {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(FIXTURE);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;

  console.log('runLighthouse:');
  const data = await runLighthouse(`http://127.0.0.1:${port}/`);
  server.close();

  if (!data) {
    console.error('  ✗ no Lighthouse result');
    process.exit(1);
  }
  const { performance, accessibility, bestPractices, seo } = data.scores;
  const ok = [performance, accessibility, bestPractices, seo].every((n) => n >= 0 && n <= 100);
  console.log(`  scores → perf ${performance} · a11y ${accessibility} · best ${bestPractices} · seo ${seo}`);
  console.log(`  metrics → LCP ${data.metrics?.lcpMs}ms · CLS ${data.metrics?.cls} · TBT ${data.metrics?.tbtMs}ms`);
  console.log(ok ? '\nALL CHECKS PASSED' : '\nFAILED (scores out of range)');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
