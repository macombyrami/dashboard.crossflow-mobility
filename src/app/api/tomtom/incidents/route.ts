import { NextRequest, NextResponse } from 'next/server'
import { simpleCache } from '@/lib/cache/SimpleCache'
import { createClient } from '@/lib/supabase/server'

const CACHE_TTL_INCIDENTS = 300  // 5 minutes for memory
const DB_TTL_INCIDENTS    = 600  // 10 minutes for persistence

export async function GET(req: NextRequest) {
  const apiKey = process.env.TOMTOM_API_KEY
  if (!apiKey) return NextResponse.json([])

  const bboxRaw = req.nextUrl.searchParams.get('bbox') ?? ''
  if (!bboxRaw) return NextResponse.json({ error: 'Missing bbox' }, { status: 400 })

  // ─── 0. NORMALIZE BBOX (Increase Cache Hits) ──────────────────────────────
  // Round decimals to 3 places (~110m precision) to group nearby requests
  const bbox = bboxRaw.split(',').map(v => parseFloat(v).toFixed(3)).join(',')
  const cacheKey = `incidents:${bbox}`

  try {
    // ─── 1. LAYER 1: MEMORY CACHE ───────────────────────────────────────────
    const cached = simpleCache.get<any[]>(cacheKey)
    if (cached) {
      logUsage('hit:memory', bbox)
      return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT:MEMORY' } })
    }

    // ─── 2. LAYER 2: SUPABASE PERSISTENCE ────────────────────────────────────
    const supabase = await createClient()
    const { data: dbSnap } = await supabase
      .from('traffic_snapshots')
      .select('incidents')
      .eq('bbox->>raw', bboxRaw) // Matches the exact requested area if recently saved
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle()

    if (dbSnap && dbSnap.incidents?.length > 0) {
      logUsage('hit:db', bbox)
      simpleCache.set(cacheKey, dbSnap.incidents, CACHE_TTL_INCIDENTS)
      return NextResponse.json(dbSnap.incidents, { headers: { 'X-Cache': 'HIT:DB' } })
    }

    // ─── 3. LAYER 3: TOMTOM FETCH ───────────────────────────────────────────
    const fields = '{incidents{type,geometry,properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers}}}'
    const url = `https://api.tomtom.com/traffic/services/5/incidentDetails.json?bbox=${bboxRaw}&fields=${encodeURIComponent(fields)}&language=fr-FR&key=${apiKey}`
    
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return NextResponse.json([], { status: res.status })
    
    const data = await res.json()
    const incidents = data.incidents ?? []

    // ─── 4. ASYNC STORAGE ────────────────────────────────────────────────────
    simpleCache.set(cacheKey, incidents, CACHE_TTL_INCIDENTS)
    
    // Minimal snapshot for incidents
    supabase.from('traffic_snapshots').insert({
      city_id: 'global-incidents',
      bbox: { raw: bboxRaw, normalized: bbox },
      segments: [],
      incidents,
      congestion: 0,
      expires_at: new Date(Date.now() + DB_TTL_INCIDENTS * 1000).toISOString()
    }).then()

    logUsage('miss', bbox)
    return NextResponse.json(incidents, {
      headers: { 'Cache-Control': `max-age=${CACHE_TTL_INCIDENTS}`, 'X-Cache': 'MISS' },
    })

  } catch (err) {
    console.error('[TrafficAPI] Incidents Error:', err)
    return NextResponse.json([], { status: 503 })
  }
}

async function logUsage(status: string, bbox: string) {
  const supabase = await createClient()
  supabase.from('api_usage_logs').insert({
    service: 'tomtom-incidents',
    endpoint: '/api/tomtom/incidents',
    cache_status: status,
    status: 200,
    params: { bbox }
  }).then()
}
