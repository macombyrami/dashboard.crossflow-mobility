import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.navitia.io/v1'

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const apiKey = process.env.NAVITIA_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'NAVITIA_API_KEY not set' }, { status: 503 })
  const { path } = await params
  const search = req.nextUrl.search
  try {
    const res = await fetch(`${BASE}/${path.join('/')}${search}`, {
      headers: { Authorization: apiKey },
      signal:  AbortSignal.timeout(10_000),
    })
    const data = await res.text()
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=60' },
    })
  } catch {
    return NextResponse.json({ error: 'Navitia unavailable' }, { status: 503 })
  }
}
