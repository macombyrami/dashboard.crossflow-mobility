import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  try {
    // Get API performance stats
    const { data: perfStats } = await supabase
      .rpc('get_api_performance_stats', { hours: 24 })

    // Get city snapshot stats
    const { data: cityStats } = await supabase
      .from('city_snapshots')
      .select('city_id, count(*) as snapshot_count, avg(confidence_score)')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .group_by('city_id')

    // Get cache hit rates
    const { data: cacheLogs } = await supabase
      .from('api_performance_log')
      .select('cache_hit, api_name')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const cacheHitRate = cacheLogs
      ? (cacheLogs.filter(l => l.cache_hit).length / cacheLogs.length) * 100
      : 0

    return NextResponse.json({
      api_stats: perfStats,
      city_stats: cityStats,
      cache_hit_rate: cacheHitRate.toFixed(2),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Stats Error]', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
