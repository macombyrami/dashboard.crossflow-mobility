import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'
import { ENV, validateSupabaseConfig } from '@/lib/config/env'

let supabaseInstance: SupabaseClient | null = null

/**
 * 🛰️ STAFF ENGINEER: Supabase Browser Singleton (Hardened)
 * 
 * Prevents 'TypeError: Failed to fetch' by intercepting invalid configurations
 * before they reach the browser's network layer.
 */
export function createClient() {
  if (supabaseInstance) return supabaseInstance

  const { isValid, missing } = validateSupabaseConfig()

  if (!isValid) {
    console.warn(`[Supabase CONFIG ERROR] Infrastucture missing: ${missing.join(', ')}. Using diagnostic stub.`)
    
    // 🛡️ Return a client with placeholder, but the ConfigGuard will intercept the UI.
    // We use a non-existent but syntactically valid URL to prevent crash during init.
    supabaseInstance = createBrowserClient(
      'https://missing-config.supabase.co',
      'missing-key'
    )
    return supabaseInstance
  }

  supabaseInstance = createBrowserClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY)
  return supabaseInstance
}
