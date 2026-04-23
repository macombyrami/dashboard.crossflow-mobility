import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/social/timeline?cityId=...&minutes=60
 * Purpose: Unified interface for hourly aggregates and historical raw events.
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const cityId = searchParams.get('cityId')
  const minutes = parseInt(searchParams.get('minutes') || '1440')

  if (!cityId) return NextResponse.json({ error: 'cityId is required' }, { status: 400 })

  const timeLimit = new Date(Date.now() - minutes * 60000).toISOString()

  try {
    // 1. Fetch raw events
    const { data: events, error: eventError } = await supabase
      .from('social_events')
      .select('*')
      .eq('city_id', cityId)
      .gt('captured_at', timeLimit)
      .order('captured_at', { ascending: false })

    if (eventError) throw eventError

    // 2. Fetch hourly aggregates from materialized view
    const { data: aggregates, error: aggregateError } = await supabase
      .from('mv_social_city_hour')
      .select('*')
      .eq('city_id', cityId)
      .gt('hour', timeLimit)
      .order('hour', { ascending: true })

    if (aggregateError) throw aggregateError

    return NextResponse.json({
      city_id: cityId,
      from: timeLimit,
      to: new Date().toISOString(),
      events: events || [],
      aggregates: aggregates || []
    })
  } catch (err: any) {
    console.error('❌ Social Timeline Failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
