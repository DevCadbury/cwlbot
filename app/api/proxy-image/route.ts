import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/proxy-image?url=<encoded-url>
 * Server-side proxy for external images (e.g. CoC badge CDN) so html-to-image
 * can inline them without hitting browser CORS restrictions.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return new NextResponse('Missing url param', { status: 400 });

  // Only allow CoC asset domains
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse('Invalid URL', { status: 400 });
  }

  const allowed = ['api-assets.clashofclans.com', 'cdn.clashofclans.com'];
  if (!allowed.some((d) => parsed.hostname.endsWith(d))) {
    return new NextResponse('Domain not allowed', { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'CWL-Dashboard/1.0' },
      // Node 18+ fetch — server-side, no CORS restriction
    });

    if (!upstream.ok) {
      return new NextResponse('Upstream error', { status: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/png';
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new NextResponse('Failed to fetch image', { status: 502 });
  }
}
