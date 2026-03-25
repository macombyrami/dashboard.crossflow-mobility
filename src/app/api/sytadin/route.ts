import { NextResponse } from 'next/server'

const ENDPOINTS = {
  alerts:     'https://www.sytadin.fr/refreshed/alert_block.jsp.html',
  congestion: 'https://www.sytadin.fr/refreshed/cumul_bouchon.jsp.html',
} as const

/**
 * Server-side proxy for Sytadin.fr (DiRIF)
 * Avoids browser CORS restrictions. Caches 3 min (Sytadin's refresh rate).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ep = (searchParams.get('endpoint') ?? 'alerts') as keyof typeof ENDPOINTS

  const url = ENDPOINTS[ep]
  if (!url) {
    return NextResponse.json({ error: 'Unknown endpoint' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      'CrossFlow-Mobility/1.0 (traffic dashboard; contact@crossflow-mobility.com)',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Accept':          'text/html,application/xhtml+xml',
      },
      next: { revalidate: 180 }, // 3 minutes — matches Sytadin's own refresh
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Sytadin upstream error: ${res.status}` },
        { status: 502 },
      )
    }

    const html = await res.text()
    return new NextResponse(html, {
      headers: {
        'Content-Type':  'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=60',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to reach Sytadin' },
      { status: 503 },
    )
  }
}
