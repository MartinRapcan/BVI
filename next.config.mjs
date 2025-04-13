import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: "standalone",
  // Your Next.js config here
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            // value: 'public, max-age=300, s-maxage=3600',
            value: 'no-store, max-age=0',
          },
        ],
      },
      {
        // Do not cache API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
  // Add this to ensure CSS modules work properly
  webpack: (config) => {
    return config;
  },
}

export default withPayload(nextConfig)
