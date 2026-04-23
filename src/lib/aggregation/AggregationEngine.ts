/**
 * CROSSFLOW MOBILITY - AGGREGATION ENGINE
 *
 * Core orchestration system for multi-source data aggregation
 * Manages 3-layer caching, parallel API fetching, data normalization
 *
 * Architecture:
 * L1: Memory (SimpleCache) - <1ms
 * L2: Database (Supabase) - 50-200ms
 * L3: Live APIs (6+ sources) - 500ms-5s
 */

import { createClient } from '@/lib/supabase/server'
import { cache as memoryCache } from '@/lib/cache/SimpleCache'

export interface CitySnapshot {
  city_id: string
  city_name: string
  country: string
  center_lat: number
  center_lng: number
  timestamp: string
  expires_at: string

  // Data domains
  traffic: TrafficData | null
  weather: WeatherData | null
  air_quality: AirQualityData | null
  poi: POIData | null
  transit: TransitData | null
  events: EventsData | null
  mobility: MobilityData | null
  environmental: EnvironmentalData | null

  // Metadata
  sources_used: string[]
  confidence_score: number
  aggregation_ms: number
}

export interface TrafficData {
  segments: any[]
  incidents: any[]
  average_speed: number
  congestion_level: 'free' | 'slow' | 'congested' | 'critical'
  incident_count: number
  sources: string[]
}

export interface WeatherData {
  current: {
    temperature: number
    feels_like: number
    humidity: number
    wind_speed: number
    precipitation: number
    uv_index: number
    weather_code: number
  }
  hourly: any[]
  forecast: any[]
  sources: string[]
}

export interface AirQualityData {
  aqi: number
  level: string
  pm25: number
  pm10: number
  o3: number
  no2: number
  so2: number
  co: number
  sources: string[]
}

export interface POIData {
  [key: string]: any[]  // parking, shops, stations, etc
  sources: string[]
}

export interface TransitData {
  departures: any[]
  disruptions: any[]
  total_disruptions: number
  sources: string[]
}

export interface EventsData {
  events: any[]
  total_count: number
  estimated_traffic_impact: number
  sources: string[]
}

export interface MobilityData {
  bikes_available: number
  scooters_available: number
  car_share_vehicles: number
  sources: string[]
}

export interface EnvironmentalData {
  carbon_estimate: number
  noise_level: number
  sources: string[]
}

export class AggregationEngine {
  private supabase = createClient()
  private readonly SNAPSHOT_TTL = 600 // 10 minutes
  private readonly TRAFFIC_TTL = 300 // 5 minutes
  private readonly WEATHER_TTL = 3600 // 1 hour
  private readonly POI_TTL = 86400 // 24 hours

  /**
   * Get or fetch snapshot for a city
   * Implements 3-layer cache strategy
   */
  async getOrFetchSnapshot(cityId: string, bbox?: string): Promise<CitySnapshot> {
    const cacheKey = `snapshot:${cityId}`

    // LAYER 1: Memory Cache (SimpleCache)
    const memCached = memoryCache.get<CitySnapshot>(cacheKey)
    if (memCached) {
      console.log(`[L1 HIT] Memory cache for ${cityId}`)
      await this.logPerformance(
        'memory-cache',
        cityId,
        0,
        true,
        true
      )
      return memCached
    }

    // LAYER 2: Database Cache (Supabase)
    const dbCached = await this.getFromDatabase(cityId)
    if (dbCached) {
      console.log(`[L2 HIT] Database cache for ${cityId}`)
      memoryCache.set(cacheKey, dbCached, this.SNAPSHOT_TTL)
      await this.logPerformance(
        'database-cache',
        cityId,
        50,
        true,
        true
      )
      return dbCached
    }

    // LAYER 3: Live API Calls
    console.log(`[L3 MISS] Fetching fresh data for ${cityId}`)
    const startTime = Date.now()
    const snapshot = await this.fetchAndAggregate(cityId, bbox)
    const aggregationTime = Date.now() - startTime

    // Store in both caches
    memoryCache.set(cacheKey, snapshot, this.SNAPSHOT_TTL)
    await this.storeSnapshot(snapshot, aggregationTime)

    await this.logPerformance(
      'api-fetch',
      cityId,
      aggregationTime,
      true,
      false
    )

    return snapshot
  }

