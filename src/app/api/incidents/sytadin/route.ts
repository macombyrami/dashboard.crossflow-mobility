import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') ?? 'active'
  const limit = Math.max(1, Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 100), 200))

  try {
    const supabase = await createClient()
    let query = supabase
      .from('sytadin_incidents')
      .select('id,tweet_id,type,severity,road,direction,from_city,to_city,event_description,status,tweet_created_at,source,confidence_parse,confidence_geocode,geometry')
      .order('tweet_created_at', { ascending: false })
      .limit(limit)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) {
      throw new Error(error.message)
    }

    const incidents = (data ?? []).map((row: any) => {
      const geometry = row.geometry
      let lat: number | null = null
      let lng: number | null = null
      if (typeof geometry === 'object' && geometry?.type === 'Point' && Array.isArray(geometry.coordinates)) {
        lng = Number(geometry.coordinates[0])
        lat = Number(geometry.coordinates[1])
      }

      return {
        id: row.tweet_id ?? row.id,
        text: row.event_description ?? '',
        created_at: row.tweet_created_at,
        type: row.type,
        severity: row.severity,
        road: row.road,
        direction: row.direction,
        location: row.from_city ?? row.to_city ?? null,
        from_city: row.from_city,
        to_city: row.to_city,
        status: row.status,
        lat,
        lng,
        source: row.source ?? 'sytadin',
        confidence: row.confidence_parse ?? 'low',
      }
    })

    return NextResponse.json(incidents, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('[api/incidents/sytadin] error:', error)
    return NextResponse.json([], { status: 200 })
  }
}
