import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) return NextResponse.json(null, { status: 503 })
  const sp = req.nextUrl.searchParams
  const lat = sp.get('lat')
  const lng = sp.get('lng')
  if (!lat || !lng) return NextResponse.json(null, { status: 400 })
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=fr`
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) })
    if (!res.ok) return NextResponse.json(null, { status: res.status })
    const d = await res.json()
    const rain = d.rain?.['1h'] > 0 || d.weather?.[0]?.main === 'Rain'
    const snow = d.snow?.['1h'] > 0 || d.weather?.[0]?.main === 'Snow'
    const vis  = d.visibility ?? 10000
    const trafficImpact =
      snow || vis < 500   ? 'severe'   :
      rain || vis < 2000  ? 'moderate' :
      d.wind?.speed > 15  ? 'minor'    : 'none'
    return NextResponse.json({
      temp:          Math.round(d.main?.temp ?? 0),
      description:   d.weather?.[0]?.description ?? '',
      icon:          d.weather?.[0]?.icon ?? '',
      wind:          Math.round(d.wind?.speed ?? 0),
      rain,
      snow,
      visibility:    vis,
      trafficImpact,
    }, { headers: { 'Cache-Control': 'max-age=600, s-maxage=600' } })
  } catch {
    return NextResponse.json(null, { status: 503 })
  }
}
