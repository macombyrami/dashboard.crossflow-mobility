'use client'
/**
 * UserCityProvider
 * Reads the authenticated user's `default_city` from Supabase metadata
 * and locks the map to that city. Also listens for auth state changes
 * (sign-in / sign-out) to update or clear the lock.
 */
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMapStore } from '@/store/mapStore'
import { CITIES } from '@/config/cities.config'

export function UserCityProvider({ children }: { children: React.ReactNode }) {
  const setCity       = useMapStore(s => s.setCity)
  const setLockedCity = useMapStore(s => s.setLockedCity)

  useEffect(() => {
    const supabase = createClient()

    const applyUserCity = (user: any) => {
      if (!user) {
        // Signed out — release the lock
        setLockedCity(null)
        return
      }
      const cityId = user.user_metadata?.default_city as string | undefined
      if (!cityId) return                          // no city chosen yet (mid-onboarding)
      const city = CITIES.find(c => c.id === cityId)
      if (!city) return
      setCity(city)
      setLockedCity(cityId)
    }

    // Initial load
    supabase.auth.getUser()
      .then(({ data }) => applyUserCity(data.user))
      .catch(err => {
        if (err.message?.includes('Connection closed')) {
           console.warn('[UserCityProvider] Supabase connection dropped during migration/reset. Retrying...')
        } else {
           console.error('[UserCityProvider] Auth fetch failed:', err)
        }
      })

    // React to sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUserCity(session?.user ?? null)
    })

    return () => {
      // 🚀 Staff Engineer: Stable cleanup for auth listeners.
      // Defends against connection closed / disconnected states during unmounts.
      try {
        if (subscription) {
          subscription.unsubscribe()
        }
      } catch (err) {
        // Silent swallow for cleanup failures during connection reset
        console.debug('[UserCityProvider] Auth cleanup suppressed due to disconnected state.')
      }
    }
  }, [setCity, setLockedCity])

  return <>{children}</>
}
