/**
 * 🛰️ STAFF ENGINEER: Auth Session Guard
 *
 * Handles catastrophic auth failure events from Supabase:
 * - TOKEN_REFRESH_FAILED: breaks the infinite refresh loop by wiping the session
 * - SIGNED_OUT: ensures no stale data persists
 *
 * Must be called ONCE at the app level (e.g. AppShell or root layout).
 * Safe to call multiple times — uses a module-level guard to prevent duplicate listeners.
 */

let guardInstalled = false

export function installAuthSessionGuard(
  supabase: import('@supabase/supabase-js').SupabaseClient
): () => void {
  // Prevent duplicate subscriptions across HMR or StrictMode double-renders
  if (guardInstalled) return () => {}
  guardInstalled = true

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    // Cast to string: TOKEN_REFRESH_FAILED is a valid runtime event but may be
    // missing from the AuthChangeEvent enum in some @supabase/ssr versions.
    const authEvent = event as string

    if (authEvent === 'TOKEN_REFRESH_FAILED') {
      console.warn('[AuthGuard] TOKEN_REFRESH_FAILED — clearing broken session to break retry loop')

      // Wipe only auth-related keys, not all of localStorage
      const authKeys = Object.keys(localStorage).filter(
        (k) => k.startsWith('sb-') || k.includes('supabase')
      )
      authKeys.forEach((k) => localStorage.removeItem(k))

      // Soft redirect to login — preserves the current path for redirect-back
      const currentPath = window.location.pathname
      const isProtected = !['/login', '/', '/landing'].includes(currentPath)
      if (isProtected) {
        window.location.href = `/login?reason=session_expired&next=${encodeURIComponent(currentPath)}`
      }
    }

    if (event === 'SIGNED_OUT') {
      // Clear any stale Supabase storage when user explicitly logs out
      const authKeys = Object.keys(localStorage).filter(
        (k) => k.startsWith('sb-')
      )
      authKeys.forEach((k) => localStorage.removeItem(k))
    }
  })

  // Return unsubscribe for cleanup
  return () => {
    subscription.unsubscribe()
    guardInstalled = false
  }
}

/**
 * Auth-specific Circuit Breaker
 *
 * Prevents cascading auth retries and free-tier exhaustion.
 * Resets after a cooldown window.
 */
export class AuthCircuitBreaker {
  private failures    = 0
  private lastFailure = 0
  private readonly maxFailures:  number
  private readonly cooldownMs:   number

  constructor(maxFailures = 2, cooldownMs = 30_000) {
    this.maxFailures = maxFailures
    this.cooldownMs  = cooldownMs
  }

  /** Returns true if the circuit is OPEN (requests should be blocked) */
  get isOpen(): boolean {
    // Auto-reset after cooldown
    if (this.failures >= this.maxFailures) {
      const elapsed = Date.now() - this.lastFailure
      if (elapsed >= this.cooldownMs) {
        this.reset()
        return false
      }
      return true
    }
    return false
  }

  /** Returns seconds remaining until circuit resets (0 if closed) */
  get cooldownRemaining(): number {
    if (!this.isOpen) return 0
    return Math.ceil((this.cooldownMs - (Date.now() - this.lastFailure)) / 1000)
  }

  recordFailure() {
    this.failures++
    this.lastFailure = Date.now()
  }

  reset() {
    this.failures    = 0
    this.lastFailure = 0
  }
}

/** Singleton circuit breaker for the login page */
export const loginCircuitBreaker = new AuthCircuitBreaker(2, 30_000)
