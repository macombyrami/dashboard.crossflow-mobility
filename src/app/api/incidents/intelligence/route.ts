import { NextRequest, NextResponse } from 'next/server'
import { fetchSytadinRaw } from '@/lib/api/sytadin'
import { serverFetchIncidents } from '@/lib/api/tomtom/server'
import { mergeIncidents, normalizeTomTomIncident, parseSytadinHtmlToIncidents } from '@/lib/incidents/intelligence'

export async function GET(request: NextRequest) {
  const bbox = request.nextUrl.searchParams.get('bbox') ?? '2.2241,48.8156,2.4699,48.9022'

  try {
    const [sytadinRaw, tomtomRaw] = await Promise.allSettled([
      fetchSytadinRaw('alerts'),
      serverFetchIncidents(bbox),
    ])

    const sytadinIncidents =
      sytadinRaw.status === 'fulfilled' && sytadinRaw.value.html
        ? parseSytadinHtmlToIncidents(sytadinRaw.value.html)
        : []

    const tomtomIncidents =
      tomtomRaw.status === 'fulfilled'
        ? tomtomRaw.value.map(normalizeTomTomIncident).filter((item): item is NonNullable<typeof item> => Boolean(item))
        : []

    const incidents = mergeIncidents([...sytadinIncidents, ...tomtomIncidents])

    return NextResponse.json(
      {
        incidents,
        meta: {
          total: incidents.length,
          sytadin: sytadinIncidents.length,
          tomtom: tomtomIncidents.length,
          fetchedAt: new Date().toISOString(),
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
        },
      },
    )
  } catch (error) {
    console.error('[api/incidents/intelligence] pipeline error:', error)
    return NextResponse.json(
      {
        incidents: [],
        meta: {
          total: 0,
          sytadin: 0,
          tomtom: 0,
          fetchedAt: new Date().toISOString(),
        },
      },
      { status: 200 },
    )
  }
}
