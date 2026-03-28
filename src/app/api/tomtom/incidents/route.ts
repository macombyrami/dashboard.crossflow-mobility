import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const apiKey = process.env.TOMTOM_API_KEY
  if (!apiKey) return NextResponse.json([])
  const bbox = req.nextUrl.searchParams.get('bbox') ?? ''
  if (!bbox) return NextResponse.json([], { status: 400 })
  try {
    const fields = '{incidents{type,geometry,properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers}}}'
    const url = `https://api.tomtom.com/traffic/services/5/incidentDetails.json?bbox=${bbox}&fields=${encodeURIComponent(fields)}&language=fr-FR&key=${apiKey}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return NextResponse.json([], { status: res.status })
    const data = await res.json()
    return NextResponse.json(data.incidents ?? [], {
      headers: { 'Cache-Control': 'max-age=60, s-maxage=60' },
    })
  } catch {
    return NextResponse.json([], { status: 503 })
  }
}
