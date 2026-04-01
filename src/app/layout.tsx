import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppShell } from '@/components/layout/AppShell'
import appData from '@/lib/data/app.json'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title:       appData.metaTitle,
  description: appData.metaDescription,
  keywords:    appData.keywords,
  authors:     [{ name: appData.author }],
  openGraph: {
    title:       appData.ogTitle,
    description: appData.ogDescription,
    url:         appData.url,
    siteName:    appData.fullName,
    images: [
      {
        url:    appData.ogImageUrl,
        width:  1200,
        height: 630,
      },
    ],
    locale: appData.locale,
    type:   'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       appData.twitterTitle,
    description: appData.twitterDescription,
    images:      [appData.twitterImageUrl],
  },
  robots: {
    index:  true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
}

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor:   appData.themeColor,
}

import { QueryProvider } from '@/components/providers/QueryProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={appData.lang} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <QueryProvider>
          <AppShell>
            {children}
            <Analytics />
            <SpeedInsights />
          </AppShell>
        </QueryProvider>
      </body>
    </html>
  )
}
