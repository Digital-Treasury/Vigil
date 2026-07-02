import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { CAPTURES_DIR } from './db';
import type { MaskRect } from './capture';

const DIFF_HIGHLIGHT: [number, number, number] = [255, 31, 142]; // #FF1F8E

export interface VisualDiff {
  pct: number;
  diffPath: string; // relative to CAPTURES_DIR
}

/**
 * Compare two full-page screenshots. Images are padded to a common canvas
 * (white) so different page heights diff sanely; masked regions from both
 * captures are excluded. Writes a transparent overlay PNG with changed
 * pixels in the diff-highlight magenta.
 */
export function diffScreenshots(
  beforeRel: string,
  afterRel: string,
  masks: MaskRect[],
  outName: string
): VisualDiff {
  const before = PNG.sync.read(fs.readFileSync(path.join(CAPTURES_DIR, beforeRel)));
  const after = PNG.sync.read(fs.readFileSync(path.join(CAPTURES_DIR, afterRel)));

  const width = Math.max(before.width, after.width);
  const height = Math.max(before.height, after.height);

  const a = pad(before, width, height);
  const b = pad(after, width, height);

  // Zero out masked regions in both canvases so they can never differ.
  for (const m of masks) {
    fillRect(a, m, width, height);
    fillRect(b, m, width, height);
  }

  const overlay = new PNG({ width, height });
  const changed = pixelmatch(a.data, b.data, overlay.data, width, height, {
    threshold: 0.12,
    includeAA: false,
    diffColor: DIFF_HIGHLIGHT,
    diffMask: true, // transparent except changed pixels — used as an overlay
  });

  const outRel = path.join('diffs', outName);
  fs.mkdirSync(path.join(CAPTURES_DIR, 'diffs'), { recursive: true });
  fs.writeFileSync(path.join(CAPTURES_DIR, outRel), PNG.sync.write(overlay));

  // Percentage over the union canvas, excluding masked area from the denominator.
  const maskedArea = masks.reduce((sum, m) => {
    const w = Math.max(0, Math.min(width, m.x + m.width) - Math.max(0, m.x));
    const h = Math.max(0, Math.min(height, m.y + m.height) - Math.max(0, m.y));
    return sum + w * h;
  }, 0);
  const denominator = Math.max(1, width * height - maskedArea);
  const pct = Math.round((changed / denominator) * 10000) / 100;

  return { pct, diffPath: outRel };
}

function pad(img: PNG, width: number, height: number): PNG {
  if (img.width === width && img.height === height) return img;
  const out = new PNG({ width, height });
  out.data.fill(255); // white
  PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0);
  return out;
}

function fillRect(img: PNG, m: MaskRect, width: number, height: number) {
  const x0 = Math.max(0, Math.floor(m.x));
  const y0 = Math.max(0, Math.floor(m.y));
  const x1 = Math.min(width, Math.ceil(m.x + m.width));
  const y1 = Math.min(height, Math.ceil(m.y + m.height));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      img.data[i] = 200;
      img.data[i + 1] = 200;
      img.data[i + 2] = 200;
      img.data[i + 3] = 255;
    }
  }
}
