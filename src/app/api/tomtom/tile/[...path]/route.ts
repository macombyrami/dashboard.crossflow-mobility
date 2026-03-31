import { NextRequest, NextResponse } from 'next/server'

// In-memory cache to prevent redundant TomTom API calls.
// Note: This persists across requests within the same Node process.
const tileCache = new Map<string, { buffer: Buffer, type: string, timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 30 // 30 minutes cache for traffic tiles

/**
 * Artificial delay helper to throttle requests if needed.
 * Ensures we don't burst beyond TomTom's QPS limits during rapid panning.
 */
const throttle = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const apiKey = process.env.TOMTOM_API_KEY
  if (!apiKey) {
    console.error('[TomTom Proxy] API Key missing')
    return new NextResponse(null, { status: 503 })
  }

  const { path } = await params
  const tilePath = path.join('/')
  const cacheKey = tilePath

  // 1. Check Cache
  const cached = tileCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return new NextResponse(new Uint8Array(cached.buffer), {
      headers: {
        'Content-Type': cached.type,
        'Cache-Control': 'public, max-age=1800',
        'X-Cache': 'HIT',
      },
    })
  }

  const url = `https://api.tomtom.com/traffic/map/4/tile/${tilePath}.png?key=${apiKey}&tileSize=256`

  try {
    // 2. Throttle slightly to respect QPS during bursts
    await throttle(20)

    const res = await fetch(url, { 
      signal: AbortSignal.timeout(10_000),
      headers: { 'Accept': 'image/png' }
    })

    if (!res.ok) {
      if (res.status === 429 || res.status === 503) {
        console.warn(`[TomTom Proxy] Upstream oversight: ${res.status} for ${tilePath}`)
      }
      return new NextResponse(null, { status: res.status })
    }

    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const contentType = res.headers.get('Content-Type') || 'image/png'

    // 3. Store in Cache
    tileCache.set(cacheKey, {
      buffer,
      type: contentType,
      timestamp: Date.now()
    })

    // Housekeeping: prevent cache from growing indefinitely (max 2000 tiles)
    if (tileCache.size > 2000) {
      const firstKey = tileCache.keys().next().value
      if (firstKey) tileCache.delete(firstKey)
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=1800',
        'X-Cache': 'MISS',
      },
    })
  } catch (err) {
    console.error('[TomTom Proxy] Fetch error:', err)
    return new NextResponse(null, { status: 503 })
  }
}
