import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  
  // 🛰️ Staff Engineer Auth Verification
  // Allow if standard user session IS present OR if CRON_SECRET header matches
  const { data: { user } } = await supabase.auth.getUser()
  const authHeader = req.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!user && !isCron) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Valid session or Cron secret required' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { city_id, fetched_at, provider, stats, segments_gz, bbox } = body

    // Logic: if segments_gz is provided as base64 string, convert to Buffer for BYTEA
    let binarySegments = null
    if (segments_gz) {
      binarySegments = Buffer.from(segments_gz, 'base64')
    }

    const { data, error } = await supabase
      .from('traffic_snapshots')
      .upsert({
        city_id,
        fetched_at,
        provider,
        stats,
        segments_gz: binarySegments,
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

  // 🔐 Require authentication on reads — prevents public data enumeration
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(req.url)
  const cityId = searchParams.get('cityId')
  const minutes = parseInt(searchParams.get('minutes') || '60')

  if (!cityId) {
    return NextResponse.json({ success: false, error: 'cityId is required' }, { status: 400 })
  }

  try {
    const startTime = new Date(Date.now() - minutes * 60 * 1000).toISOString()
    
    // 🛰️ Staff Engineer: Analytics Dispatcher
    const type = searchParams.get('type')
    
    if (type === 'variance') {
      const { data, error } = await supabase.rpc('get_traffic_variance', {
        p_city_id: cityId,
        p_hours:   Math.ceil(minutes / 60)
      })
      if (error) throw error
      return NextResponse.json(data)
    }

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
