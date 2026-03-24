import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppShell } from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title:       'CrossFlow Mobility | Dashboard AI et Intelligence Urbaine',
  description: 'Pilotez votre mobilité urbaine avec l\'IA CrossFlow. Analyse en temps réel, prédictions de trafic et gestion intelligente des incidents pour les smart cities.',
  keywords:    ['mobilité urbaine', 'smart city', 'intelligence artificielle', 'trafic temps réel', 'prédiction routière', 'gestion urbaine'],
  authors:     [{ name: 'CrossFlow Team' }],
  openGraph: {
    title:       'CrossFlow Mobility Dashboard',
    description: 'Analyse prédictive et monitoring en temps réel de la mobilité urbaine.',
    url:         'https://myaccount.crossflow-mobility.com',
    siteName:    'CrossFlow Mobility',
    images: [
      {
        url:    'https://crossflow-mobility.com/og-image.jpg',
        width:  1200,
        height: 630,
      },
    ],
    locale: 'fr_FR',
    type:   'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'CrossFlow Mobility | Dashboard AI',
    description: 'Intelligence urbaine et monitoring de trafic en temps réel.',
    images:      ['https://crossflow-mobility.com/twitter-image.jpg'],
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
  themeColor:   '#08090B',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
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
