'use client'
import React from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar }         from './Sidebar'
import { Header }          from './Header'
import { BottomNav }       from './BottomNav'
import { UserCityProvider } from '@/components/auth/UserCityProvider'
import { SwipeNavigation }   from './SwipeNavigation'
import { WeatherProvider }   from '@/components/providers/WeatherProvider'
import { TrafficSyncManager } from '@/components/dashboard/TrafficSyncManager'

// Pages that must NOT have the app shell (sidebar / header / bottom nav)
const PUBLIC_PREFIXES = ['/login', '/onboarding', '/auth']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname()
  const [mounted, setMounted] = React.useState(false)
  const isPublic   = PUBLIC_PREFIXES.some(p => pathname.startsWith(p))

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (isPublic) {
    // Auth / onboarding pages: full-screen, no chrome
    return <>{children}</>
  }

  // Defer rendering of shell components that depend on persisted stores (city, user...)
  // This is the primary fix for React Hydration Error #418.
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#08090B] flex flex-col">
        <div className="flex-1 relative overflow-hidden">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell animate-in fade-in duration-500">
      <UserCityProvider>
        <WeatherProvider />
        <TrafficSyncManager />
        <Sidebar />
        <div className="main-content relative">
          <Header />
          <div className="flex-1 overflow-hidden relative flex flex-col min-h-0 z-0">
            <SwipeNavigation>
              {children}
            </SwipeNavigation>
          </div>
        </div>
        <BottomNav />
      </UserCityProvider>
    </div>
  )
}
