import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import { DIFF_HIGHLIGHT_RGB } from '@vigil/core';

export interface VisualDiffResult {
  changedPixelPct: number;
  changedPixels: number;
  diffPng: Buffer;
  width: number;
  height: number;
}

// Decode an image and pad it onto a W×H canvas (white) so two differing-height
// full-page screenshots can be compared on a shared/union canvas (Scope §11).
async function toRgbaPadded(buf: Buffer, w: number, h: number): Promise<Buffer> {
  const img = sharp(buf).ensureAlpha();
  const meta = await img.metadata();
  const right = Math.max(0, w - (meta.width ?? 0));
  const bottom = Math.max(0, h - (meta.height ?? 0));
  return img
    .extend({ top: 0, left: 0, right, bottom, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .raw()
    .toBuffer();
}

/**
 * Pixel-compare two screenshots (WebP/PNG buffers). pixelmatch requires equal
 * dimensions, so we pad both onto the union canvas first. Changed pixels are
 * painted in the highlight colour (#FF1F8E). Anti-aliasing is ignored.
 */
export async function visualDiff(before: Buffer, after: Buffer): Promise<VisualDiffResult> {
  const [bMeta, aMeta] = await Promise.all([sharp(before).metadata(), sharp(after).metadata()]);
  const width = Math.max(bMeta.width ?? 0, aMeta.width ?? 0);
  const height = Math.max(bMeta.height ?? 0, aMeta.height ?? 0);
  if (width === 0 || height === 0) {
    throw new Error('Cannot diff zero-size images');
  }

  const [bRgba, aRgba] = await Promise.all([
    toRgbaPadded(before, width, height),
    toRgbaPadded(after, width, height),
  ]);

  const diff = Buffer.alloc(width * height * 4);
  const changedPixels = pixelmatch(bRgba, aRgba, diff, width, height, {
    threshold: 0.1,
    includeAA: false,
    alpha: 0.12,
    diffColor: DIFF_HIGHLIGHT_RGB,
  });

  const diffPng = await sharp(diff, { raw: { width, height, channels: 4 } }).png().toBuffer();
  const changedPixelPct = (changedPixels / (width * height)) * 100;
  return { changedPixelPct, changedPixels, diffPng, width, height };
}
