import { NextRequest, NextResponse } from 'next/server'
import { fetchWeather } from '@/lib/api/tomtom'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const lat = parseFloat(sp.get('lat') ?? '0')
  const lng = parseFloat(sp.get('lng') ?? '0')

  if (!lat || !lng) return NextResponse.json(null, { status: 400 })

  try {
    const data = await fetchWeather(lat, lng)
    if (!data) return NextResponse.json(null, { status: 404 })

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'max-age=600, s-maxage=600' },
    })
  } catch {
    return NextResponse.json(null, { status: 503 })
  }
}
