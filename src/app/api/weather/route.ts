import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat') ?? '48.8566'
  const lng = req.nextUrl.searchParams.get('lng') ?? '2.3522'

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,humidity_2m,uv_index,precipitation&hourly=temperature_2m,precipitation,pm2_5,pm10&daily=weather_code,temperature_2max,temperature_2min&timezone=Europe/Paris`
    )
    const data = await res.json()

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'max-age=3600' },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Weather fetch failed' }, { status: 500 })
  }
}
