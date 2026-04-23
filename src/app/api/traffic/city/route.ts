import { NextRequest, NextResponse } from 'next/server'
import { cache } from '@/lib/cache'
import { fetchFlowSegment, fetchWeather } from '@/lib/api/tomtom'
import { fetchSytadinData } from '@/lib/api/sytadin'

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
  const cached   = await cache.get<any>(cacheKey)
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, max-age=30' },
    })
  }

  // Fan-out: fetch all sources in parallel WITH DIRECT SERVER-SIDE CALLS
  // No internal HTTP fetch — this is the key to resilience on Vercel
  const [tomtom, weather, sytadin] = await Promise.all([
    fetchFlowSegment(lat, lng).catch(() => null),
    fetchWeather(lat, lng).catch(() => null),
    fetchSytadinData().catch(() => null),
  ])

  const sources = [
    tomtom  ? 'tomtom'  : null,
    weather ? 'weather' : null,
    sytadin ? 'sytadin' : null,
  ].filter(Boolean).join(',')

  const payload = {
    tomtom,
    ratp:      null, // RATP logic to be refactored next if needed
    weather,
    sytadin,
    fetchedAt: new Date().toISOString(),
    cityId,
  }

  // Cache 30 seconds
  await cache.set(cacheKey, payload, 30)

  return NextResponse.json(payload, {
    headers: {
      'X-Cache':        'MISS',
      'X-Sources':      sources,
      'Cache-Control':  'public, max-age=30',
    },
  })
}
