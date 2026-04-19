import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const apiKey = process.env.HERE_API_KEY
  if (!apiKey) return NextResponse.json([])
  const bbox = req.nextUrl.searchParams.get('bbox') ?? ''
  if (!bbox) return NextResponse.json([], { status: 400 })
  const [west, south, east, north] = bbox.split(',')
  try {
    const res = await fetch(
      `https://incidents.traffic.ls.hereapi.com/traffic/6.3/incidents.json?bbox=${north},${west},${south},${east}&criticality=minor,major,critical&apiKey=${apiKey}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    if (!res.ok) return NextResponse.json([])
    const data = await res.json()
    return NextResponse.json(data.TRAFFIC_ITEMS?.TRAFFIC_ITEM ?? [], {
      headers: { 'Cache-Control': 'max-age=60, s-maxage=60' },
    })
  } catch {
    return NextResponse.json([])
  }
}
