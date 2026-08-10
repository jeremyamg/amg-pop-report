import { NextRequest, NextResponse } from 'next/server';

// Origins allowed to read this API from browser JavaScript. The blog posts on
// audiomediagrading.com pull population numbers into their prose this way; the
// pop report's own pages don't need it, being same-origin.
//
// Override with CORS_ALLOWED_ORIGINS (comma-separated) to add an origin without
// a code change - a staging host, or a local page during development.
const DEFAULT_ALLOWED_ORIGINS = [
  'https://audiomediagrading.com',
  'https://www.audiomediagrading.com',
];

function allowedOrigins(): string[] {
  const configured = process.env.CORS_ALLOWED_ORIGINS;
  if (!configured) return DEFAULT_ALLOWED_ORIGINS;

  return configured
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
}

/**
 * Echo back the request's Origin only when it is on the allowlist.
 *
 * Echoing rather than sending a fixed value is what lets more than one origin
 * be permitted; `Vary: Origin` keeps caches from serving one origin's response
 * to another. Requests from anywhere else get no CORS header at all, so the
 * browser blocks the read.
 *
 * This governs browser scripts only - it is not an access control. The endpoint
 * is already reachable by anything that isn't a browser.
 */
export function withCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get('origin');

  if (origin && allowedOrigins().includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  response.headers.set('Vary', 'Origin');

  return response;
}

/**
 * Preflight handler. A plain GET with no custom headers doesn't trigger one,
 * but this keeps the route correct if a caller ever adds a header that does.
 */
export function corsPreflight(request: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  response.headers.set('Access-Control-Max-Age', '86400');

  return withCors(request, response);
}
