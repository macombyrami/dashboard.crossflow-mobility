import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { headers } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const authHeader = headerStore.get('Authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

  if (!url || !key) {
    return createServerClient(
      'https://placeholder-project.supabase.co',
      'placeholder-key',
      { cookies: { getAll: () => [], setAll: () => {} } }
    )
  }

  // 🛰️ Staff Engineer Auth Harmonization
  // If a Bearer token is provided (script/API call), use it to initialize the global client.
  // Otherwise, fallback to browser cookies.
  const options: any = {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet: any[]) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {}
      },
    }
  }

  if (bearerToken) {
    options.global = {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      }
    }
  }

  return createServerClient(url, key, options)
}
