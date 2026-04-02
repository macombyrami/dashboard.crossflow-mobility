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
const AIAssistantOverlay = lazy(() => import('../ai/AIAssistantOverlay').then(m => ({ default: m.AIAssistantOverlay })))

// Skeleton for layout components (Minimal footprint)
const LayoutSkeleton = () => <div className="animate-pulse bg-white/5 border border-white/10 rounded-xl" />

// Pages that must NOT have the app shell (sidebar / header / bottom nav)
const PUBLIC_PREFIXES = ['/login', '/onboarding', '/auth']
const NO_SHELL_ROUTES = ['/', ...PUBLIC_PREFIXES]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname()
  const [mounted, setMounted] = React.useState(false)
  const isPublic   = NO_SHELL_ROUTES.some(p => pathname === p || (p !== '/' && pathname.startsWith(p)))

  React.useEffect(() => {
    setMounted(true)

    // 🚀 STAFF ENGINEER: Ultimate Global Safety Net
    // Captures transient connectivity drops (Supabase resets/migrations) before they bubble up.
    // Broader detection for 'Connection closed', 'fetch failed', and 'Aborted'.
    const handleTransientError = (errorMessage: string) => {
      const msg = errorMessage.toLowerCase()
      const transientPatterns = ['connection closed', 'fetch failed', 'aborted', 'load failed', 'networkerror']
      
      if (transientPatterns.some(pat => msg.includes(pat))) {
        // Silence noise during development resets
        if (process.env.NODE_ENV === 'development') {
           console.debug(`[AppShell] Suppressed transient network rejection: "${errorMessage}"`)
        }
        return true // Handled
      }
      return false
    }

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const msg = (reason?.message || reason?.error || reason || '').toString()
      if (handleTransientError(msg)) {
        event.preventDefault()
      }
    }

    const handleError = (event: ErrorEvent) => {
      if (handleTransientError(event.message)) {
        event.preventDefault()
      }
    }

    window.addEventListener('unhandledrejection', handleRejection)
    window.addEventListener('error', handleError)
    
    return () => {
      window.removeEventListener('unhandledrejection', handleRejection)
      window.removeEventListener('error', handleError)
    }
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
      {/* Skip Navigation Link — WCAG 2.2 requirement */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-brand focus:text-black focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold focus:shadow-lg"
      >
        Aller au contenu principal
      </a>

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
          
          {/* 🧠 Proactive AI Guidance */}
          <Suspense fallback={null}>
            <AIAssistantOverlay />
          </Suspense>
        </div>

        <Suspense fallback={<div className="h-20 w-full fixed bottom-0 bg-white/5 animate-pulse" />}>
          <BottomNav />
        </Suspense>
      </UserCityProvider>
    </div>
  )
}
