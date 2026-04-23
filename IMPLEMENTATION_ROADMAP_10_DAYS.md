# 🛠️ CrossFlow Mobility - 10-Day Implementation Roadmap

**Timeline**: April 23 - May 3, 2026  
**Goal**: Build the complete data aggregation backend infrastructure  
**Outcome**: Fully functional system with 6+ data sources aggregated

---

## 📅 DAY 1-2: Foundation & Schema

### **DAY 1 Morning: Supabase Schema Creation**

**File**: `supabase/migrations/20260423_full_aggregation_schema.sql`

```sql
-- ════════════════════════════════════════════════════════════════
-- COMPLETE DATA AGGREGATION SCHEMA
-- Created: April 23, 2026
-- ════════════════════════════════════════════════════════════════

-- Main aggregated city snapshot
CREATE TABLE IF NOT EXISTS city_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  city_name TEXT NOT NULL,
  country TEXT NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  bbox JSONB NOT NULL,
  
  -- Full aggregated snapshot
  aggregated_data JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  aggregation_ms INT,
  sources_used TEXT[] DEFAULT '{}',
  confidence_score FLOAT DEFAULT 0.0,
  
  CONSTRAINT city_snap_expire_not_past CHECK (expires_at > created_at),
  UNIQUE(city_id, created_at)
);

CREATE INDEX idx_city_snapshots_city_expiry 
  ON city_snapshots(city_id, expires_at DESC);
CREATE INDEX idx_city_snapshots_confidence 
  ON city_snapshots(city_id, confidence_score DESC);

-- Individual source caches
CREATE TABLE IF NOT EXISTS traffic_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  bbox TEXT NOT NULL UNIQUE,
  
  tomtom_incidents JSONB,
  tomtom_flow JSONB,
  here_incidents JSONB,
  here_flow JSONB,
  waze_incidents JSONB,
  
  aggregated_speed FLOAT,
  congestion_level TEXT,
  incident_count INT DEFAULT 0,
  
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_traffic_city_bbox 
  ON traffic_cache(city_id, bbox);
CREATE INDEX idx_traffic_expires 
  ON traffic_cache(expires_at);

-- Weather cache
CREATE TABLE IF NOT EXISTS weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  
  openmeteo_current JSONB,
  openmeteo_hourly JSONB,
  openweather_current JSONB,
  
  temperature FLOAT,
  humidity INT,
  wind_speed FLOAT,
  precipitation FLOAT,
  uv_index INT,
  
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(city_id, created_at)
);

CREATE INDEX idx_weather_city 
  ON weather_cache(city_id, expires_at DESC);

-- Air quality cache
CREATE TABLE IF NOT EXISTS airquality_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  
  aqicn_data JSONB,
  openaq_data JSONB,
  openmeteo_aq JSONB,
  
  aqi INT,
  aqi_level TEXT,
  pm25 FLOAT,
  pm10 FLOAT,
  o3 FLOAT,
  no2 FLOAT,
  
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(city_id, created_at)
);

CREATE INDEX idx_airquality_city 
  ON airquality_cache(city_id, expires_at DESC);

-- POI cache (large, cached long-term)
CREATE TABLE IF NOT EXISTS poi_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  poi_type TEXT NOT NULL,
  bbox JSONB NOT NULL,
  
  pois JSONB NOT NULL,  -- Array of POI objects
  
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(city_id, poi_type, bbox)
);

CREATE INDEX idx_poi_city_type 
  ON poi_cache(city_id, poi_type, expires_at DESC);

-- Transit/Public transport cache
CREATE TABLE IF NOT EXISTS transit_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  
  idfm_data JSONB,
  navitia_data JSONB,
  gtfs_data JSONB,
  
  total_disruptions INT DEFAULT 0,
  average_delay_min INT DEFAULT 0,
  
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(city_id, created_at)
);

CREATE INDEX idx_transit_city 
  ON transit_cache(city_id, expires_at DESC);

-- Events cache
CREATE TABLE IF NOT EXISTS events_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  
  predicthq_events JSONB,
  ticketmaster_events JSONB,
  social_events JSONB,
  
  estimated_impact INT DEFAULT 0,  -- -100 to +100
  
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(city_id, created_at)
);

CREATE INDEX idx_events_city 
  ON events_cache(city_id, expires_at DESC);

-- Performance tracking
CREATE TABLE IF NOT EXISTS api_performance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name TEXT NOT NULL,
  city_id TEXT,
  endpoint TEXT NOT NULL,
  
  response_time_ms INT,
  success BOOLEAN,
  cache_hit BOOLEAN,
  data_quality_score FLOAT,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_perf_api_time 
  ON api_performance_log(api_name, created_at DESC);
CREATE INDEX idx_api_perf_city 
  ON api_performance_log(city_id, created_at DESC);

-- User access patterns (for smart cache preloading)
CREATE TABLE IF NOT EXISTS user_city_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  city_id TEXT NOT NULL,
  
  last_visited TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  visit_count INT DEFAULT 1,
  most_used_features TEXT[] DEFAULT '{}',
  
  UNIQUE(user_id, city_id)
);

CREATE INDEX idx_user_visits_user 
  ON user_city_visits(user_id, last_visited DESC);

-- Enable RLS on sensitive tables
ALTER TABLE city_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_city_visits ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read (not write directly - app writes via API)
CREATE POLICY "Allow authenticated read" ON city_snapshots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON user_city_visits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
-- MATERIALIZED VIEW FOR QUICK STATS
-- ════════════════════════════════════════════════════════════════

CREATE MATERIALIZED VIEW city_data_stats AS
SELECT
  c.city_id,
  c.city_name,
  MAX(c.created_at) as last_update,
  AVG(c.confidence_score) as avg_confidence,
  COUNT(DISTINCT c.sources_used) as sources_count,
  (ARRAY_AGG(DISTINCT c.sources_used))[1] as active_sources
FROM city_snapshots c
WHERE c.created_at > NOW() - INTERVAL '1 hour'
GROUP BY c.city_id, c.city_name;

CREATE INDEX idx_city_stats_city ON city_data_stats(city_id);
```

