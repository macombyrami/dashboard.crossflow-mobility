import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat') ?? '48.8566'
  const lng = req.nextUrl.searchParams.get('lng') ?? '2.3522'

  try {
    const res = await fetch(
      `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${process.env.NEXT_PUBLIC_AQICN_API_KEY}`
    )
    const data = await res.json()

    return NextResponse.json(data.data, {
      headers: { 'Cache-Control': 'max-age=3600' },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Air quality fetch failed' }, { status: 500 })
  }
}
