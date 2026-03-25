import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const apiKey = process.env.TOMTOM_API_KEY
  if (!apiKey) return new NextResponse(null, { status: 503 })
  const { path } = await params
  const tilePath = path.join('/')
  const url = `https://api.tomtom.com/traffic/map/4/tile/${tilePath}.png?key=${apiKey}&tileSize=256`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) })
    if (!res.ok) return new NextResponse(null, { status: res.status })
    return new NextResponse(res.body, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}