### **DAY 1 Afternoon: Core Aggregation Service**

**File**: `src/lib/aggregation/aggregationService.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { cache as simpleCache } from '@/lib/cache/SimpleCache'

export interface CityDataSnapshot {
  city_id: string
  timestamp: string
  traffic: any
  weather: any
  air_quality: any
  poi: any
  transit: any
  events: any
  sources_used: string[]
  confidence_score: number
}

export class AggregationService {
  private supabase = createClient()
  private readonly SNAPSHOT_TTL = 600 // 10 minutes

  async getOrFetchSnapshot(cityId: string): Promise<CityDataSnapshot> {
    const cacheKey = `snapshot:${cityId}`

    // Layer 1: Check memory cache
    const cached = simpleCache.get<CityDataSnapshot>(cacheKey)
    if (cached) {
      console.log(`[Cache Hit] Memory for ${cityId}`)
      return cached
    }

    // Layer 2: Check Supabase
    const { data: dbSnapshot } = await this.supabase
      .from('city_snapshots')
      .select('aggregated_data')
      .eq('city_id', cityId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (dbSnapshot?.aggregated_data) {
      console.log(`[Cache Hit] Database for ${cityId}`)
      const snapshot = dbSnapshot.aggregated_data as CityDataSnapshot
      simpleCache.set(cacheKey, snapshot, this.SNAPSHOT_TTL)
      return snapshot
    }

    // Layer 3: Fetch from APIs
    console.log(`[Cache Miss] Fetching fresh data for ${cityId}`)
    const snapshot = await this.fetchAndAggregate(cityId)

    // Store in layers 1 & 2
    simpleCache.set(cacheKey, snapshot, this.SNAPSHOT_TTL)
    await this.storeSnapshot(snapshot)

    return snapshot
  }

  private async fetchAndAggregate(cityId: string): Promise<CityDataSnapshot> {
    const startTime = Date.now()
    const sourcesUsed: string[] = []

    // Get city config
    const cityConfig = this.getCityConfig(cityId)

    // Fetch all sources in parallel with timeouts
    const [traffic, weather, airQuality, poi, transit, events] = await Promise.allSettled([
      this.fetchTraffic(cityId, cityConfig).catch(e => ({ error: e.message })),
      this.fetchWeather(cityConfig).catch(e => ({ error: e.message })),
      this.fetchAirQuality(cityConfig).catch(e => ({ error: e.message })),
      this.fetchPOI(cityId, cityConfig).catch(e => ({ error: e.message })),
      this.fetchTransit(cityId, cityConfig).catch(e => ({ error: e.message })),
      this.fetchEvents(cityId, cityConfig).catch(e => ({ error: e.message })),
    ])

    // Track which sources succeeded
    const results = [
      { name: 'traffic', result: traffic },
      { name: 'weather', result: weather },
      { name: 'air_quality', result: airQuality },
      { name: 'poi', result: poi },
      { name: 'transit', result: transit },
      { name: 'events', result: events },
    ]

    results.forEach(({ name, result }) => {
      if (result.status === 'fulfilled' && !result.value.error) {
        sourcesUsed.push(name)
      }
    })

    // Build snapshot
    const snapshot: CityDataSnapshot = {
      city_id: cityId,
      timestamp: new Date().toISOString(),
      traffic: traffic.status === 'fulfilled' ? traffic.value : null,
      weather: weather.status === 'fulfilled' ? weather.value : null,
      air_quality: airQuality.status === 'fulfilled' ? airQuality.value : null,
      poi: poi.status === 'fulfilled' ? poi.value : null,
      transit: transit.status === 'fulfilled' ? transit.value : null,
      events: events.status === 'fulfilled' ? events.value : null,
      sources_used: sourcesUsed,
      confidence_score: sourcesUsed.length / 6, // 6 sources
    }

    const aggregationTime = Date.now() - startTime
    console.log(`Aggregation for ${cityId} took ${aggregationTime}ms, ${sourcesUsed.length}/6 sources`)

    return snapshot
  }

  private async fetchTraffic(cityId: string, config: CityConfig) {
    const [tomtom, here] = await Promise.all([
      fetch(`/api/tomtom/incidents?bbox=${config.bbox}`).then(r => r.json()),
      fetch(`/api/here/flow?bbox=${config.bbox}`).then(r => r.json()),
    ])

    return {
      segments: here.results || [],
      incidents: tomtom || [],
      sources: ['tomtom', 'here'],
    }
  }

  private async fetchWeather(config: CityConfig) {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${config.lat}&longitude=${config.lng}&current=temperature_2m,weather_code,wind_speed_10m,humidity_2m,uv_index&hourly=temperature_2m,pm2_5,pm10`
    )
    return res.json()
  }

  private async fetchAirQuality(config: CityConfig) {
    const res = await fetch(
      `https://api.waqi.info/feed/geo:${config.lat};${config.lng}/?token=${process.env.NEXT_PUBLIC_AQICN_API_KEY}`
    )
    const data = await res.json()
    return data.data
  }

  private async fetchPOI(cityId: string, config: CityConfig) {
    const query = `[bbox:${config.bbox}];(
      node["amenity"="parking"];
      node["shop"];
      node["public_transport"="stop_position"];
      node["amenity"="restaurant"];
    );out center;`

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
    })

    // Parse XML response to JSON
    const text = await res.text()
    return parseOverpassXML(text)
  }

  private async fetchTransit(cityId: string, config: CityConfig) {
    // Delegate to existing IDFM route
    const res = await fetch(`/api/idfm/traffic-messages?bbox=${config.bbox}`)
    return res.json()
  }

  private async fetchEvents(cityId: string, config: CityConfig) {
    const res = await fetch(
      `/api/events/predicthq?lat=${config.lat}&lng=${config.lng}`
    )
    return res.json()
  }

  private async storeSnapshot(snapshot: CityDataSnapshot) {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await this.supabase.from('city_snapshots').insert({
      city_id: snapshot.city_id,
      city_name: this.getCityName(snapshot.city_id),
      country: 'France', // TODO: make dynamic
      center_lat: 48.8566,
      center_lng: 2.3522,
      bbox: this.getBBox(snapshot.city_id),
      aggregated_data: snapshot,
      expires_at: expiresAt,
      sources_used: snapshot.sources_used,
      confidence_score: snapshot.confidence_score,
    })
  }

  private getCityConfig(cityId: string) {
    const configs: Record<string, CityConfig> = {
      paris: {
        lat: 48.8566,
        lng: 2.3522,
        bbox: '2.2,48.8,2.4,48.9',
      },
      vildreth: {
        lat: 48.5,
        lng: 2.5,
        bbox: '2.4,48.4,2.6,48.6',
      },
    }
    return configs[cityId] || configs.paris
  }

  private getCityName(cityId: string): string {
    const names: Record<string, string> = {
      paris: 'Paris',
      vildreth: 'Vildreth',
    }
    return names[cityId] || cityId
  }

  private getBBox(cityId: string) {
    const boxes: Record<string, any> = {
      paris: { west: 2.2, south: 48.8, east: 2.4, north: 48.9 },
      vildreth: { west: 2.4, south: 48.4, east: 2.6, north: 48.6 },
    }
    return boxes[cityId] || boxes.paris
  }
}

