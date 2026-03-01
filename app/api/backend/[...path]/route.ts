import { NextRequest, NextResponse } from 'next/server';

// API_BASE is a server-only env var — never sent to the browser
const API_BASE = process.env.API_BASE ?? 'http://localhost:4000';

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
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

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
    // Don't follow redirects — pass them through
    redirect: 'manual',
  });

  const resHeaders = new Headers();
  response.headers.forEach((value, key) => {
    // Don't forward encoding headers Next.js handles
    if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
      resHeaders.set(key, value);
    }
  });

  const resBody = await response.arrayBuffer();
  return new NextResponse(resBody, {
    status: response.status,
    headers: resHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
