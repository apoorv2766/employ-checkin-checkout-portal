/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxy all /api/v1/* requests to the backend.
  // This ensures Set-Cookie headers from the API are placed on the Next.js
  // origin so the Edge middleware can read the refreshToken cookie.
  async rewrites() {
    const apiBase = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiBase}/api/v1/:path*`,
      },
    ];
  },
  // Images from the API (profile photos)
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
      },
    ],
  },
};

module.exports = nextConfig;
