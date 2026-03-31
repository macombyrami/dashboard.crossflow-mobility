import { NextRequest, NextResponse } from 'next/server'
import { serverFetchFlowSegment } from '@/lib/api/tomtom/server'
import { cache as simpleCache } from '@/lib/cache/SimpleCache'
import { createClient } from '@/lib/supabase/server'
import { TrafficPredictor } from '@/lib/engine/TrafficPredictor'

const CACHE_TTL_FLOW = 120 // 2 minutes for memory cache
const DB_TTL_FLOW    = 600 // 10 minutes for database persistence

export async function GET(req: NextRequest) {
  const sp   = req.nextUrl.searchParams
  const lat  = parseFloat(sp.get('lat')  ?? '')
  const lng  = parseFloat(sp.get('lng')  ?? '')
  const zoom = parseInt(sp.get('zoom')   ?? '10', 10)
  const city = sp.get('city') ?? 'unknown'

  // ─── 0. STRICT VALIDATION ────────────────────────────────────────────────
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  const cacheKey = `flow:${lat.toFixed(4)}:${lng.toFixed(4)}:${zoom}`
  const now = new Date()

  try {
    // ─── 1. LAYER 1: MEMORY CACHE ──────────────────────────────────────────
    const cached = simpleCache.get<any>(cacheKey)
    if (cached) {
      logUsage('hit:memory', city, { lat, lng })
      return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT:MEMORY' } })
    }

    const supabase = await createClient()

    // ─── 2. LAYER 2: SUPABASE PERSISTENCE ──────────────────────────────────
    const { data: dbSnap } = await supabase
      .from('traffic_snapshots')
      .select('*')
      .eq('city_id', city)
      .gt('expires_at', now.toISOString())
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (dbSnap) {
      logUsage('hit:db', city, { lat, lng })
      simpleCache.set(cacheKey, dbSnap.segments, CACHE_TTL_FLOW)
      return NextResponse.json(dbSnap.segments, { headers: { 'X-Cache': 'HIT:DB' } })
    }

    // ─── 3. LAYER 3: PREDICTIVE ENGINE (Quota Saver) ──────────────────────
    const shouldSaveQuota = Math.random() < 0.2 
    if (shouldSaveQuota) {
      const pred = TrafficPredictor.predict(city, now)
      logUsage('predictive', city, { lat, lng })
      
      // Map prediction to TomTom compatibility shape
      const mockFlow = {
        currentSpeed: Math.round(100 - pred.congestionLevel),
        freeFlowSpeed: 100,
        currentTravelTime: 60,
        freeFlowTravelTime: 60,
        confidence: pred.confidence,
        roadClosure: false,
        coordinates: { coordinate: [] },
        type: 'prediction'
      }
      
      return NextResponse.json(mockFlow, { headers: { 'X-Cache': 'PREDICTIVE' } })
    }

    // ─── 4. LAYER 4: TOMTOM FETCH ──────────────────────────────────────────
    const data = await serverFetchFlowSegment(lat, lng, zoom)
    if (!data) {
      const fallback = TrafficPredictor.predict(city, now)
      return NextResponse.json({ ...fallback, type: 'fallback' })
    }

    // ─── 5. ASYNC STORAGE ──────────────────────────────────────────────────
    simpleCache.set(cacheKey, data, CACHE_TTL_FLOW)
    
    supabase.from('traffic_snapshots').insert({
      city_id:    city,
      bbox:       { lat, lng, zoom },
      segments:   data,
      incidents:  [],
      congestion: data.confidence ?? 1.0,
      expires_at: new Date(Date.now() + DB_TTL_FLOW * 1000).toISOString()
    }).then(({ error }) => { if (error) console.error('[TrafficPersistence] Error:', error) })

    logUsage('miss', city, { lat, lng })
    return NextResponse.json(data, { 
      headers: { 'Cache-Control': `max-age=${CACHE_TTL_FLOW}`, 'X-Cache': 'MISS' } 
    })

  } catch (err) {
    console.error('[TrafficAPI] Flow Error:', err)
    return NextResponse.json(TrafficPredictor.predict(city, now), { status: 200 })
  }
}

async function logUsage(status: string, city: string, params: any) {
  const supabase = await createClient()
  supabase.from('api_usage_logs').insert({
    service: 'tomtom-flow',
    endpoint: '/api/tomtom/flow',
    cache_status: status,
    status: 200,
    params: { city, ...params }
  }).then()
}
