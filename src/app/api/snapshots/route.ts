import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  
  // 🛰️ Staff Engineer Auth Verification
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Valid Supabase session required' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { city_id, fetched_at, provider, stats, segments_gz, bbox } = body

    const { data, error } = await supabase
      .from('traffic_snapshots')
      .upsert({
        city_id,
        fetched_at,
        provider,
        stats,
        segments_gz: segments_gz ? Buffer.from(segments_gz, 'base64') : null,
        bbox
      }, { onConflict: 'city_id,fetched_at' })

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('API Snapshots POST Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const cityId = searchParams.get('cityId')
  const minutes = parseInt(searchParams.get('minutes') || '60')

  if (!cityId) {
    return NextResponse.json({ success: false, error: 'cityId is required' }, { status: 400 })
  }

  try {
    const startTime = new Date(Date.now() - minutes * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('traffic_snapshots')
      .select('*')
      .eq('city_id', cityId)
      .gte('fetched_at', startTime)
      .order('fetched_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('API Snapshots GET Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
