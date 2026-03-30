'use client'
import { usePathname } from 'next/navigation'
import { Sidebar }         from './Sidebar'
import { Header }          from './Header'
import { BottomNav }       from './BottomNav'
import { UserCityProvider } from '@/components/auth/UserCityProvider'
import { SwipeNavigation }   from './SwipeNavigation'
import { WeatherProvider }   from '@/components/providers/WeatherProvider'

// Pages that must NOT have the app shell (sidebar / header / bottom nav)
const PUBLIC_PREFIXES = ['/login', '/onboarding', '/auth']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname()
  const isPublic   = PUBLIC_PREFIXES.some(p => pathname.startsWith(p))

  if (isPublic) {
    // Auth / onboarding pages: full-screen, no chrome
    return <>{children}</>
  }

  return (
    <UserCityProvider>
      {/* Météo globale : se synchronise avec la ville sur toutes les pages */}
      <WeatherProvider />
      <div className="app-shell">
        <Sidebar />
        <div className="main-content relative">
          <Header />
          <div className="flex-1 overflow-hidden relative flex flex-col min-h-0 z-0">
            <SwipeNavigation>
              {children}
            </SwipeNavigation>
          </div>
        </div>
      </div>
      <BottomNav />
    </UserCityProvider>
  )
}
