import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const apiKey = process.env.PREDICTHQ_API_KEY
  if (!apiKey) return NextResponse.json([])
  const sp = req.nextUrl.searchParams
  const lat = sp.get('lat')
  const lng = sp.get('lng')
  const radius = sp.get('radius') ?? '10'
  if (!lat || !lng) return NextResponse.json([], { status: 400 })
  try {
    const today   = new Date().toISOString().slice(0, 10)
    const in7days = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
    const params = new URLSearchParams({
      'within':    `${radius}km@${lat},${lng}`,
      'start.gte': today,
      'start.lte': in7days,
      'sort':      '-rank',
      'limit':     '20',
      'category':  'concerts,sports,expos,community,conferences,disasters,public-holidays',
    })
    const res = await fetch(`https://api.predicthq.com/v1/events/?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal:  AbortSignal.timeout(8_000),
    })
    if (!res.ok) return NextResponse.json([])
    const data = await res.json()
    return NextResponse.json(data.results ?? [], {
      headers: { 'Cache-Control': 'max-age=3600, s-maxage=3600' },
    })
  } catch {
    return NextResponse.json([])
  }
}