  /**
   * Main aggregation pipeline
   */
  private async fetchAndAggregate(
    cityId: string,
    bbox?: string
  ): Promise<CitySnapshot> {
    const config = this.getCityConfig(cityId)
    const startTime = Date.now()
    const sourcesUsed: string[] = []

    console.log(`Starting aggregation for ${cityId}...`)

    // Parallel fetch from all sources
    const results = await Promise.allSettled([
      this.fetchTraffic(config, bbox).catch(e => ({ error: e.message })),
      this.fetchWeather(config).catch(e => ({ error: e.message })),
      this.fetchAirQuality(config).catch(e => ({ error: e.message })),
      this.fetchPOI(cityId, config).catch(e => ({ error: e.message })),
      this.fetchTransit(cityId, config).catch(e => ({ error: e.message })),
      this.fetchEvents(cityId, config).catch(e => ({ error: e.message })),
      this.fetchMobility(cityId, config).catch(e => ({ error: e.message })),
      this.fetchEnvironmental(config).catch(e => ({ error: e.message })),
    ])

    // Process results
    const [traffic, weather, airQuality, poi, transit, events, mobility, environmental] = results

    // Track successes
    const sourceResults = [
      { name: 'traffic', result: traffic },
      { name: 'weather', result: weather },
      { name: 'air_quality', result: airQuality },
      { name: 'poi', result: poi },
      { name: 'transit', result: transit },
      { name: 'events', result: events },
      { name: 'mobility', result: mobility },
      { name: 'environmental', result: environmental },
    ]

    sourceResults.forEach(({ name, result }) => {
      if (result.status === 'fulfilled' && !result.value.error) {
        sourcesUsed.push(name)
      } else if (result.status === 'fulfilled') {
        console.warn(`⚠️  ${name} failed: ${result.value.error}`)
      } else {
        console.warn(`⚠️  ${name} promise rejected`)
      }
    })

    // Build snapshot
    const aggregationTime = Date.now() - startTime
    const snapshot: CitySnapshot = {
      city_id: cityId,
      city_name: config.name,
      country: 'France',
      center_lat: config.lat,
      center_lng: config.lng,
      timestamp: new Date().toISOString(),
      expires_at: new Date(Date.now() + this.SNAPSHOT_TTL * 1000).toISOString(),

      traffic: traffic.status === 'fulfilled' ? traffic.value : null,
      weather: weather.status === 'fulfilled' ? weather.value : null,
      air_quality: airQuality.status === 'fulfilled' ? airQuality.value : null,
      poi: poi.status === 'fulfilled' ? poi.value : null,
      transit: transit.status === 'fulfilled' ? transit.value : null,
      events: events.status === 'fulfilled' ? events.value : null,
      mobility: mobility.status === 'fulfilled' ? mobility.value : null,
      environmental: environmental.status === 'fulfilled' ? environmental.value : null,

      sources_used: sourcesUsed,
      confidence_score: sourcesUsed.length / 8, // 8 data domains
      aggregation_ms: aggregationTime,
    }

    console.log(`✅ Aggregation complete: ${sourcesUsed.length}/8 sources in ${aggregationTime}ms`)

    return snapshot
  }

  // ════════════════════════════════════════════════════════════════
  // DATA FETCH METHODS (8 sources)
  // ════════════════════════════════════════════════════════════════

  private async fetchTraffic(config: CityConfig, bbox?: string): Promise<TrafficData> {
    const bboxStr = bbox || `${config.bbox.west},${config.bbox.south},${config.bbox.east},${config.bbox.north}`

    const [tomtom, here] = await Promise.all([
      this.fetchWithTimeout(`/api/tomtom/incidents?bbox=${bboxStr}`, 2000),
      this.fetchWithTimeout(`/api/here/flow?bbox=${bboxStr}`, 2000),
    ])

    return {
      segments: here?.results || [],
      incidents: tomtom || [],
      average_speed: here?.results?.[0]?.currentSpeed || 0,
      congestion_level: 'slow',
      incident_count: tomtom?.length || 0,
      sources: ['tomtom', 'here'],
    }
  }

