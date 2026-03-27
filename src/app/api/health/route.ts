/**
 * GET /api/health
 *
 * Unified health check for all external services and the predictive backend.
 * Used by the dashboard status panel and ops monitoring.
 *
 * Cache: 15 seconds
 *
 * Response shape:
 * {
 *   status: 'ok' | 'degraded' | 'down',
 *   services: {
 *     [name]: { status: 'up'|'down'|'unknown', latencyMs?: number }
 *   },
 *   checkedAt: ISO string
 * }
 */

import { NextResponse } from 'next/server'
import { cache } from '@/lib/cache'

const CACHE_KEY = 'health:all'
const CACHE_TTL = 15  // seconds

interface ServiceHealth {
  status:     'up' | 'down' | 'unknown'
  latencyMs?: number
  detail?:    string
}

async function probe(url: string, timeoutMs = 5_000): Promise<ServiceHealth> {
  const t0 = Date.now()
  try {
    const res = await fetch(url, {
      signal:  AbortSignal.timeout(timeoutMs),
      method:  'HEAD',
    })
    const latencyMs = Date.now() - t0
    return { status: res.ok ? 'up' : 'down', latencyMs }
  } catch (e) {
    return { status: 'down', latencyMs: Date.now() - t0, detail: e instanceof Error ? e.message : 'timeout' }
  }
}

async function probeJson(url: string, timeoutMs = 5_000): Promise<ServiceHealth> {
  const t0 = Date.now()
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    const latencyMs = Date.now() - t0
    if (!res.ok) return { status: 'down', latencyMs }
    return { status: 'up', latencyMs }
  } catch (e) {
    return { status: 'down', latencyMs: Date.now() - t0, detail: e instanceof Error ? e.message : 'timeout' }
  }
}

export async function GET() {
  const cached = await cache.get<unknown>(CACHE_KEY)
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, max-age=15' },
    })
  }

  const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const PREDICTIVE_URL = process.env.PREDICTIVE_BACKEND_URL ?? 'http://localhost:8000'

  const UNKNOWN: ServiceHealth = { status: 'unknown' }

  // allSettled: a thrown/hung probe never blocks the others
  const results = await Promise.allSettled([
    probeJson(`${BASE}/api/tomtom/flow?lat=48.85&lng=2.35`,                    4_000),
    probeJson(`${BASE}/api/ratp-traffic`,                                       6_000),
    probe('https://overpass-api.de/api/status',                                4_000),
    probe('https://www.sytadin.fr',                                             4_000),
    probeJson(`${PREDICTIVE_URL}/health`,                                       4_000),
    probe(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://supabase.com',      4_000),
  ])
  const [tomtom, ratp, overpass, sytadin, predictive, supabase] = results.map(r =>
    r.status === 'fulfilled' ? r.value : UNKNOWN,
  )

  const services: Record<string, ServiceHealth> = {
    tomtom,
    ratp,
    overpass,
    sytadin,
    predictive,
    supabase,
  }

  const statuses = Object.values(services).map(s => s.status)
  const downs    = statuses.filter(s => s === 'down').length
  const overall  = downs === 0 ? 'ok' : downs >= statuses.length / 2 ? 'down' : 'degraded'

  const payload = {
    status:     overall,
    services,
    checkedAt:  new Date().toISOString(),
    cacheBackend: process.env.UPSTASH_REDIS_REST_URL ? 'redis' : 'memory',
  }

  await cache.set(CACHE_KEY, payload, CACHE_TTL)

  return NextResponse.json(payload, {
    headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, max-age=15' },
  })
}
