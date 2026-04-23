import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const apiKey = process.env.HERE_API_KEY
  if (!apiKey) return NextResponse.json([])
  const bbox = req.nextUrl.searchParams.get('bbox') ?? ''
  if (!bbox) return NextResponse.json([], { status: 400 })
  const [west, south, east, north] = bbox.split(',')
  try {
    const res = await fetch(
      `https://data.traffic.hereapi.com/v7/flow?locationReferencing=shape&in=bbox:${west},${south},${east},${north}&apiKey=${apiKey}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    if (!res.ok) return NextResponse.json([])
    const data = await res.json()
    return NextResponse.json(data.results ?? [], {
      headers: { 'Cache-Control': 'max-age=30, s-maxage=30' },
    })
  } catch {
    return NextResponse.json([])
  }
}
