import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login'],
        disallow: [
          '/dashboard/',
          '/map/',
          '/simulation/',
          '/prediction/',
          '/transport/',
          '/incidents/',
          '/social/',
          '/settings/',
          '/onboarding/',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://myaccount.crossflow-mobility.com/sitemap.xml',
  }
}
