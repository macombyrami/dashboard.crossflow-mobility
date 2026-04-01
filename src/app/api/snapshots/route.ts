// src/app/api/snapshots/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for backend insertions

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { cityId, source, segments, weather } = body

    if (!cityId || !segments) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Calculate metadata
    const segmentCount = segments.length
    const avgCongestion = segments.reduce((acc: number, s: any) => acc + (s.congestionScore || 0), 0) / segmentCount

    // Store in Supabase
    const { data, error } = await supabase
      .from('traffic_snapshots')
      .insert({
        city_id: cityId,
        source: source || 'Unknown',
        segment_count: segmentCount,
        average_congestion: avgCongestion,
        data: segments.map((s: any) => ({
            id: s.id,
            lvl: s.level,
            spd: s.speedKmh
        })),
        weather_impact: weather?.trafficImpact || 'none'
      })
      .select('id')
      .single()

    if (error) {
        console.error('[Snapshots API] Supabase error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, snapshotId: data.id })
  } catch (err) {
    console.error('[Snapshots API] Server error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const cityId = searchParams.get('cityId')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!cityId) {
        return NextResponse.json({ error: 'cityId is required' }, { status: 400 })
    }

    const { data, error } = await supabase
        .from('traffic_snapshots')
        .select('*')
        .eq('city_id', cityId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ snapshots: data })
}
