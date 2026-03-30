import { NextRequest, NextResponse } from 'next/server'
import { fetchFlowSegment } from '@/lib/api/tomtom'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const lat = parseFloat(sp.get('lat') ?? '0')
  const lng = parseFloat(sp.get('lng') ?? '0')
  const zoom = parseInt(sp.get('zoom') ?? '10', 10)

  if (!lat || !lng) return NextResponse.json(null, { status: 400 })

  try {
    const data = await fetchFlowSegment(lat, lng, zoom)
    if (!data) return NextResponse.json(null, { status: 404 })

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'max-age=30, s-maxage=30' },
    })
  } catch {
    return NextResponse.json(null, { status: 503 })
  }
}
