import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Return a dummy client or throw a more helpful error that won't bridge build
    // During build, these might be missing if not provided in Vercel env
    return createBrowserClient(
      'https://dummy.supabase.co',
      'dummy-key'
    )
  }

  return createBrowserClient(url, key)
}
