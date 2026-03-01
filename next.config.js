/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NEXT_PUBLIC_API_BASE is loaded from:
  //   Development → .env.local           → http://localhost:4000
  //   Production  → .env.production      → http://52.191.175.55:4000
  // Override anytime by setting NEXT_PUBLIC_API_BASE in your shell / CI env.
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
