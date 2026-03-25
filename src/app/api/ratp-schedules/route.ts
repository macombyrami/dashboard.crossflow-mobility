/**
 * /api/ratp-schedules
 * Proxy server-side pour les horaires Pierre Grimaud (évite CORS navigateur)
 */

import { NextResponse } from 'next/server'

const PG_BASE = 'https://api-ratp.pierre-grimaud.fr/v3'
const UA      = 'Mozilla/5.0 (compatible; CrossFlow/1.0)'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type    = searchParams.get('type')    ?? 'metros'
  const station = searchParams.get('station') ?? ''

  if (!station) {
    return NextResponse.json({ error: 'station required' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `${PG_BASE}/schedules/${type}/${encodeURIComponent(station)}/A+R`,
      {
        headers: { 'User-Agent': UA, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      },
    )
    if (!res.ok) {
      return NextResponse.json({ schedules: [] }, { status: 200 })
    }
    const data = await res.json()
    return NextResponse.json(
      { schedules: data?.result?.schedules ?? [] },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=15' } },
    )
  } catch {
    return NextResponse.json({ schedules: [] })
  }
}
