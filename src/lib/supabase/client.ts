import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'
import { ENV, validateSupabaseConfig } from '@/lib/config/env'

let supabaseInstance: SupabaseClient | null = null

/**
 * 🛰️ STAFF ENGINEER: Zero-Network Diagnostic Proxy
 * 
 * If the infrastructure is misconfigured, this proxy intercepts all
 * auth calls and prevents them from reaching the browser's fetch level.
 * This eliminates 'TypeError: Failed to fetch' in the console.
 */
function createDiagnosticClient(missing: string[]) {
  const mockClient = createBrowserClient(
    'https://diagnostic-mode.supabase.co',
    'diagnostic-key'
  )

  // Proxy the auth object to intercept network-triggering methods
  const authProxy = new Proxy(mockClient.auth, {
    get(target, prop) {
      const original = (target as any)[prop]
      if (typeof original === 'function') {
        return async (...args: any[]) => {
          console.error(`[Supabase Diagnostic] Blocked ${String(prop)} call due to missing config: ${missing.join(', ')}`)
          return {
            data: { user: null, session: null },
            error: {
              name: 'AuthConfigurationError',
              message: `Configuration de l'infrastructure incomplète (${missing.join(', ')}). Veuillez contacter l'administrateur.`,
              status: 500
            }
          }
        }
      }
      return original
    }
  })

  // Reconstruct the client with the proxied auth
  return new Proxy(mockClient, {
    get(target, prop) {
      if (prop === 'auth') return authProxy
      return (target as any)[prop]
    }
  })
}

/**
 * 🛰️ STAFF ENGINEER: Supabase Browser Singleton (Phase 2 Hardened)
 */
export function createClient() {
  if (supabaseInstance) return supabaseInstance

  const { isValid, missing } = validateSupabaseConfig()

  if (!isValid) {
    console.warn(`[Supabase Diagnostic] Auth is locked until environment variables are restored.`)
    supabaseInstance = createDiagnosticClient(missing) as any
    return supabaseInstance
  }

  supabaseInstance = createBrowserClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY)
  return supabaseInstance
}
