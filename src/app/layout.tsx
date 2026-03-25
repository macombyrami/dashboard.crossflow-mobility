import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppShell } from '@/components/layout/AppShell'
import appData from '@/lib/data/app.json'

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
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>",
  },
}

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor:   appData.themeColor,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={appData.lang} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
