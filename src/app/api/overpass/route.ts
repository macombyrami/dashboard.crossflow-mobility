import { NextRequest, NextResponse } from 'next/server'
import { cache } from '@/lib/cache'

const OVERPASS_BASE = 'https://overpass-api.de/api/interpreter'
const CACHE_TTL_SEC = 3_600 // 1 hour — shared across all instances via Redis

export async function POST(req: NextRequest) {
  let body: string
  try {
    body = await req.text()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const rawQuery = body.startsWith('data=')
    ? decodeURIComponent(body.slice(5))
    : body

  // Use first 200 chars as cache key fingerprint (queries can be large)
  const cacheKey = `overpass:${rawQuery.trim()}`

  const cached = await cache.get<unknown>(cacheKey)
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'X-Cache': 'HIT', 'Cache-Control': `public, max-age=${CACHE_TTL_SEC}` },
    })
  }

  try {
    const res = await fetch(OVERPASS_BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `data=${encodeURIComponent(rawQuery)}`,
      signal:  AbortSignal.timeout(40_000),
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Overpass error', status: res.status }, { status: res.status })
    }
    const data = await res.json()
    await cache.set(cacheKey, data, CACHE_TTL_SEC)
    return NextResponse.json(data, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': `public, max-age=${CACHE_TTL_SEC}` },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'timeout'
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