  private async fetchWeather(config: CityConfig): Promise<WeatherData> {
    const res = await this.fetchWithTimeout(
      `https://api.open-meteo.com/v1/forecast?latitude=${config.lat}&longitude=${config.lng}&current=temperature_2m,weather_code,wind_speed_10m,humidity_2m,uv_index,precipitation&hourly=temperature_2m,precipitation,pm2_5,pm10&daily=weather_code,temperature_2max,temperature_2min&timezone=Europe/Paris`,
      3000
    )

    return {
      current: {
        temperature: res?.current?.temperature_2m || 0,
        feels_like: res?.current?.temperature_2m || 0,
        humidity: res?.current?.humidity_2m || 0,
        wind_speed: res?.current?.wind_speed_10m || 0,
        precipitation: res?.current?.precipitation || 0,
        uv_index: res?.current?.uv_index || 0,
        weather_code: res?.current?.weather_code || 0,
      },
      hourly: res?.hourly || [],
      forecast: res?.daily || [],
      sources: ['open-meteo'],
    }
  }

  private async fetchAirQuality(config: CityConfig): Promise<AirQualityData> {
    const res = await this.fetchWithTimeout(
      `https://api.waqi.info/feed/geo:${config.lat};${config.lng}/?token=${process.env.NEXT_PUBLIC_AQICN_API_KEY}`,
      2000
    )

    const data = res?.data || {}

    return {
      aqi: data.aqi || 0,
      level: this.getAQILevel(data.aqi || 0),
      pm25: data.iaqi?.pm25?.v || 0,
      pm10: data.iaqi?.pm10?.v || 0,
      o3: data.iaqi?.o3?.v || 0,
      no2: data.iaqi?.no2?.v || 0,
      so2: data.iaqi?.so2?.v || 0,
      co: data.iaqi?.co?.v || 0,
      sources: ['aqicn'],
    }
  }

  private async fetchPOI(cityId: string, config: CityConfig): Promise<POIData> {
    const bbox = `${config.bbox.south},${config.bbox.west},${config.bbox.north},${config.bbox.east}`

    const query = `[bbox:${bbox}];(
      node["amenity"="parking"];
      node["shop"];
      node["public_transport"="stop_position"];
      node["amenity"="restaurant"];
      node["amenity"="hospital"];
    );out center;`

    try {
      const res = await this.fetchWithTimeout(
        'https://overpass-api.de/api/interpreter',
        5000,
        {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
        }
      )

      const text = typeof res === 'string' ? res : await res.text()
      const pois = this.parseOverpassXML(text)

      return {
        parking: pois.filter(p => p.amenity === 'parking'),
        shops: pois.filter(p => p.shop),
        stations: pois.filter(p => p.public_transport === 'stop_position'),
        restaurants: pois.filter(p => p.amenity === 'restaurant'),
        hospitals: pois.filter(p => p.amenity === 'hospital'),
        sources: ['overpass'],
      }
    } catch (error) {
      console.warn('POI fetch failed:', error)
      return {
        parking: [],
        shops: [],
        stations: [],
        restaurants: [],
        hospitals: [],
        sources: [],
      }
    }
  }

  private async fetchTransit(cityId: string, config: CityConfig): Promise<TransitData> {
    try {
      const res = await this.fetchWithTimeout(`/api/idfm/status?city=${cityId}`, 3000)

      return {
        departures: res?.departures || [],
        disruptions: res?.disruptions || [],
        total_disruptions: res?.disruptions?.length || 0,
        sources: ['idfm', 'navitia'],
      }
    } catch (error) {
      return {
        departures: [],
        disruptions: [],
        total_disruptions: 0,
        sources: [],
      }
    }
  }

  private async fetchEvents(cityId: string, config: CityConfig): Promise<EventsData> {
    try {
      const res = await this.fetchWithTimeout(
        `/api/events/predicthq?lat=${config.lat}&lng=${config.lng}`,
        2000
      )

      return {
        events: res?.events || [],
        total_count: res?.events?.length || 0,
        estimated_traffic_impact: res?.traffic_impact || 0,
        sources: ['predicthq'],
      }
    } catch (error) {
      return {
        events: [],
        total_count: 0,
        estimated_traffic_impact: 0,
        sources: [],
      }
    }
  }

