import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ENV, validateSupabaseConfig } from '@/lib/config/env'

/**
 * 🚀 Fix 3: Resilient Session Handler (SaaS Standard)
 * 
 * Logic Flow:
 * 1. Validate environment configuration.
 * 2. If invalid, inject 'X-Supabase-Misconfigured' header and return NextResponse.next().
 * 3. Prevents infinite loop by allowing the route to resolve, then showing UI diagnostic.
 */
export async function updateSession(request: NextRequest) {
  const { isValid, missing } = validateSupabaseConfig()
  const pathname = request.nextUrl.pathname
  const isPublic = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/auth') || pathname === '/robots.txt' || pathname === '/sitemap.xml'
  
  if (!isValid) {
    if (isPublic) return NextResponse.next({ request })

    // 🛰️ STAFF ENGINEER: Diagnostic Fallback (Fix 3)
    // Instead of redirecting back to /login (The Loop), we resolve the request
    // but signal the UI that the backend is non-functional.
    const response = NextResponse.next({ request })
    response.headers.set('X-Supabase-Misconfigured', missing.join(','))
    
    // Also set a temporary cookie for client-side detection if needed
    response.cookies.set('sb_config_error', 'true', { maxAge: 60 })
    
    return response
  }

  // --- Normal Auth Flow ---

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    ENV.SUPABASE_URL,
    ENV.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ⚡ Performance Optimized Skip for Public Pages
  if (isPublic) {
    return supabaseResponse
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Onboarding Logic (Redundant check but good for safety)
  function isOnboardingDone(u: typeof user): boolean {
    if (!u) return false
    const meta = u.user_metadata ?? {}
    return meta.onboarding_completed === true || Boolean(meta.default_city)
  }

  // Redirect Logic
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If onboarded, don't stay in onboarding flow
  if (user && pathname.startsWith('/onboarding') && isOnboardingDone(user)) {
    const url = request.nextUrl.clone()
    url.pathname = '/map'
    return NextResponse.redirect(url)
  }

  // If not onboarded, force onboarding
  if (user && !pathname.startsWith('/onboarding') && !isOnboardingDone(user)) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
