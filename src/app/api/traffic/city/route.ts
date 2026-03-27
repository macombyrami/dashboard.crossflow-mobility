/**
 * GET /api/traffic/city
 *
 * Aggregated real-time traffic endpoint — fans out to all data sources in
 * parallel and returns a single merged payload. Replaces 3–4 separate
 * browser-initiated requests with one server-side call.
 *
 * Query params:
 *   lat     — latitude  (required)
 *   lng     — longitude (required)
 *   cityId  — city slug for cache namespacing (optional, defaults to coords)
 *
 * Cache: 30 seconds (shared across all users for the same city)
 * Response headers: X-Cache: HIT | MISS, X-Sources: comma-separated
 */

import { NextRequest, NextResponse } from 'next/server'
import { cache } from '@/lib/cache'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface SourceResult {
  ok:   boolean
  data: unknown
}

async function safeFetch(url: string, ttlMs = 8_000): Promise<SourceResult> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(ttlMs) })
    if (!res.ok) return { ok: false, data: null }
    return { ok: true, data: await res.json() }
  } catch {
    return { ok: false, data: null }
  }
}

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat    = parseFloat(searchParams.get('lat') ?? '0')
  const lng    = parseFloat(searchParams.get('lng') ?? '0')
  const cityId = searchParams.get('cityId') ?? `${Math.round(lat * 10)}_${Math.round(lng * 10)}`

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat et lng sont requis' }, { status: 400 })
  }

  const cacheKey = `traffic:city:${cityId}`
  const cached   = await cache.get<unknown>(cacheKey)
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, max-age=30' },
    })
  }

  // Fan-out: fetch all sources in parallel with independent timeouts
  const [tomtom, ratp, weather, sytadin] = await Promise.all([
    safeFetch(`${BASE}/api/tomtom/flow?lat=${lat}&lng=${lng}`,     6_000),
    safeFetch(`${BASE}/api/ratp-traffic`,                           8_000),
    safeFetch(`${BASE}/api/weather/openweather?lat=${lat}&lng=${lng}`, 6_000),
    safeFetch(`${BASE}/api/sytadin`,                                5_000),
  ])

  const sources = [
    tomtom.ok  ? 'tomtom'  : null,
    ratp.ok    ? 'ratp'    : null,
    weather.ok ? 'weather' : null,
    sytadin.ok ? 'sytadin' : null,
  ].filter(Boolean).join(',')

  const payload = {
    tomtom:    tomtom.data,
    ratp:      ratp.data,
    weather:   weather.data,
    sytadin:   sytadin.data,
    fetchedAt: new Date().toISOString(),
    cityId,
  }

  // Cache 30 seconds — all users for this city share the same fetch
  await cache.set(cacheKey, payload, 30)

  return NextResponse.json(payload, {
    headers: {
      'X-Cache':        'MISS',
      'X-Sources':      sources,
      'Cache-Control':  'public, max-age=30',
    },
  })
}
