import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gzipSync } from 'zlib'

/**
 * Staff Engineer Persistence API: /api/snapshots
 * Handles 10-minute traffic samples and historical retrieval.
 */

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    const { cityId, source, segments, stats } = body

    if (!cityId || !segments) {
      return NextResponse.json({ error: 'Missing cityId or segments' }, { status: 400 })
    }

    // 1. Gzip the segments JSON for storage efficiency (Staff Optimization)
    const segmentsBuffer = Buffer.from(JSON.stringify(segments))
    const compressed = gzipSync(segmentsBuffer)

    // 2. Persist to Supabase
    const { data, error } = await supabase
      .from('traffic_snapshots')
      .insert({
        city_id: cityId,
        fetched_at: new Date().toISOString(),
        provider: source || 'unknown',
        stats: stats || {},
        segments_gz: compressed,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, id: data.id })
  } catch (err: any) {
    console.error('[API Snapshots] POST Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const cityId = searchParams.get('cityId')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    if (!cityId) {
      return NextResponse.json({ error: 'Missing cityId' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('traffic_snapshots')
      .select('id, fetched_at, provider, stats')
      .eq('city_id', cityId)
      .order('fetched_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[API Snapshots] GET Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
