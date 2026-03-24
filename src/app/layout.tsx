import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { UserCityProvider } from '@/components/auth/UserCityProvider'

export const metadata: Metadata = {
  title:       'CrossFlow Mobility — Smart City Platform',
  description: 'AI-powered urban traffic intelligence. Real-time monitoring, prediction and simulation.',
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
        <UserCityProvider>
          <div className="app-shell">
            <Sidebar />
            <div className="main-content">
              <Header />
              <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
                {children}
              </div>
            </div>
          </div>
          <BottomNav />
        </UserCityProvider>
      </body>
    </html>
  )
}
