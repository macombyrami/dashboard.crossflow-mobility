import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ENV, validateSupabaseConfig } from '@/lib/config/env'

/**
 * 🚀 Hardened Session Handler
 *
 * Security & Resilience checklist:
 * ✔ API routes are NEVER redirected (prevents API 404 → /login CORS hell)
 * ✔ Anti-loop cookie: prevents onboarding triangle redirect
 * ✔ Diagnostic fallback: missing env → pass-through instead of loop
 * ✔ getUser() only called on protected routes (saves Supabase quota)
 */
export async function updateSession(request: NextRequest) {
  const { isValid, missing } = validateSupabaseConfig()
  const pathname             = request.nextUrl.pathname

  // ─── Route classification ─────────────────────────────────────────────────
  const isApiRoute  = pathname.startsWith('/api/')
  const isPublic    = (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/not-found'
  )

  // API routes are NEVER redirected — they handle their own auth
  if (isApiRoute) return NextResponse.next({ request })

  // ─── Env diagnostic fallback (no loop) ───────────────────────────────
  if (!isValid) {
    if (isPublic) return NextResponse.next({ request })
    const response = NextResponse.next({ request })
    response.headers.set('X-Supabase-Misconfigured', missing.join(','))
    response.cookies.set('sb_config_error', 'true', { maxAge: 60, sameSite: 'lax', httpOnly: true })
    return response
  }

  // ─── Build Supabase client ──────────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    ENV.SUPABASE_URL,
    ENV.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Skip getUser() entirely for public routes (saves Supabase auth quota)
  if (isPublic) return supabaseResponse

  // ─── Session check ──────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()

  // Not authenticated — redirect to login with ?next= for post-login return
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Preserve the original path for redirect-back, but strip to avoid open redirect
    const safePath = pathname.startsWith('/') ? pathname : '/map'
    url.searchParams.set('next', safePath)
    return NextResponse.redirect(url)
  }

  // ─── Onboarding logic ─────────────────────────────────────────────
  const meta           = user.user_metadata ?? {}
  const onboardingDone = meta.onboarding_completed === true || Boolean(meta.default_city)
  const inOnboarding   = pathname.startsWith('/onboarding')

  // Anti-loop guard: track redirects via short-lived cookie
  const redirectCount  = parseInt(request.cookies.get('cf_redirect_count')?.value ?? '0', 10)
  if (redirectCount >= 3) {
    // Break the loop — let the user through and clear the counter
    supabaseResponse.cookies.set('cf_redirect_count', '0', { maxAge: 0 })
    return supabaseResponse
  }

  function bumpRedirectCount(response: NextResponse) {
    response.cookies.set('cf_redirect_count', String(redirectCount + 1), {
      maxAge:  10,
      sameSite: 'lax',
      httpOnly: true,
    })
    return response
  }

  // Onboarding done but still on /onboarding → go to /map
  if (onboardingDone && inOnboarding) {
    const url = request.nextUrl.clone()
    url.pathname = '/map'
    return bumpRedirectCount(NextResponse.redirect(url))
  }

  // Not onboarded and NOT already on /onboarding → force onboarding
  // Guard: only redirect if user actually needs it (avoids edge cases with
  // new OAuth signups where metadata might be delayed by Supabase)
  if (!onboardingDone && !inOnboarding && user.created_at) {
    const accountAgeMs = Date.now() - new Date(user.created_at).getTime()
    const isNewAccount = accountAgeMs < 5 * 60 * 1000 // 5 minutes grace period
    if (!isNewAccount) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return bumpRedirectCount(NextResponse.redirect(url))
    }
  }

  // Clear redirect counter on successful pass-through
  supabaseResponse.cookies.set('cf_redirect_count', '0', { maxAge: 0 })
  return supabaseResponse
}
