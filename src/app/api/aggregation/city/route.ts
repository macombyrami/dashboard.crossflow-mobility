import { NextRequest, NextResponse } from 'next/server'
import { aggregationEngine } from '@/lib/aggregation/AggregationEngine'

/**
 * GET /api/aggregation/city
 * Main endpoint for getting aggregated city data
 */
export async function GET(req: NextRequest) {
  try {
    const cityId = req.nextUrl.searchParams.get('city_id') ?? 'paris'
    const bbox = req.nextUrl.searchParams.get('bbox') ?? undefined

    const snapshot = await aggregationEngine.getOrFetchSnapshot(cityId, bbox)

    return NextResponse.json(snapshot, {
      headers: {
        'Cache-Control': 'max-age=300, public',
        'X-Data-Sources': snapshot.sources_used.join(','),
        'X-Confidence': snapshot.confidence_score.toString(),
      },
    })
  } catch (error) {
    console.error('[Aggregation Error]', error)
    return NextResponse.json(
      { error: 'Failed to aggregate city data' },
      { status: 500 }
    )
  }
}
