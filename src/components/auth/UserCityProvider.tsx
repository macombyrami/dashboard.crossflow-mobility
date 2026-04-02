'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMapStore } from '@/store/mapStore'
import { CITIES } from '@/config/cities.config'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * 🛰️ UserCityProvider (Staff Engineer Optimized)
 * 
 * Logic:
 * 1. Checks useAuthStore for an existing session.
 * 2. If not initialized, calls Supabase ONCE and caches the result.
 * 3. Syncs auth state changes to the global store.
 * 4. Redirects to /login if a protected route is accessed without a session.
 */
export function UserCityProvider({ children }: { children: React.ReactNode }) {
  const setCity         = useMapStore(s => s.setCity)
  const setLockedCity   = useMapStore(s => s.setLockedCity)
  
  const user            = useAuthStore(s => s.user)
  const isInitialized   = useAuthStore(s => s.isInitialized)
  const setAuth         = useAuthStore(s => s.setAuth)

  useEffect(() => {
    const supabase = createClient()

    const applyUserCity = (u: any) => {
      if (!u) {
        setLockedCity(null)
        return
      }
      const cityId = u.user_metadata?.default_city as string | undefined
      if (!cityId) return
      const city = CITIES.find(c => c.id === cityId)
      if (!city) return
      setCity(city)
      setLockedCity(cityId)
    }

    // ⚡ PREVENT REDUNDANT FETCH: If already initialized, we trust the store.
    if (!isInitialized) {
      supabase.auth.getUser()
        .then(({ data }) => {
          setAuth(data.user, null)
          applyUserCity(data.user)

          const isProtected = !['/login', '/onboarding', '/auth', '/'].some(p => window.location.pathname.startsWith(p))
          if (!data.user && isProtected) {
            window.location.href = '/login'
          }
        })
        .catch(err => {
          console.error('[UserCityProvider] Auth fetch failed:', err)
          setAuth(null, null)
        })
    }

    // React to sign-in / sign-out events (Updates Global Store)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null
      setAuth(newUser, session)
      applyUserCity(newUser)

      const isProtected = !['/login', '/onboarding', '/auth', '/'].some(p => window.location.pathname.startsWith(p))
      if (!session && isProtected) {
        window.location.href = '/login'
      }
    })

    return () => {
      try {
        if (subscription) subscription.unsubscribe()
      } catch (e) {}
    }
  }, [isInitialized, setAuth, setCity, setLockedCity])

  return <>{children}</>
}
