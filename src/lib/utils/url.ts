/**
 * getBaseUrl — URL de base de l'application (dev vs production)
 *
 * Ordre de priorité :
 *   1. NEXT_PUBLIC_APP_URL (défini en prod sur Vercel)
 *   2. VERCEL_URL (injecté automatiquement par Vercel, sans https://)
 *   3. window.location.origin (client-side dev fallback)
 *   4. http://localhost:3000 (ultime fallback SSR)
 *
 * ⚠️  Ne jamais exposer de secrets ici — tout est NEXT_PUBLIC_*.
 */

export function getBaseUrl(): string {
  // 1. Variable explicite en production (toujours prioritaire)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '') // strip trailing slash
  }

  // 2. Vercel auto-inject (SSR only, format: my-app.vercel.app — no scheme)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // 3. Browser: use current origin (safe in dev, but should not happen in prod
  //    because NEXT_PUBLIC_APP_URL should be set)
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // 4. SSR dev fallback
  return 'http://localhost:3000'
}

/**
 * Retourne l'URL de callback auth — toujours sur le bon domaine.
 * Utilisé dans signUp / signInWithOtp / signInWithOAuth.
 */
export function getAuthCallbackUrl(next = '/map'): string {
  return `${getBaseUrl()}/auth/callback?next=${encodeURIComponent(next)}`
}

/**
 * Valide qu'une URL de redirect est sûre (même domaine).
 * Protège contre les Open Redirects.
 */
export function isSafeRedirect(url: string): boolean {
  try {
    const base    = new URL(getBaseUrl())
    const target  = new URL(url, getBaseUrl())
    return target.hostname === base.hostname
  } catch {
    return false
  }
}
