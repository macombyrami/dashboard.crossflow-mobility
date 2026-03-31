import { NextRequest, NextResponse } from 'next/server'
import { fetchFlowSegment } from '@/lib/api/tomtom'
import { simpleCache } from '@/lib/cache/SimpleCache'
import { createClient } from '@/lib/supabase/server'
import { TrafficPredictor } from '@/lib/engine/TrafficPredictor'

const CACHE_TTL_FLOW = 120 // 2 minutes for memory cache
const DB_TTL_FLOW    = 300 // 5 minutes for database persistence

export async function GET(req: NextRequest) {
  const sp   = req.nextUrl.searchParams
  const lat  = parseFloat(sp.get('lat')  ?? '')
  const lng  = parseFloat(sp.get('lng')  ?? '')
  const zoom = parseInt(sp.get('zoom')   ?? '10', 10)
  const city = sp.get('city') ?? 'unknown'

  // ─── 0. STRICT VALIDATION (Reduce 4XX) ───────────────────────────────────
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  const cacheKey = `flow:${lat.toFixed(4)}:${lng.toFixed(4)}:${zoom}`
  const now = Date.now()

  try {
    // ─── 1. LAYER 1: MEMORY CACHE (Deduplication) ──────────────────────────
    const cached = simpleCache.get<any>(cacheKey)
    if (cached) {
      logUsage('hit:memory', lat, lng)
      return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT:MEMORY' } })
    }

    // ─── 2. LAYER 2: SUPABASE PERSISTENCE (History) ─────────────────────────
    const supabase = await createClient()
    const { data: dbSnap } = await supabase
      .from('traffic_snapshots')
      .select('*')
      .eq('city_id', city)
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle()

    if (dbSnap) {
      logUsage('hit:db', lat, lng)
      simpleCache.set(cacheKey, dbSnap.segments, CACHE_TTL_FLOW)
      return NextResponse.json(dbSnap.segments, { headers: { 'X-Cache': 'HIT:DB' } })
    }

    // ─── 3. LAYER 3: PREDICTIVE ENGINE (Quota Saver / Fallback) ─────────────
    // Logic: If TomTom is disabled or we want to save quota for this city
    const shouldSaveQuota = Math.random() < 0.3 // Simulate 30% reduction via prediction
    if (shouldSaveQuota && process.env.NODE_ENV === 'production') {
      const prediction = TrafficPredictor.predict({ cityId: city, timestamp: now })
      logUsage('predictive', lat, lng)
      return NextResponse.json({ ...prediction, type: 'prediction' }, { headers: { 'X-Cache': 'PREDICTIVE' } })
    }

    // ─── 4. LAYER 4: TOMTOM FETCH (The expensive call) ──────────────────────
    const data = await fetchFlowSegment(lat, lng, zoom)
    if (!data) {
      // Fallback with prediction if API fails
      const fallback = TrafficPredictor.predict({ cityId: city, timestamp: now })
      return NextResponse.json(fallback)
    }

    // ─── 5. ASYNC STORAGE (Persistence) ─────────────────────────────────────
    simpleCache.set(cacheKey, data, CACHE_TTL_FLOW)
    
    // Save to DB in background
    supabase.from('traffic_snapshots').insert({
      city_id:    city,
      bbox:       { lat, lng, zoom },
      segments:   data,
      incidents:  [],
      congestion: data.currentSpeed / (data.freeFlowSpeed || 1),
      expires_at: new Date(now + DB_TTL_FLOW * 1000).toISOString()
    }).then(({ error }) => { if (error) console.error('[TrafficDB] Insert Error:', error) })

    logUsage('miss', lat, lng)
    return NextResponse.json(data, { 
      headers: { 'Cache-Control': `max-age=${CACHE_TTL_FLOW}`, 'X-Cache': 'MISS' } 
    })

  } catch (err) {
    console.error('[TrafficAPI] Flow Error:', err)
    return NextResponse.json(TrafficPredictor.predict({ cityId: city, timestamp: now }), { status: 200 })
  }
}

async function logUsage(status: string, lat: number, lng: number) {
  // Silent logging for monitoring
  const supabase = await createClient()
  supabase.from('api_usage_logs').insert({
    service: 'tomtom-flow',
    endpoint: '/api/tomtom/flow',
    cache_status: status,
    status: 200,
    params: { lat, lng }
  }).then()
}
