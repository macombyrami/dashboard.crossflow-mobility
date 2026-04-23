import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const apiKey = process.env.TICKETMASTER_API_KEY
  if (!apiKey) return NextResponse.json([])
  const sp = req.nextUrl.searchParams
  const lat = sp.get('lat')
  const lng = sp.get('lng')
  const radius = sp.get('radius') ?? '15'
  if (!lat || !lng) return NextResponse.json([], { status: 400 })
  try {
    const today    = new Date().toISOString().slice(0, 16) + ':00Z'
    const in14days = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 16) + ':00Z'
    const params = new URLSearchParams({
      apikey:        apiKey,
      latlong:       `${lat},${lng}`,
      radius,
      unit:          'km',
      startDateTime: today,
      endDateTime:   in14days,
      countryCode:   'FR',
      sort:          'relevance,desc',
      size:          '20',
    })
    const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`, {
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return NextResponse.json([])
    const data = await res.json()
    return NextResponse.json(data._embedded?.events ?? [], {
      headers: { 'Cache-Control': 'max-age=3600, s-maxage=3600' },
    })
  } catch {
    return NextResponse.json([])
  }
}
