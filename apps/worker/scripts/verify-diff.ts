// Standalone verification of the diff engine (pixelmatch union-canvas visual
// diff + jsdiff code diff). No browser/DB needed.
//   pnpm --filter @vigil/worker exec tsx scripts/verify-diff.ts
import sharp from 'sharp';
import { visualDiff } from '../src/diff/visual.js';
import { unifiedDiff, diffSummary } from '../src/diff/code.js';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('  ✗', msg);
    process.exitCode = 1;
  } else console.log('  ✓', msg);
}

const solid = (w: number, h: number, c: { r: number; g: number; b: number }) =>
  sharp({ create: { width: w, height: h, channels: 4, background: { ...c, alpha: 1 } } })
    .png()
    .toBuffer();

async function main() {
  console.log('visualDiff:');
  const white = await solid(100, 100, { r: 255, g: 255, b: 255 });

  const same = await visualDiff(white, white);
  assert(same.changedPixelPct === 0, 'identical images → 0% changed');
  assert((await sharp(same.diffPng).metadata()).format === 'png', 'diff image is PNG');

  // bottom half black
  const halfBlack = await sharp(white)
    .composite([{ input: await solid(100, 50, { r: 0, g: 0, b: 0 }), top: 50, left: 0 }])
    .png()
    .toBuffer();
  const half = await visualDiff(white, halfBlack);
  assert(half.changedPixelPct > 45 && half.changedPixelPct < 55, `~50% changed (${half.changedPixelPct.toFixed(1)}%)`);

  // differing heights → union canvas, added region counts as change (no crash)
  const tall = await sharp(await solid(100, 150, { r: 255, g: 255, b: 255 }))
    .composite([{ input: await solid(100, 50, { r: 0, g: 0, b: 0 }), top: 100, left: 0 }])
    .png()
    .toBuffer();
  const union = await visualDiff(white, tall);
  assert(union.width === 100 && union.height === 150, 'union canvas = max(w)×max(h)');
  assert(union.changedPixelPct > 25 && union.changedPixelPct < 40, `added region counted (${union.changedPixelPct.toFixed(1)}%)`);

  console.log('code diff:');
  const before = '<a class="btn btn--primary" href="/contact">Get a quote</a>\n<p>Stable</p>\n';
  const after = '<a class="btn" href="/contact">Contact</a>\n<p>Stable</p>\n';
  const patch = unifiedDiff(before, after, 'served HTML');
  assert(patch.includes('-<a class="btn btn--primary"'), 'unified diff shows removed line');
  assert(patch.includes('+<a class="btn"'), 'unified diff shows added line');
  const sum = diffSummary(before, after);
  assert(sum.added === 1 && sum.removed === 1, `summary counts (+${sum.added}/-${sum.removed})`);
  assert(sum.notable.some((n) => n.includes('Get a quote')), 'summary captures notable changed line');

  console.log(process.exitCode ? '\nFAILED' : '\nALL CHECKS PASSED');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
