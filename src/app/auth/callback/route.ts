import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getBaseUrl, isSafeRedirect } from '@/lib/utils/url'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/map'

  // ── Base URL toujours basé sur NEXT_PUBLIC_APP_URL (jamais localhost en prod) ──
  const base = getBaseUrl()

  // ── Sécurité Open Redirect ─────────────────────────────────────────────────
  const redirectPath = isSafeRedirect(next)
    ? next                       // relatif => safe
    : isSafeRedirect(`${base}${next}`)
      ? next
      : '/map'                   // fallback sûr

  if (!code) {
    return NextResponse.redirect(`${base}/login?error=auth-code-error`)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(`${base}/login?error=auth-config-error`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component context — middleware handles refresh
          }
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    return NextResponse.redirect(`${base}/login?error=auth-code-error`)
  }

  // ✅ Toujours rediriger vers le bon domaine — jamais localhost en prod
  return NextResponse.redirect(`${base}${redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`}`)
}
