/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // API_BASE is a server-only env var set in Vercel / .env.local
  // It is never exposed to the browser — all API calls go through /api/backend proxy
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api-assets.clashofclans.com' },
      { protocol: 'https', hostname: 'cdn.clashofclans.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
