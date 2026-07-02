import { NextRequest, NextResponse } from 'next/server';

// Edge middleware can't use node crypto; it only checks cookie presence.
// Real HMAC verification happens in getSession() on every server read.
export function middleware(req: NextRequest) {
  if (process.env.DEV_AUTH_BYPASS === '1') return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }
  if (!req.cookies.get('vigil_session')?.value) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
