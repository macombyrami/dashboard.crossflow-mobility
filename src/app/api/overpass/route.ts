import { NextRequest, NextResponse } from 'next/server'

const OVERPASS_BASE = 'https://overpass-api.de/api/interpreter'

// Simple in-memory cache: cacheKey → { data, expiresAt }
const cache = new Map<string, { data: unknown; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 1_000 // 1 hour

export async function POST(req: NextRequest) {
  let body: string
  try {
    body = await req.text()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Strip the "data=" prefix if present (form-encoded)
  const rawQuery = body.startsWith('data=')
    ? decodeURIComponent(body.slice(5))
    : body

  const cacheKey = rawQuery.trim()
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: { 'X-Cache': 'HIT', 'Cache-Control': 'max-age=3600' },
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
    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS })
    return NextResponse.json(data, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'max-age=3600' },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'timeout'
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