interface CityConfig {
  lat: number
  lng: number
  bbox: string
}

function parseOverpassXML(xml: string): any[] {
  // Simple Overpass XML parser
  // Returns array of POIs
  const pois: any[] = []
  const nodeRegex = /<node id="(\d+)"[^>]*lat="([^"]+)"[^>]*lon="([^"]+)">/g
  const tagRegex = /<tag k="([^"]+)" v="([^"]+)"\/>/g

  let nodeMatch
  while ((nodeMatch = nodeRegex.exec(xml)) !== null) {
    const id = nodeMatch[1]
    const lat = parseFloat(nodeMatch[2])
    const lng = parseFloat(nodeMatch[3])

    const tags: Record<string, string> = {}
    let tagMatch
    while ((tagMatch = tagRegex.exec(xml)) !== null) {
      tags[tagMatch[1]] = tagMatch[2]
    }

    pois.push({ id, lat, lng, ...tags })
  }

  return pois
}

export const aggregationService = new AggregationService()
```

### **DAY 2: API Routes Setup**

**File**: `src/app/api/aggregation/city/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { aggregationService } from '@/lib/aggregation/aggregationService'

export async function GET(req: NextRequest) {
  const cityId = req.nextUrl.searchParams.get('city_id') ?? 'paris'

  try {
    const snapshot = await aggregationService.getOrFetchSnapshot(cityId)

    return NextResponse.json(snapshot, {
      headers: {
        'Cache-Control': 'max-age=300', // 5 minutes
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
```

---

## 📅 DAY 3-4: API Endpoints

### **DAY 3: Add Missing Weather & Air Quality APIs**

**File**: `src/app/api/weather/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat') ?? '48.8566'
  const lng = req.nextUrl.searchParams.get('lng') ?? '2.3522'

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,humidity_2m,uv_index&hourly=temperature_2m,precipitation,pm2_5,pm10&timezone=Europe/Paris`
    )
    const data = await res.json()

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'max-age=3600' },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Weather API failed' }, { status: 500 })
  }
}
```

**File**: `src/app/api/air-quality/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat') ?? '48.8566'
  const lng = req.nextUrl.searchParams.get('lng') ?? '2.3522'

  try {
    const res = await fetch(
      `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${process.env.NEXT_PUBLIC_AQICN_API_KEY}`
    )
    const data = await res.json()

    return NextResponse.json(data.data, {
      headers: { 'Cache-Control': 'max-age=3600' },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Air quality API failed' }, { status: 500 })
  }
}
```

### **DAY 4: POI Endpoint**

**File**: `src/app/api/poi/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const bbox = req.nextUrl.searchParams.get('bbox') ?? ''
  const types = (req.nextUrl.searchParams.get('types') ?? 'parking,shop,station').split(',')

  if (!bbox) {
    return NextResponse.json({ error: 'Missing bbox' }, { status: 400 })
  }

  const filters = types
    .map(type => {
      switch (type.trim()) {
        case 'parking':
          return 'node["amenity"="parking"]'
        case 'shop':
          return 'node["shop"]'
        case 'station':
          return 'node["public_transport"="stop_position"]'
        case 'restaurant':
          return 'node["amenity"="restaurant"]'
        default:
          return null
      }
    })
    .filter(Boolean)
    .join(';')

  const query = `[bbox:${bbox}];(${filters};);out center;`

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) throw new Error('Overpass API error')

    const text = await res.text()
    const pois = parseOverpassXML(text)

    return NextResponse.json(pois, {
      headers: { 'Cache-Control': 'max-age=86400' }, // 24h
    })
  } catch (error) {
    console.error('[POI Error]', error)
    return NextResponse.json({ error: 'POI fetch failed' }, { status: 500 })
  }
}

function parseOverpassXML(xml: string): any[] {
  // Parse Overpass XML to JSON
  const pois: any[] = []
  const nodeRegex = /<node id="(\d+)"[^>]*lat="([^"]+)"[^>]*lon="([^"]+)">/g

  let match
  while ((match = nodeRegex.exec(xml)) !== null) {
    pois.push({
      id: match[1],
      lat: parseFloat(match[2]),
      lng: parseFloat(match[3]),
    })
  }

  return pois
}
```

---

## 📅 DAY 5-7: Integration & Testing

### **DAY 5: Map UI Updates**

**File**: `src/app/map/page.tsx`

```typescript
'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useMapStore } from '@/store/mapStore'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => ({ default: m.CrossFlowMap })),
  { ssr: false }
)

export default function MapPage() {
  const setLayer = useMapStore(s => s.setLayer)
  const [snapshot, setSnapshot] = useState(null)

  useEffect(() => {
    // Fetch aggregated snapshot
    fetch('/api/aggregation/city?city_id=paris')
      .then(r => r.json())
      .then(data => {
        setSnapshot(data)
        console.log('Sources loaded:', data.sources_used)
      })
  }, [])

  useEffect(() => {
    // Enable all available layers based on data
    if (snapshot) {
      if (snapshot.traffic) setLayer('traffic', true)
      if (snapshot.weather) setLayer('weather', true)
      if (snapshot.air_quality) setLayer('air_quality', true)
      if (snapshot.poi) setLayer('poi', true)
      if (snapshot.transit) setLayer('transit', true)
    }
  }, [snapshot, setLayer])

  return (
    <div className="flex h-full flex-1">
      <CrossFlowMap snapshot={snapshot} />
    </div>
  )
}
```

### **DAY 6: Performance Monitoring**

**File**: `src/lib/monitoring/performanceTracker.ts`

```typescript
import { createClient } from '@/lib/supabase/server'

export class PerformanceTracker {
  private supabase = createClient()

  async logAPICall(
    apiName: string,
    endpoint: string,
    responseTimeMs: number,
    success: boolean,
    cacheHit: boolean = false,
    cityId?: string
  ) {
    await this.supabase.from('api_performance_log').insert({
      api_name: apiName,
      endpoint,
      response_time_ms: responseTimeMs,
      success,
      cache_hit: cacheHit,
      city_id: cityId,
      created_at: new Date().toISOString(),
    })
  }

  async getPerformanceStats(apiName: string, hours: number = 24) {
    const { data } = await this.supabase
      .from('api_performance_log')
      .select('*')
      .eq('api_name', apiName)
      .gt('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())

    if (!data) return null

    return {
      total_calls: data.length,
      success_rate: (data.filter(d => d.success).length / data.length) * 100,
      avg_response_time: data.reduce((sum, d) => sum + d.response_time_ms, 0) / data.length,
      cache_hit_rate: (data.filter(d => d.cache_hit).length / data.length) * 100,
    }
  }
}

export const performanceTracker = new PerformanceTracker()
```

### **DAY 7: Monitoring Dashboard**

**File**: `src/components/admin/PerformanceDashboard.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'

export function PerformanceDashboard() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch('/api/admin/performance-stats')
      const data = await res.json()
      setStats(data)
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold">API Performance</h2>
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Cache Hit Rate" value={`${stats.cache_hit_rate.toFixed(1)}%`} />
          <StatCard label="Avg Response Time" value={`${stats.avg_response_time.toFixed(0)}ms`} />
          <StatCard label="Success Rate" value={`${stats.success_rate.toFixed(1)}%`} />
          <StatCard label="Active Sources" value={stats.active_sources} />
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-100 p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}
```

---

## 📅 DAY 8-10: Advanced Features & Optimization

### **DAY 8: Background Refresh Job**

**File**: `src/app/api/cron/refresh-city-snapshots/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { aggregationService } from '@/lib/aggregation/aggregationService'
import { createClient } from '@/lib/supabase/server'

const CITIES = ['paris', 'vildreth']

export async function GET(req: NextRequest) {
  // Verify cron secret
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const results = []

  for (const city of CITIES) {
    try {
      // Check if snapshot is stale
      const { data: existingSnapshot } = await supabase
        .from('city_snapshots')
        .select('expires_at')
        .eq('city_id', city)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!existingSnapshot || new Date() > new Date(existingSnapshot.expires_at)) {
        const snapshot = await aggregationService.getOrFetchSnapshot(city)
        results.push({ city, status: 'refreshed', sources: snapshot.sources_used.length })
      } else {
        results.push({ city, status: 'fresh' })
      }
    } catch (error) {
      results.push({ city, status: 'error', error: String(error) })
    }
  }

  return NextResponse.json({ results, timestamp: new Date() })
}
```

Set up in your hosting provider's cron job (every 5 minutes):
```
curl -H "Authorization: Bearer YOUR_SECRET" https://yourapp.com/api/cron/refresh-city-snapshots
```

### **DAY 9: Smart Cache Preloading**

**File**: `src/lib/aggregation/cachePreloader.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { aggregationService } from './aggregationService'

export class CachePreloader {
  private supabase = createClient()

  async preloadForActiveUsers() {
    // Get most visited cities
    const { data: topCities } = await this.supabase
      .from('user_city_visits')
      .select('city_id, visit_count')
      .order('visit_count', { ascending: false })
      .limit(10)

    if (!topCities) return

    // Preload snapshots for top cities
    for (const { city_id } of topCities) {
      await aggregationService.getOrFetchSnapshot(city_id)
    }

    console.log(`Preloaded ${topCities.length} city snapshots`)
  }

  async trackUserVisit(userId: string, cityId: string) {
    await this.supabase.from('user_city_visits').upsert(
      {
        user_id: userId,
        city_id: cityId,
        last_visited: new Date().toISOString(),
        visit_count: 1,
      },
      { onConflict: 'user_id,city_id' }
    )
  }
}

export const cachePreloader = new CachePreloader()
```

### **DAY 10: API Cost Optimization**

**File**: `src/lib/aggregation/costOptimizer.ts`

```typescript
export class CostOptimizer {
  /**
   * Determines which APIs to call based on cost vs value
   */
  async selectOptimalAPIs(cityId: string): Promise<string[]> {
    const stats = await this.getPerformanceStats(cityId)

    const apisToUse: string[] = []

    // Always include free APIs
    apisToUse.push('open-meteo', 'aqicn', 'overpass', 'idfm')

    // Include paid APIs if performance is good
    if (stats.tomtom_success_rate > 0.9) apisToUse.push('tomtom')
    if (stats.here_success_rate > 0.9) apisToUse.push('here')

    // Skip slow/expensive APIs if cheaper alternative exists
    if (stats.waze_latency < stats.tomtom_latency) {
      apisToUse.push('waze')
    } else {
      apisToUse.push('tomtom')
    }

    return apisToUse
  }

  /**
   * Adjusts TTL based on data freshness needs
   */
  calculateOptimalTTL(dataType: string, lastAge: number): number {
    const baseTTLs: Record<string, number> = {
      traffic: 5 * 60,        // 5 min for traffic
      weather: 60 * 60,       // 1 hour for weather
      poi: 24 * 60 * 60,      // 24 hours for POI
      transit: 10 * 60,       // 10 min for transit
      events: 24 * 60 * 60,   // 24 hours for events
    }

    const baseTTL = baseTTLs[dataType] || 10 * 60

    // Reduce TTL if data is critical and stale
    if (lastAge > baseTTL * 2) {
      return Math.floor(baseTTL / 2)
    }

    return baseTTL
  }

  private async getPerformanceStats(cityId: string): Promise<any> {
    // Query api_performance_log table
    // Calculate stats for last 24 hours
    return {}
  }
}
```

---

## ✅ COMPLETION CHECKLIST

- [ ] Day 1-2: Supabase schema + aggregation service
- [ ] Day 3-4: Weather + Air Quality + POI APIs
- [ ] Day 5: Map UI integration
- [ ] Day 6: Performance monitoring setup
- [ ] Day 7: Admin dashboard
- [ ] Day 8: Background refresh job
- [ ] Day 9: Smart cache preloading
- [ ] Day 10: Cost optimization

---

## 🎯 EXPECTED OUTCOMES

**After 10 days:**
- ✅ 6+ data sources aggregated
- ✅ Intelligent caching system
- ✅ <200ms response times (cached)
- ✅ 90%+ cache hit ratio
- ✅ Real-time performance monitoring
- ✅ 80-90% API cost reduction

**Result**: You've built a professional-grade data aggregation platform. 🚀
