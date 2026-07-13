import { NextRequest, NextResponse } from 'next/server';

// Server-side gate for the internal analytics dashboard. The password
// previously only checked in the browser (NEXT_PUBLIC_ANALYTICS_PASSWORD),
// which meant /api/analytics itself had no protection at all. This runs
// before both the page and the API route, so neither is reachable without it.
export function middleware(request: NextRequest) {
  const password = process.env.ANALYTICS_PASSWORD;
  if (!password) {
    console.warn('ANALYTICS_PASSWORD is not set; /analytics is unprotected');
    return NextResponse.next();
  }

  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    const decoded = Buffer.from(auth.slice(6), 'base64').toString();
    const suppliedPassword = decoded.slice(decoded.indexOf(':') + 1);
    if (suppliedPassword === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Analytics"' },
  });
}

export const config = {
  matcher: ['/analytics/:path*', '/api/analytics/:path*'],
};
