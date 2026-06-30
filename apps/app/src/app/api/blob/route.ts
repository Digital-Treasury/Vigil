import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getStorage, SIGNED_URL_TTL } from '@vigil/storage';

// Authenticated proxy for stored artifacts (screenshots, diff images, HTML).
// Screenshots are client data — only authenticated users can read them. With an
// S3 driver we redirect to a short-lived signed URL; with LocalDriver we stream.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

  const key = req.nextUrl.searchParams.get('key');
  if (!key) return new NextResponse('Missing key', { status: 400 });

  const storage = getStorage();
  const signed = await storage.signedGetUrl(key, SIGNED_URL_TTL);
  if (signed) return NextResponse.redirect(signed);

  if (!(await storage.exists(key))) return new NextResponse('Not found', { status: 404 });
  const bytes = await storage.get(key);
  const contentType = (await storage.contentType(key)) ?? 'application/octet-stream';
  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
