import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // NOTE: This fallback prevents Vercel build failures during page prerendering.
    // If these are still missing at runtime, Supabase calls will fail gracefully or show this warning.
    console.warn('Supabase credentials missing. Check your .env.local or Vercel environment variables.')
    return createBrowserClient(
      'https://placeholder-project.supabase.co',
      'placeholder-key'
    )
  }

  return createBrowserClient(url, key, {
    auth: {
      // Resolve: Navigator LockManager returned a null lock
      // Standard fix for local HTTP/InPrivate environments where Web Locks API is restricted.
      // @ts-ignore - The underlying type may vary depending on the Supabase version
      lock: (name: string, acquire: () => Promise<any>) => acquire(),
    },
  })
}
