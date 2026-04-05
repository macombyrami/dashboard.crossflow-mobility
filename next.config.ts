import type { NextConfig } from 'next'

// Environment-aware CORS: never expose localhost in production responses
const IS_DEV    = process.env.NODE_ENV === 'development'
const APP_URL   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://myaccount.crossflow-mobility.com'
const CORS_ORIGIN = IS_DEV
  ? `${APP_URL}, http://localhost:3000`
  : APP_URL

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress:        true,
  poweredByHeader: false,

  async headers() {
    // ──────────────────────────────────────────────────────────────────
    // Content-Security-Policy
    // 'unsafe-eval' is required by MapLibre WebGL shader compilation.
    // All external origins are explicitly allowlisted.
    // ──────────────────────────────────────────────────────────────────
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com https://fonts.openmaptiles.org",
      "img-src 'self' blob: data: https://*.cartocdn.com https://*.tile.openstreetmap.org https://api.tomtom.com https://tile.tomtom.com https://grainy-gradients.vercel.app https://static.openagenda.com https://opendata.paris.fr",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.tomtom.com https://router.hereapi.com https://traffic.ls.hereapi.com https://overpass-api.de https://nominatim.openstreetmap.org https://api.open-meteo.com https://air-quality-api.open-meteo.com https://*.cartocdn.com https://*.tile.openstreetmap.org https://tiles.stadiamaps.com https://prim.iledefrance-mobilites.fr https://data.sytadin.fr https://openrouter.ai https://opendata.paris.fr https://api.openagenda.com",
      "worker-src blob: 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')

    const securityHeaders = [
      { key: 'Content-Security-Policy',   value: csp },
      { key: 'X-Frame-Options',           value: 'DENY' },
      { key: 'X-Content-Type-Options',    value: 'nosniff' },
      { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=()' },
      { key: 'X-DNS-Prefetch-Control',    value: 'on' },
      {
        key:   'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      // ✔ Environment-aware: localhost NEVER sent to production clients
      {
        key:   'Access-Control-Allow-Origin',
        value: CORS_ORIGIN,
      },
    ]

    return [
      // Apply security headers to ALL routes
      {
        source:  '/(.*)',
        headers: securityHeaders,
      },
      // Long-term cache for immutable static assets
      {
        source:  '/(.+)\\.(js|css|woff2|png|svg|ico|webp)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // No-cache for API routes (they manage their own Cache-Control)
      {
        source:  '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },
}

export default nextConfig
