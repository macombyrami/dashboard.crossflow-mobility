import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const bbox = req.nextUrl.searchParams.get('bbox') ?? ''
  const types = (req.nextUrl.searchParams.get('types') ?? 'parking,shop,station').split(',')

  if (!bbox) {
    return NextResponse.json({ error: 'Missing bbox' }, { status: 400 })
  }

  const filters = types
    .map(type => {
      switch (type.trim()) {
        case 'parking': return 'node["amenity"="parking"]'
        case 'shop': return 'node["shop"]'
        case 'station': return 'node["public_transport"="stop_position"]'
        case 'restaurant': return 'node["amenity"="restaurant"]'
        case 'hospital': return 'node["amenity"="hospital"]'
        default: return null
      }
    })
    .filter(Boolean)
    .join(';')

  const query = `[bbox:${bbox}];(${filters};);out center;`

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) throw new Error('Overpass API error')

    const text = await res.text()
    const pois = parseOverpassXML(text)

    return NextResponse.json(pois, {
      headers: { 'Cache-Control': 'max-age=86400' },
    })
  } catch (error) {
    console.error('[POI Error]', error)
    return NextResponse.json({ error: 'POI fetch failed' }, { status: 500 })
  }
}

function parseOverpassXML(xml: string): any[] {
  const pois: any[] = []
  const nodeRegex = /<node id="(\d+)"[^>]*lat="([^"]+)"[^>]*lon="([^"]+)">/g

  let match
  while ((match = nodeRegex.exec(xml)) !== null) {
    pois.push({
      id: match[1],
      lat: parseFloat(match[2]),
      lng: parseFloat(match[3]),
    })
  }

  return pois
}
