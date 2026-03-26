import { NextResponse } from 'next/server'
import { USER_AGENT_FULL } from '@/lib/app-config'

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
        'User-Agent':      USER_AGENT_FULL,
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Accept':          'text/html,application/xhtml+xml',
      },
      next: { revalidate: 180 }, // 3 minutes — matches Sytadin's own refresh
      signal: AbortSignal.timeout(5000), // Timeout after 5s
    })

    if (!res.ok) {
      console.warn(`[Sytadin Proxy] Upstream error ${res.status} for ${ep}. Using fallback.`)
      return new NextResponse(getFallbackHtml(ep), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Sytadin-Fallback': 'true' }
      })
    }

    const html = await res.text()
    return new NextResponse(html, {
      headers: {
        'Content-Type':  'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=60',
        'X-Sytadin-Fallback': 'false'
      },
    })
  } catch (err) {
    console.error(`[Sytadin Proxy] Critical error for ${ep}:`, err)
    return new NextResponse(getFallbackHtml(ep), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Sytadin-Fallback': 'true' }
    })
  }
}

function getFallbackHtml(endpoint: string): string {
  const now = new Date().toISOString().replace('T', ' ').split('.')[0]
  if (endpoint === 'alerts') {
    return `
      <div id="alert_block">
        <ul>
          <li><a href="#f1" title="FLASH/A1 Direction Paris Bouchon à Saint-Denis (Flux de secours)">FLASH/A1 Direction Paris Bouchon à Saint-Denis (Flux de secours)</a></li>
          <li><a href="#f2" title="INFO/A86 Extérieur Travaux à Nanterre (Flux de secours)">INFO/A86 Extérieur Travaux à Nanterre (Flux de secours)</a></li>
          <li><a href="#f3" title="!FLASH/BP Extérieur Accident à Porte de Bagnolet (Flux de secours)">!FLASH/BP Extérieur Accident à Porte de Bagnolet (Flux de secours)</a></li>
        </ul>
        <!-- date donnees : ${now} -->
        <!-- degrade : true -->
      </div>
    `
  }
  return `<div id="congestion_block"><img alt="18 km" src="led_number_18.gif" title="18 km de bouchons (Flux de secours)"></div>`
}
