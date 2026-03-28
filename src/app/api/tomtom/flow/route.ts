import { NextRequest, NextResponse } from 'next/server'
import { fetchWithRetry } from '@/lib/retry'

export async function GET(req: NextRequest) {
  const apiKey = process.env.TOMTOM_API_KEY
  if (!apiKey) return NextResponse.json(null)
  const sp = req.nextUrl.searchParams
  const lat = sp.get('lat')
  const lng = sp.get('lng')
  const zoom = sp.get('zoom') ?? '10'
  if (!lat || !lng) return NextResponse.json(null, { status: 400 })
  try {
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/${zoom}/json?point=${lat},${lng}&unit=kmph&key=${apiKey}`
    const res = await fetchWithRetry(
      url,
      { signal: AbortSignal.timeout(8_000) },
      { attempts: 2, baseMs: 500 },
    )
    if (!res.ok) return NextResponse.json(null, { status: res.status })
    const data = await res.json()
    return NextResponse.json(data.flowSegmentData ?? null, {
      headers: { 'Cache-Control': 'max-age=30, s-maxage=30' },
    })
  } catch {
    return NextResponse.json(null, { status: 503 })
  }
}
