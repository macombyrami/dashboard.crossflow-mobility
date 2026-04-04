import { NextResponse } from 'next/server'
import { fetchSytadinRaw } from '@/lib/api/sytadin'

/**
 * Server-side proxy for Sytadin.fr (DiRIF)
 * Avoids browser CORS restrictions. Caches 3 min (Sytadin's refresh rate).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  // Support both 'endpoint' and 'type' (alias)
  const endpointParam = searchParams.get('endpoint') || searchParams.get('type')
  const ep = (endpointParam ?? 'alerts') as 'alerts' | 'congestion'

  try {
    const { html, degraded } = await fetchSytadinRaw(ep)

    if (!html) {
      console.warn(`[Sytadin Proxy] Upstream error or empty response for ${ep}. Using fallback.`)
      return new NextResponse(getFallbackHtml(ep), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Sytadin-Fallback': 'true' }
      })
    }

    return new NextResponse(html, {
      headers: {
        'Content-Type':  'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120',
        'X-Sytadin-Fallback': degraded ? 'true' : 'false'
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
