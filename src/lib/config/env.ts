/**
 * 🛰️ STAFF ENGINEER: Environment Configuration (Safe-Type Layer)
 * 
 * Prevents "undefined" string comparison errors and runtime crashes 
 * by validating environment variables at the start of every request.
 */

export const ENV = {
  SUPABASE_URL:      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  IS_DEV:            process.env.NODE_ENV === 'development',
}

/**
 * Validates if the core Supabase infrastructure is configured.
 * 🚀 Fix 3: Returns a diagnostic object instead of a boolean for granular reporting.
 */
export function validateSupabaseConfig() {
  const issues: string[] = []
  
  if (!ENV.SUPABASE_URL || ENV.SUPABASE_URL.includes('placeholder')) {
    issues.push('NEXT_PUBLIC_SUPABASE_URL')
  }
  
  if (!ENV.SUPABASE_ANON_KEY || ENV.SUPABASE_ANON_KEY.length < 20) {
    issues.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return {
    isValid: issues.length === 0,
    missing: issues,
  }
}
