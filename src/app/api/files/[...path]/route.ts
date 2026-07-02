import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { ApiError, handler, requireUser } from '@/lib/api';
import { CAPTURES_DIR } from '@/lib/db';

const TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.html': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

export const GET = handler(async (_req, ctx) => {
  await requireUser();
  const { path: parts } = (await ctx.params) as unknown as { path: string[] };
  const rel = parts.join('/');
  const full = path.resolve(CAPTURES_DIR, rel);
  if (!full.startsWith(path.resolve(CAPTURES_DIR) + path.sep)) {
    throw new ApiError(400, 'Invalid path');
  }
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
    throw new ApiError(404, 'Not found');
  }
  const ext = path.extname(full).toLowerCase();
  const body = new Uint8Array(fs.readFileSync(full));
  return new NextResponse(body, {
    headers: {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
});
