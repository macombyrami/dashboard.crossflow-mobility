/**
 * Fix: /api/social/intelligence
 *
 * Bug: was using createClient() with anon key server-side.
 * For server-to-server internal queries, use the service role key so that
 * RLS doesn't block reads on the social_intelligence_events table.
 *
 * If SUPABASE_SERVICE_ROLE_KEY is not set, falls back to anon key (dev mode).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cache } from '@/lib/cache'

const CACHE_KEY = 'social:intelligence:events'
const CACHE_TTL = 60 // 60s — fresh enough for the dashboard

function getSupabase() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key     = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase credentials not configured')
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

/**
 * GET /api/social/intelligence
 * Returns synthesized urban intelligence events from the social layer.
 * Cached for 60s to reduce DB load.
 */
export async function GET(_req: NextRequest) {
  // Return cached version if available
  const hit = await cache.get<unknown[]>(CACHE_KEY)
  if (hit) {
    return NextResponse.json({
      events:    hit,
      timestamp: new Date().toISOString(),
      status:    'success',
      cached:    true,
    }, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' },
    })
  }

  try {
    const supabase = getSupabase()

    const { data: events, error } = await supabase
      .from('social_intelligence_events')
      .select('*')
      .eq('status', 'active')
      .order('severity', { ascending: false })
      .limit(10)

    if (error) throw error

    const result = events ?? []
    await cache.set(CACHE_KEY, result, CACHE_TTL)

    return NextResponse.json({
      events:    result,
      timestamp: new Date().toISOString(),
      status:    'success',
      cached:    false,
    }, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' },
    })
  } catch (err: any) {
    console.error('[Intelligence API] Error:', err.message)

    // Return empty events instead of 500 to prevent dashboard from breaking
    return NextResponse.json({
      events:    [],
      timestamp: new Date().toISOString(),
      status:    'degraded',
      error:     process.env.NODE_ENV === 'development' ? err.message : 'Service momentanément indisponible',
    }, { status: 200 }) // 200 with degraded status to avoid UI crash
  }
}