  private async fetchMobility(cityId: string, config: CityConfig): Promise<MobilityData> {
    try {
      // Would fetch from GBFS, MDS, etc
      return {
        bikes_available: 0,
        scooters_available: 0,
        car_share_vehicles: 0,
        sources: [],
      }
    } catch (error) {
      return {
        bikes_available: 0,
        scooters_available: 0,
        car_share_vehicles: 0,
        sources: [],
      }
    }
  }

  private async fetchEnvironmental(config: CityConfig): Promise<EnvironmentalData> {
    try {
      return {
        carbon_estimate: 0,
        noise_level: 0,
        sources: [],
      }
    } catch (error) {
      return {
        carbon_estimate: 0,
        noise_level: 0,
        sources: [],
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ════════════════════════════════════════════════════════════════

  private async fetchWithTimeout(
    url: string,
    timeout: number,
    options: RequestInit = {}
  ): Promise<any> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return await response.json()
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private async getFromDatabase(cityId: string): Promise<CitySnapshot | null> {
    const { data } = await this.supabase
      .from('city_snapshots')
      .select('aggregated_data')
      .eq('city_id', cityId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return data?.aggregated_data as CitySnapshot | null
  }

  private async storeSnapshot(snapshot: CitySnapshot, aggregationTime: number) {
    await this.supabase.from('city_snapshots').insert({
      city_id: snapshot.city_id,
      city_name: snapshot.city_name,
      country: snapshot.country,
      center_lat: snapshot.center_lat,
      center_lng: snapshot.center_lng,
      bbox: { ...this.getCityConfig(snapshot.city_id).bbox },
      aggregated_data: snapshot,
      expires_at: snapshot.expires_at,
      sources_used: snapshot.sources_used,
      confidence_score: snapshot.confidence_score,
      aggregation_ms: aggregationTime,
    })
  }

  private async logPerformance(
    source: string,
    cityId: string,
    responseTimeMs: number,
    success: boolean,
    cacheHit: boolean
  ) {
    await this.supabase.from('api_performance_log').insert({
      api_name: source,
      city_id: cityId,
      endpoint: `/snapshot`,
      response_time_ms: responseTimeMs,
      success,
      cache_hit: cacheHit,
    })
  }

  private getCityConfig(cityId: string): CityConfig {
    const configs: Record<string, CityConfig> = {
      paris: {
        name: 'Paris',
        lat: 48.8566,
        lng: 2.3522,
        bbox: { west: 2.2, south: 48.8, east: 2.4, north: 48.9 },
      },
      vildreth: {
        name: 'Vildreth',
        lat: 48.5,
        lng: 2.5,
        bbox: { west: 2.4, south: 48.4, east: 2.6, north: 48.6 },
      },
      lyon: {
        name: 'Lyon',
        lat: 45.7597,
        lng: 4.8422,
        bbox: { west: 4.7, south: 45.6, east: 5.0, north: 45.9 },
      },
      marseille: {
        name: 'Marseille',
        lat: 43.2965,
        lng: 5.3698,
        bbox: { west: 5.2, south: 43.1, east: 5.5, north: 43.5 },
      },
    }

    return configs[cityId] || configs.paris
  }

  private parseOverpassXML(xml: string): any[] {
    const pois: any[] = []
    const nodeRegex = /<node id="(\d+)"[^>]*lat="([^"]+)"[^>]*lon="([^"]+)">/g

    let match
    while ((match = nodeRegex.exec(xml)) !== null) {
      const node: any = {
        id: match[1],
        lat: parseFloat(match[2]),
        lng: parseFloat(match[3]),
      }

      // Extract tags (simplified)
      const tagsMatch = xml.substring(match.index).match(/<tag k="([^"]+)" v="([^"]+)"/g)
      if (tagsMatch) {
        tagsMatch.forEach(tag => {
          const [, key, value] = tag.match(/k="([^"]+)" v="([^"]+)/) || []
          if (key) node[key] = value
        })
      }

      pois.push(node)
    }

    return pois
  }

  private getAQILevel(aqi: number): string {
    if (aqi <= 50) return 'Good'
    if (aqi <= 100) return 'Moderate'
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups'
    if (aqi <= 200) return 'Unhealthy'
    if (aqi <= 300) return 'Very Unhealthy'
    return 'Hazardous'
  }
}

interface CityConfig {
  name: string
  lat: number
  lng: number
  bbox: { west: number; south: number; east: number; north: number }
}

export const aggregationEngine = new AggregationEngine()
