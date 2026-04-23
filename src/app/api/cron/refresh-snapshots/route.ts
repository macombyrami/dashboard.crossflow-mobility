import { NextRequest, NextResponse } from 'next/server'
import { aggregationEngine } from '@/lib/aggregation/AggregationEngine'
import { createClient } from '@/lib/supabase/server'

const CITIES = ['paris', 'vildreth', 'lyon', 'marseille']

export async function GET(req: NextRequest) {
  // Verify cron secret
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const results = []

  console.log(`[CRON] Starting snapshot refresh for ${CITIES.length} cities...`)

  for (const city of CITIES) {
    try {
      // Check if snapshot is stale
      const { data: existing } = await supabase
        .from('city_snapshots')
        .select('expires_at')
        .eq('city_id', city)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!existing || new Date() > new Date(existing.expires_at)) {
        console.log(`[CRON] Refreshing ${city}...`)
        const snapshot = await aggregationEngine.getOrFetchSnapshot(city)
        results.push({
          city,
          status: 'refreshed',
          sources: snapshot.sources_used.length,
          confidence: snapshot.confidence_score.toFixed(2),
        })
      } else {
        results.push({ city, status: 'fresh' })
      }
    } catch (error) {
      console.error(`[CRON] Error for ${city}:`, error)
      results.push({
        city,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  console.log(`[CRON] Refresh complete:`, results)

  return NextResponse.json({
    results,
    timestamp: new Date().toISOString(),
    total_cities: CITIES.length,
    refreshed: results.filter(r => r.status === 'refreshed').length,
  })
}
