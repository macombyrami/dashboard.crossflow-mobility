'use client'
import React, { lazy, Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { UserCityProvider } from '@/components/auth/UserCityProvider'
import { SwipeNavigation }   from './SwipeNavigation'
import { WeatherProvider }   from '@/components/providers/WeatherProvider'
import { TrafficSyncManager } from '@/components/dashboard/TrafficSyncManager'

// 🚀 STAFF ENGINEER PERFORMANCE: Lazy-load heavy chrome components
const Sidebar   = lazy(() => import('./Sidebar').then(m => ({ default: m.Sidebar })))
const Header    = lazy(() => import('./Header').then(m => ({ default: m.Header })))
const BottomNav = lazy(() => import('./BottomNav').then(m => ({ default: m.BottomNav })))

// Skeleton for layout components (Minimal footprint)
const LayoutSkeleton = () => <div className="animate-pulse bg-white/5 border border-white/10 rounded-xl" />

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
    <div className="app-shell animate-in fade-in duration-500 bg-[#030303]">
      <UserCityProvider>
        <WeatherProvider />
        <TrafficSyncManager />
        
        <Suspense fallback={<LayoutSkeleton />}>
          <Sidebar />
        </Suspense>

        <div className="main-content relative pt-safe">
          <Suspense fallback={<div className="h-16 w-full bg-white/5 animate-pulse" />}>
            <Header />
          </Suspense>

          <div className="flex-1 overflow-hidden relative flex flex-col min-h-0 z-0 pb-safe">
            <SwipeNavigation>
              {children}
            </SwipeNavigation>
          </div>
        </div>

        <Suspense fallback={<div className="h-20 w-full fixed bottom-0 bg-white/5 animate-pulse" />}>
          <BottomNav />
        </Suspense>
      </UserCityProvider>
    </div>
  )
}
