import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.openrouteservice.org'

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const apiKey = process.env.ORS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ORS_API_KEY not set' }, { status: 503 })
  const { path } = await params
  const search = req.nextUrl.search
  try {
    const res = await fetch(`${BASE}/${path.join('/')}${search}`, {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.text()
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=60' },
    })
  } catch {
    return NextResponse.json({ error: 'ORS unavailable' }, { status: 503 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const apiKey = process.env.ORS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ORS_API_KEY not set' }, { status: 503 })
  const { path } = await params
  const body = await req.text()
  try {
    const res = await fetch(`${BASE}/${path.join('/')}`, {
      method: 'POST',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.text()
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return NextResponse.json({ error: 'ORS unavailable' }, { status: 503 })
  }
}
