import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const pathname = request.nextUrl.pathname
  const isPublic = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/auth') || pathname === '/robots.txt' || pathname === '/sitemap.xml'
  const isOnboarding = pathname.startsWith('/onboarding')

  if (!url || !key) {
    // 🛰️ STAFF ENGINEER: Supabase not configured — still allow Landing Page
    if (!isPublic) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }
    return supabaseResponse
  }

  const supabase = createServerClient(
    url,
    key,
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

  // ⚡ STAFF ENGINEER PERFORMANCE: Skip session refresh for Public Entry Points
  // This avoids expensive network calls and fixes 504 Middleware Timeouts.
  if (isPublic) {
    return supabaseResponse
  }

  // Refreshing the auth token (only for protected routes)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // An account is considered onboarded if:
  // - the explicit flag is set, OR
  // - it already has a default_city (account predates onboarding feature)
  function isOnboardingDone(u: typeof user): boolean {
    if (!u) return false
    const meta = u.user_metadata ?? {}
    return meta.onboarding_completed === true || Boolean(meta.default_city)
  }

  // Logic continues using the synchronized isPublic/isOnboarding flags

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isPublic) {
    const needsOnboarding = !isOnboardingDone(user)
    const url = request.nextUrl.clone()
    url.pathname = needsOnboarding ? '/onboarding' : '/map'
    return NextResponse.redirect(url)
  }

  // Authenticated user not yet onboarded → force onboarding (only for brand-new accounts)
  if (user && !isOnboarding && !isPublic) {
    if (!isOnboardingDone(user)) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
