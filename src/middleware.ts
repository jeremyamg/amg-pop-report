import { NextRequest, NextResponse } from 'next/server';

// Server-side gate for the internal analytics dashboard. The password
// previously only checked in the browser (NEXT_PUBLIC_ANALYTICS_PASSWORD),
// which meant /api/analytics itself had no protection at all. This runs
// before both the page and the API route, so neither is reachable without it.
export async function middleware(request: NextRequest) {
  const password = process.env.ANALYTICS_PASSWORD;
  if (!password) {
    // Fail closed. An unset password used to fall through and leave the
    // analytics routes public; now it takes them offline until the env var
    // is set, which is the loud failure a missing secret should be.
    console.error('ANALYTICS_PASSWORD is not set; refusing /analytics requests');
    return new NextResponse('Analytics is not configured on this deployment', { status: 503 });
  }

  const supplied = basicAuthPassword(request.headers.get('authorization'));
  if (supplied !== null && (await safeEqual(supplied, password))) {
    return NextResponse.next();
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Analytics"' },
  });
}

// The password half of a `Basic base64(user:password)` header, or null when
// the header is absent or malformed.
function basicAuthPassword(header: string | null): string | null {
  if (!header?.startsWith('Basic ')) return null;

  try {
    const bytes = Uint8Array.from(atob(header.slice(6)), c => c.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    return decoded.slice(decoded.indexOf(':') + 1);
  } catch {
    return null;
  }
}

// Compare SHA-256 digests byte for byte, so the time taken does not depend on
// the length of the guess or on where the first mismatching character falls.
// Middleware runs on the edge runtime, which has Web Crypto but not Node's
// crypto.timingSafeEqual.
async function safeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);

  const bytesA = new Uint8Array(digestA);
  const bytesB = new Uint8Array(digestB);
  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) {
    diff |= bytesA[i] ^ bytesB[i];
  }
  return diff === 0;
}

export const config = {
  matcher: ['/analytics/:path*', '/api/analytics/:path*'],
};
