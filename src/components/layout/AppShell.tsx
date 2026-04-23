'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar }         from './Sidebar'
import { Header }          from './Header'
import { BottomNav }       from './BottomNav'
import { UserCityProvider } from '@/components/auth/UserCityProvider'
import { SwipeNavigation }   from './SwipeNavigation'
import { useThemeStore }     from '@/store/themeStore'

// Pages that must NOT have the app shell (sidebar / header / bottom nav)
const PUBLIC_PREFIXES = ['/login', '/onboarding', '/auth']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname()
  const isPublic   = PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
  const theme      = useThemeStore(s => s.theme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  if (isPublic) {
    // Auth / onboarding pages: full-screen, no chrome
    return <>{children}</>
  }

  return (
    <UserCityProvider>
      <div className="app-shell">
        <Sidebar />
        <div className="main-content">
          <Header />
          <div className="page-scroll">
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
