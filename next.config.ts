import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  // TypeScript + ESLint checked by IDE/CI — skip during build to avoid OOM on low-RAM machines
  typescript: { ignoreBuildErrors: true },
  async headers() {
    return [
      {
        source: '/(.*)\\.(js|css|woff2|png|svg|ico)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

export default nextConfig
