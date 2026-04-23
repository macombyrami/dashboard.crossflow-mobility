import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  try {
    // Get API performance stats
    const { data: perfStats } = await supabase
      .rpc('get_api_performance_stats', { hours: 24 })

    // Get city snapshot stats
    const { data: allSnapshots } = await supabase
      .from('city_snapshots')
      .select('city_id, confidence_score')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    // Aggregate by city_id in JavaScript (Postgrest doesn't support GROUP BY)
    const cityStats = allSnapshots ? Object.values(
      allSnapshots.reduce((acc: Record<string, any>, s: any) => {
        if (!acc[s.city_id]) {
          acc[s.city_id] = { city_id: s.city_id, snapshot_count: 0, avg_confidence_score: 0, scores: [] }
        }
        acc[s.city_id].snapshot_count++
        acc[s.city_id].scores.push(s.confidence_score || 0)
        return acc
      }, {})
    ).map((group: any) => ({
      city_id: group.city_id,
      snapshot_count: group.snapshot_count,
      avg_confidence_score: group.scores.length > 0
        ? Math.round((group.scores.reduce((a: number, b: number) => a + b, 0) / group.scores.length) * 100) / 100
        : 0
    })) : []

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
