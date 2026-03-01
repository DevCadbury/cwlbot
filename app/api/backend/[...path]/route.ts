import { NextRequest, NextResponse } from 'next/server';

// API_BASE is a server-only env var set in Vercel project settings
const API_BASE = process.env.API_BASE;

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  if (!API_BASE) {
    console.error('[proxy] API_BASE env var is not set');
    return NextResponse.json(
      { error: 'API_BASE is not configured on this server' },
      { status: 503 }
    );
  }

  const path = '/' + params.path.join('/');
  const url = new URL(req.url);
  const targetUrl = `${API_BASE}${path}${url.search}`;

  // Forward all headers except host
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') headers.set(key, value);
  });

  let body: BodyInit | null = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.arrayBuffer();
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    });

    const resHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        resHeaders.set(key, value);
      }
    });

    const resBody = await response.arrayBuffer();
    return new NextResponse(resBody, {
      status: response.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error(`[proxy] Failed to reach ${targetUrl}:`, err?.message ?? err);
    return NextResponse.json(
      { error: 'Could not reach the backend API', detail: err?.message },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;

