# 🏗️ CrossFlow Mobility - Comprehensive Data Aggregation Strategy

**Status**: Master Plan for Intelligent Multi-Source Data Architecture  
**Target**: Become a true Data Aggregator with Zero Redundancy & Maximum Reuse  
**Vision**: Store once, query many times, enable smart decision-making

---

## 📊 EXECUTIVE SUMMARY

Your project must NOT call the same API twice. Every piece of data is **cached, normalized, and reused** across the platform. This document defines:

1. ✅ **54 Data Sources** (free & open) you can integrate
2. ✅ **Intelligent caching strategy** with smart TTL management
3. ✅ **Unified data model** for all sources
4. ✅ **Priority roadmap** (MVP, Phase 1, Phase 2, Phase 3)
5. ✅ **Backend architecture** that scales with minimal cost

---

## 🌍 PART 1: ALL AVAILABLE DATA SOURCES (54 TOTAL)

### **TIER 1: CRITICAL URBAN DATA (Must Have)**

#### 1. Real-Time Traffic Flow
| Source | Type | Coverage | TTL | Cost | Status |
|--------|------|----------|-----|------|--------|
| **TomTom Traffic API** | Commercial + Your API | Worldwide | 30s | Paid | ✅ Active |
| **HERE Technologies** | Commercial + Your API | Worldwide | 30s | Paid | ✅ Active |
| **Waze Data Feed** | Crowdsourced (Google) | Worldwide | 2min | FREE (registration) | ⚠️ Need setup |
| **OpenTraffic v2** | Open Source | Global | 1h | FREE | ❌ Not used |
| **Telraam Traffic Counts** | Crowdsourced sensors | EU + US | 1h | FREE | ❌ Not used |
| **CARTO Traffico** | GPS crowdsourced | Global | 5min | Freemium | ❌ Not used |

#### 2. Public Transport (Real-Time)
| Source | Type | Coverage | TTL | Cost | Status |
|--------|------|----------|-----|------|--------|
| **IDFM PRIM** | Official French | Île-de-France | 5min | FREE (1M calls/day) | ✅ Active |
| **Navitia** | Official/Hove | France + EU | 10min | FREE | ✅ Backend ready |
| **GTFS-Realtime (FR)** | Standard Format | France | 30s | FREE | ⚠️ Need integration |
| **SIRI Lite (EU)** | XML Standard | EU | 30s | FREE | ⚠️ Need integration |
| **Transpo-RT API** | Converted format | France | 30s | FREE | ❌ Not used |
| **RATP Open Data** | Paris transit | Paris only | 5min | FREE | ✅ Via IDFM |

#### 3. Incidents & Events (Traffic/Non-Traffic)
| Source | Type | Coverage | TTL | Cost | Status |
|--------|------|----------|-----|------|--------|
| **TomTom Incidents** | Commercial | Worldwide | 5min | Paid | ✅ Active |
| **HERE Incidents** | Commercial | Worldwide | 5min | Paid | ✅ Active |
| **PredictHQ** | Event Intelligence | Worldwide | 24h | Paid (free tier) | ✅ Configured |
| **Ticketmaster Events** | Entertainment | Worldwide | 24h | FREE (API) | ✅ Configured |
| **GDELT Project** | Global events + social | Worldwide | 15min | FREE | ❌ Not used |
| **Waze Incidents** | Crowdsourced reports | Worldwide | 5min | FREE | ⚠️ Need setup |
| **Social Media Signals** | Twitter/Reddit/Posts | Real-time | 5min | FREE | ❌ Not used |

#### 4. Weather & Climate
| Source | Type | Coverage | TTL | Cost | Status |
|--------|------|----------|-----|------|--------|
| **Open-Meteo** | Free forecasts | Worldwide | 1h | FREE ∞ | ❌ Not connected |
| **OpenWeatherMap** | Freemium | Worldwide | 1h | Freemium | ⚠️ Partially set up |
| **Weatherbit** | Freemium | Worldwide | 1h | Freemium | ❌ Not used |
| **Visual Crossing** | Historical + Forecast | Worldwide | 1h | Freemium | ❌ Not used |
| **NOAA Weather** | US Government | USA | 1h | FREE | ❌ Not used |
| **Meteofrance** | Official France | France | 1h | FREE | ❌ Not used |

#### 5. Air Quality & Pollution
| Source | Type | Coverage | TTL | Cost | Status |
|--------|------|----------|-----|------|--------|
| **OpenAQ** | Aggregator | 100+ countries | 1h | FREE | ❌ Not used |
| **AQICN** | Real-time AQI | 100+ countries | 1h | FREE | ❌ Not configured |
| **Open-Meteo Air Quality** | Forecast | Worldwide | 1h | FREE | ❌ Not connected |
| **EnviroMonitor** | Open sensor | Decentralized | Real-time | FREE | ❌ Not used |
| **AirGradient** | Sensor Network | Growing | Real-time | FREE + Hardware | ❌ Not used |
| **Copernicus AQ** | EU Satellite | EU | 1h | FREE | ❌ Not used |

### **TIER 2: MOBILITY OPTIONS (High Priority)**

#### 6. Bike Sharing & Micro-Mobility
| Source | Type | Coverage | TTL | Cost | Status |
|--------|------|----------|-----|------|--------|
| **GBFS (General Bikeshare Feed Spec)** | Standard | EU/US | 30s | FREE | ❌ Not used |
| **Vélib' (Paris)** | Official | Paris | 30s | FREE | ❌ Not used |
| **Citibike (NYC)** | Official | NYC | 30s | FREE | ❌ Not used |
| **MDS (Mobility Data Spec)** | Standard | Growing | 30s | FREE | ❌ Not used |
| **JCDecaux Open Data** | Docking stations | 50+ cities | 30s | FREE | ❌ Not used |
| **Scooter Networks** | E-scooters | EU/US | 30s | Varies | ❌ Not used |

#### 7. Points of Interest (POI)
| Source | Type | Coverage | TTL | Cost | Status |
|--------|------|----------|-----|------|--------|
| **Overpass API (OSM)** | Crowdsourced | Worldwide | 24h | FREE | ⚠️ Configured but not UI |
| **Google Places API** | Commercial | Worldwide | 24h | PAID | ❌ Not used (too expensive) |
| **Geoapify Places** | Commercial | Worldwide | 24h | Freemium | ❌ Not used |
| **OpenStreetMap RawData** | Crowdsourced | Worldwide | 24h | FREE | ✅ Via Overpass |
| **WikiMapia** | Crowdsourced | Worldwide | 24h | FREE | ❌ Not used |
| **Foursquare/Swarm** | Crowdsourced | Worldwide | 24h | Paid | ❌ Not used |

### **TIER 3: ENVIRONMENTAL & EXTERNAL (Medium Priority)**

#### 8. Carbon & Emissions
| Source | Type | Coverage | TTL | Cost | Status |
|--------|------|----------|-----|------|--------|
| **Travel CO2 API** | Calculation | Global | N/A | FREE | ❌ Not used |
| **Climatiq API** | Carbon Intel | Global | N/A | Freemium | ❌ Not used |
| **Searoutes CO2** | Shipping routes | Global | N/A | Paid | ❌ Not used |
| **myclimate API** | Carbon calc | Global | N/A | Freemium | ❌ Not used |
| **Carbon Interface** | Vehicle emissions | Global | N/A | FREE | ❌ Not used |

#### 9. Parking & Road Infrastructure
| Source | Type | Coverage | TTL | Cost | Status |
|--------|------|----------|-----|------|--------|
| **Parking spots (OSM)** | Crowdsourced | Worldwide | 24h | FREE | ❌ Not used |
| **ParkWhiz/SpotHero** | Aggregator | US | Real-time | Paid | ❌ Not used |
| **Urban Road Data** | Municipal | By city | 24h | FREE | ❌ Not used |

#### 10. Noise & Nuisance
| Source | Type | Coverage | TTL | Cost | Status |
|--------|------|----------|-----|------|--------|
| **Noise Monitoring Sensors** | IoT | EU cities | Real-time | FREE | ❌ Not used |
| **Citizen Reports** | Crowdsourced | Varies | Real-time | FREE | ❌ Not used |

---

## 🏛️ PART 2: INTELLIGENT BACKEND ARCHITECTURE

### **2.1 Three-Layer Cache Strategy (ENHANCED)**

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT REQUEST                            │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │ LAYER 1: Memory Cache (L1)   │
        │ ├─ Speed: < 1ms              │
        │ ├─ TTL: 2-10min              │
        │ ├─ Size: Limited (Node RAM)  │
        │ ├─ Scope: Per server          │
        │ └─ Hit Rate: ~80%             │
        └──────┬───────────────────────┘
               │ MISS
               ↓
        ┌──────────────────────────────┐
        │ LAYER 2: Database Cache (L2) │
        │ ├─ Speed: 50-200ms           │
        │ ├─ TTL: 10-30min             │
        │ ├─ Size: Unlimited           │
        │ ├─ Scope: All servers         │
        │ ├─ DB: Supabase              │
        │ └─ Hit Rate: ~90% cumulative │
        └──────┬───────────────────────┘
               │ MISS
               ↓
        ┌──────────────────────────────┐
        │ LAYER 3: Live API Calls (L3) │
        │ ├─ Speed: 500ms - 5s         │
        │ ├─ Cost: $$ per call         │
        │ ├─ Parallel fetching         │
        │ ├─ Aggregates 2-6 sources    │
        │ └─ Hit Rate: 10% (expensive) │
        └──────┬───────────────────────┘
               ↓
        ┌──────────────────────────────┐
        │ Data Aggregation Layer       │
        │ ├─ Normalize formats         │
        │ ├─ Validate data             │
        │ ├─ Add confidence scores     │
        │ ├─ Store in L2               │
        │ └─ Update L1                 │
        └──────┬───────────────────────┘
               ↓
        ┌──────────────────────────────┐
        │      Return to Client        │
        │  (UNIFIED JSON FORMAT)       │
        └──────────────────────────────┘
```

### **2.2 Smart TTL Management**

```
Different data types have different expiration needs:

Traffic Flow:
├─ Raw API data: 30 seconds (lives fast, dies young)
├─ Aggregated: 2-5 minutes
├─ Cached snapshot: 10 minutes
└─ Update frequency: Every 30s in background

Public Transport:
├─ Departures: 1-2 minutes (changes frequently)
├─ Schedules: 12-24 hours (static)
├─ Disruptions: 5 minutes
└─ Update frequency: Every 1 min

Weather:
├─ Current: 30 minutes
├─ Hourly: 1 hour
├─ Daily forecast: 6 hours
└─ Update frequency: Every 30 min

POI (Parking, Shops, Stations):
├─ Locations: 24 hours (very static)
├─ Real-time status: 5-10 min (parking spaces)
└─ Update frequency: Every 24h (static), 5min (dynamic)

Events:
├─ Confirmed events: 24 hours
├─ Trending events: 2 hours
├─ Social signals: 5 minutes
└─ Update frequency: Varies

Air Quality:
├─ Current readings: 1 hour
├─ Forecasts: 6 hours
└─ Update frequency: Hourly

Carbon Emissions:
├─ Calculation results: Per query (not cached much)
└─ Historical: As needed
```

### **2.3 Unified Data Model**

```typescript
// All aggregated data follows this structure

interface AggregatedCitySnapshot {
  // Metadata
  id: string              // UUID
  city_id: string        // 'paris', 'vildreth', etc
  timestamp: ISO8601     // When this snapshot was created
  expires_at: ISO8601    // When to refresh
  
  // Traffic & Flow
  traffic: {
    segments: TrafficSegment[]
    incidents: Incident[]
    heatmap: HeatmapPoint[]
    flow_direction: FlowDirection[]
    congestion_level: 'free' | 'slow' | 'congested' | 'critical'
    average_speed: number // km/h
    sources: ['tomtom', 'here', 'waze', ...]
    confidence: 0-1
    last_updated: ISO8601
  }
  
  // Public Transport
  transit: {
    departures: Departure[]
    disruptions: Disruption[]
    crowding_level: 'low' | 'medium' | 'high'
    available_vehicles: Vehicle[]
    sources: ['idfm', 'navitia', 'gtfs-rt', ...]
    last_updated: ISO8601
  }
  
  // Weather
  weather: {
    current: {
      temperature: number     // °C
      humidity: number        // %
      wind_speed: number      // km/h
      weather_code: number    // WMO
      feels_like: number      // °C
      visibility: number      // meters
      uv_index: number        // 0-11+
      precipitation: number   // mm/h
      cloudiness: number      // %
    }
    hourly: WeatherHour[]     // Next 24-48 hours
    daily: WeatherDay[]       // Next 7 days
    sources: ['open-meteo', 'openweather', 'meteofrance', ...]
    last_updated: ISO8601
  }
  
  // Air Quality
  air_quality: {
    aqi: number              // 0-500 (US scale)
    level: string            // 'Good', 'Moderate', etc
    pollutants: {
      pm25: number
      pm10: number
      o3: number
      no2: number
      so2: number
      co: number
    }
    sources: ['aqicn', 'openaq', 'openmeteo', ...]
    last_updated: ISO8601
  }
  
  // Points of Interest
  poi: {
    parking: POI[]
    shops: POI[]
    stations: POI[]
    restaurants: POI[]
    hospitals: POI[]
    // ... more categories
    sources: ['overpass', 'osm', ...]
    last_updated: ISO8601
  }
  
  // Mobility Options
  mobility: {
    bike_sharing: MobilityOption[]
    scooter_sharing: MobilityOption[]
    car_sharing: MobilityOption[]
    ride_sharing: MobilityOption[]
    sources: ['gbfs', 'mds', 'jcdecaux', ...]
    last_updated: ISO8601
  }
  
  // Events & Alerts
  events: {
    traffic_events: Event[]
    social_events: Event[]
    weather_alerts: Alert[]
    disruptions: Alert[]
    sources: ['predicthq', 'ticketmaster', 'social', ...]
    last_updated: ISO8601
  }
  
  // Environmental
  environmental: {
    carbon_impact: {
      total_co2_estimate: number  // kg CO2e
      by_transport_mode: {
        car: number
        transit: number
        bike: number
      }
    }
    noise_level: number         // dB
    sources: ['travel-co2', 'climatiq', ...]
    last_updated: ISO8601
  }
  
  // Analytics
  analytics: {
    data_sources_active: number
    confidence_score: 0-1
    update_frequency: number    // seconds
    cache_age: number           // seconds
    aggregation_time_ms: number // How long aggregation took
  }
}
```

---

## 🗄️ PART 3: DATABASE SCHEMA FOR DATA AGGREGATION

### **3.1 Core Tables**

```sql
-- ════════════════════════════════════════════════════════════════
-- MAIN AGGREGATION TABLES
-- ════════════════════════════════════════════════════════════════

-- City-level snapshots (aggregated from all sources)
CREATE TABLE city_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  city_name TEXT NOT NULL,
  country TEXT NOT NULL,
  center_lat FLOAT NOT NULL,
  center_lng FLOAT NOT NULL,
  bbox JSONB NOT NULL,
  
  -- AGGREGATED DATA (ALL SOURCES MERGED)
  aggregated_data JSONB NOT NULL,  -- Full snapshot
  
  -- METADATA
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  aggregation_ms INT,  -- How long aggregation took
  sources_used JSONB,  -- Which APIs were called
  confidence_score FLOAT,  -- 0-1
  
  INDEX idx_city_id_expiry (city_id, expires_at DESC),
  INDEX idx_center (center_lat, center_lng),
  UNIQUE(city_id, created_at)
);

-- ════════════════════════════════════════════════════════════════
-- INDIVIDUAL DATA SOURCE TABLES (for faster queries)
-- ════════════════════════════════════════════════════════════════

-- Traffic/Flow data (most frequently updated)
CREATE TABLE traffic_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  bbox TEXT NOT NULL,  -- Normalized: "2.2,48.8,2.4,48.9"
  
  -- Data from different sources
  tomtom_data JSONB,
  here_data JSONB,
  waze_data JSONB,
  opentraffic_data JSONB,
  
  -- Aggregated fields (for quick queries)
  avg_speed_kmh FLOAT,
  congestion_level TEXT,
  incident_count INT,
  
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_city_bbox_expiry (city_id, bbox, expires_at DESC),
  UNIQUE(city_id, bbox, created_at)
);

-- Transit/Public Transport
CREATE TABLE transit_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  
  -- Data from different sources
  idfm_data JSONB,
  navitia_data JSONB,
  gtfs_data JSONB,
  siri_data JSONB,
  
  -- Aggregated fields
  total_departures INT,
  active_disruptions INT,
  average_crowding TEXT,
  
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_city_expiry (city_id, expires_at DESC),
  UNIQUE(city_id, created_at)
);

-- Weather & Climate
CREATE TABLE weather_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  
  -- Data from different sources
  openmeteo_data JSONB,
  openweather_data JSONB,
  weatherbit_data JSONB,
  meteofrance_data JSONB,
  
  -- Aggregated fields
  temperature FLOAT,
  humidity INT,
  wind_speed FLOAT,
  precipitation FLOAT,
  uv_index INT,
  
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_city_expiry (city_id, expires_at DESC),
  UNIQUE(city_id, created_at)
);

-- Air Quality
CREATE TABLE airquality_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  
  openaq_data JSONB,
  aqicn_data JSONB,
  openmeteo_aq_data JSONB,
  
  -- Aggregated
  aqi INT,
  level TEXT,
  pm25 FLOAT,
  pm10 FLOAT,
  
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_city_expiry (city_id, expires_at DESC)
);

-- Points of Interest (large dataset, cached long-term)
CREATE TABLE poi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  poi_type TEXT NOT NULL,  -- 'parking', 'shop', 'station', etc
  bbox JSONB NOT NULL,
  
  -- Aggregated data
  pois JSONB NOT NULL,  -- [{id, name, lat, lng, properties}, ...]
  
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_city_type_expiry (city_id, poi_type, expires_at DESC),
  UNIQUE(city_id, poi_type, bbox)
);

-- Events & Incidents (aggregated from multiple sources)
CREATE TABLE events_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  
  predicthq_events JSONB,
  ticketmaster_events JSONB,
  social_events JSONB,
  waze_incidents JSONB,
  
  -- Aggregated
  total_events INT,
  estimated_traffic_impact INT,  -- -100 to +100
  
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_city_expiry (city_id, expires_at DESC)
);

-- Mobility Options (bike share, scooters, etc)
CREATE TABLE mobility_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  
  gbfs_data JSONB,  -- Bike share
  mds_data JSONB,   -- Scooters
  jcdecaux_data JSONB,
  
  -- Aggregated
  total_bikes_available INT,
  total_scooters_available INT,
  
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_city_expiry (city_id, expires_at DESC)
);

-- Carbon & Environmental
CREATE TABLE environmental_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  
  travel_co2_data JSONB,
  climatiq_data JSONB,
  noise_data JSONB,
  
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_city_expiry (city_id, expires_at DESC)
);

-- ════════════════════════════════════════════════════════════════
-- ANALYTICS & MONITORING
-- ════════════════════════════════════════════════════════════════

-- Track which APIs are being used and their performance
CREATE TABLE api_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name TEXT NOT NULL,
  city_id TEXT NOT NULL,
  
  response_time_ms INT,
  cache_hit BOOLEAN,
  data_quality_score FLOAT,  -- 0-1
  error_occurred BOOLEAN,
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_api_city_time (api_name, city_id, created_at DESC)
);

-- User access patterns (for cache preloading)
CREATE TABLE user_access_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  city_id TEXT NOT NULL,
  
  last_viewed TIMESTAMP,
  view_count INT DEFAULT 1,
  average_session_duration_s INT,
  most_used_features TEXT[],  -- ['traffic', 'transit', 'weather']
  
  UNIQUE(user_id, city_id)
);

-- Data freshness tracking
CREATE TABLE data_freshness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  data_type TEXT NOT NULL,  -- 'traffic', 'transit', 'weather', etc
  
  last_update TIMESTAMP,
  age_seconds INT,
  needs_refresh BOOLEAN,
  refresh_queued BOOLEAN,
  
  INDEX idx_city_type (city_id, data_type)
);
```

### **3.2 Intelligent Refresh Strategy**

```sql
-- Automatic cache refresh based on data age
CREATE OR REPLACE FUNCTION refresh_stale_data() RETURNS void AS $$
BEGIN
  -- Mark data for refresh if older than TTL
  UPDATE city_snapshots 
  SET needs_refresh = TRUE
  WHERE expires_at < NOW()
  AND needs_refresh = FALSE;
  
  -- Traffic data refreshes every 5 minutes
  UPDATE traffic_snapshots
  SET needs_refresh = TRUE
  WHERE updated_at < NOW() - INTERVAL '5 minutes';
  
  -- Weather refreshes every 1 hour
  UPDATE weather_snapshots
  SET needs_refresh = TRUE
  WHERE updated_at < NOW() - INTERVAL '1 hour';
  
  -- POI refreshes every 24 hours
  UPDATE poi_snapshots
  SET needs_refresh = TRUE
  WHERE updated_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Schedule this to run every minute
SELECT cron.schedule('refresh-stale-data', '* * * * *', 'SELECT refresh_stale_data()');
```

---

## 🎯 PART 4: PRIORITY ROADMAP

### **MVP (Week 1): Foundation**

```
✅ Already Done:
  - TomTom Integration
  - HERE Integration
  - IDFM Integration
  - Navitia Integration
  - Basic caching with SimpleCache

⚠️ URGENT (This Week):
  1. Add Weather Layer (Open-Meteo)
  2. Add Air Quality Layer (AQICN)
  3. Add POI Layer (Overpass)
  4. Implement unified city snapshot table
  5. Create background refresh job
```

### **Phase 1 (Week 2-3): Aggregation Infrastructure**

```
Critical:
  □ Implement data aggregation pipeline
  □ Build city_snapshots table
  □ Create Waze integration
  □ Add GBFS (Bike sharing)
  □ Implement smart TTL management
  □ Build monitoring dashboard
  
High:
  □ Add OpenAQ integration
  □ GTFS-Realtime support
  □ Social event detection (basic)
  □ Carbon calculation integration
```

### **Phase 2 (Week 4-6): Intelligence**

```
□ Machine learning for congestion prediction
□ Intelligent cache preloading based on user patterns
□ Real-time anomaly detection
□ Recommendation engine
□ Historical data analysis
```

### **Phase 3 (Week 7+): Advanced Features**

```
□ Multi-modal routing optimization
□ Scenario simulation
□ Equity analysis
□ Long-term trend analysis
□ API marketplace for external integrations
```

---

## 🔄 PART 5: DATA AGGREGATION PIPELINE

### **5.1 Parallel Fetch Architecture**

```typescript
// src/lib/aggregation/aggregationPipeline.ts

interface AggregationTask {
  name: string
  timeout: number
  fetch: () => Promise<any>
  parse: (data: any) => ParsedData
  optional: boolean
}

async function aggregateForCity(cityId: string): Promise<AggregatedSnapshot> {
  const tasks: AggregationTask[] = [
    // TIER 1: Critical (must have)
    {
      name: 'traffic-tomtom',
      timeout: 2000,
      fetch: () => fetchTomTomTraffic(cityId),
      parse: parseTomTom,
      optional: false
    },
    {
      name: 'traffic-here',
      timeout: 2000,
      fetch: () => fetchHERETraffic(cityId),
      parse: parseHERE,
      optional: false
    },
    {
      name: 'transit-idfm',
      timeout: 3000,
      fetch: () => fetchIFDM(cityId),
      parse: parseIFDM,
      optional: false
    },
    
    // TIER 2: High priority (should have)
    {
      name: 'weather-openmeteo',
      timeout: 2000,
      fetch: () => fetchOpenMeteo(cityId),
      parse: parseWeather,
      optional: true
    },
    {
      name: 'airquality-aqicn',
      timeout: 2000,
      fetch: () => fetchAQICN(cityId),
      parse: parseAirQuality,
      optional: true
    },
    {
      name: 'poi-overpass',
      timeout: 5000,  // Overpass is slower
      fetch: () => fetchOverpass(cityId),
      parse: parsePOI,
      optional: true
    },
    {
      name: 'events-predicthq',
      timeout: 2000,
      fetch: () => fetchPredictHQ(cityId),
      parse: parseEvents,
      optional: true
    },
    
    // TIER 3: Nice to have (background)
    {
      name: 'bikeshare-gbfs',
      timeout: 3000,
      fetch: () => fetchGBFS(cityId),
      parse: parseBikeShare,
      optional: true
    },
  ]
  
  // Execute in parallel with timeouts
  const results = await Promise.allSettled(
    tasks.map(task =>
      Promise.race([
        task.fetch(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), task.timeout)
        )
      ])
      .then(data => ({ name: task.name, status: 'ok', data: task.parse(data) }))
      .catch(err => ({
        name: task.name,
        status: 'error',
        error: err.message,
        optional: task.optional
      }))
    )
  )
  
  // Aggregate results
  const aggregated = mergeDataSources(results)
  
  // Store in Supabase
  await storeSnapshot(cityId, aggregated)
  
  // Update L1 cache
  cacheManager.set(`city:${cityId}`, aggregated, getTTL(cityId))
  
  return aggregated
}

function getTTL(cityId: string): number {
  // Smart TTL based on data freshness
  const age = getDataAge(cityId)
  if (age < 5) return 300  // 5 min if very fresh
  if (age < 30) return 600  // 10 min if reasonably fresh
  return 1800  // 30 min if stale
}
```

### **5.2 Conflict Resolution**

```typescript
// When multiple sources have different data for same metric

function resolveConflicts(sources: SourceData[]): MergedData {
  const validSources = sources.filter(s => s.status === 'ok')
  
  return {
    // Use average for numeric metrics
    avgSpeed: average(
      validSources
        .map(s => s.data.avgSpeed)
        .filter(v => v !== null)
    ),
    
    // Use consensus for categories
    congestionLevel: mostCommon(
      validSources.map(s => s.data.congestionLevel)
    ),
    
    // Prefer source with higher confidence
    incidents: selectByConfidence(
      validSources.flatMap(s => s.data.incidents)
    ),
    
    // Include all sources in metadata
    sources: validSources.map(s => ({
      name: s.name,
      confidence: s.confidence,
      timestamp: s.timestamp
    }))
  }
}
```

---

## 🚀 PART 6: IMPLEMENTATION CHECKLIST

### **WEEK 1: FOUNDATION**

- [ ] Create `city_snapshots` table
- [ ] Create individual data source tables
- [ ] Implement aggregation pipeline
- [ ] Add Weather API integration
- [ ] Add Air Quality API integration
- [ ] Add POI caching layer
- [ ] Create background refresh job
- [ ] Build monitoring dashboard
- [ ] Document all data sources

### **WEEK 2: EXPANSION**

- [ ] Add Waze integration
- [ ] Add GBFS integration
- [ ] Implement social event detection
- [ ] Add carbon calculation
- [ ] Create data freshness tracking
- [ ] Optimize Overpass queries

### **WEEK 3-4: OPTIMIZATION**

- [ ] Machine learning models for prediction
- [ ] Intelligent cache preloading
- [ ] Real-time anomaly detection
- [ ] Performance tuning
- [ ] Cost optimization

---

## 📞 SOURCES

All data sources referenced:

### Traffic & Mobility
- [GraphHopper Open Traffic Collection](https://github.com/graphhopper/open-traffic-collection)
- [OpenTraffic Platform](https://github.com/opentraffic/otv2-platform)
- [Waze Data Feed](https://support.google.com/waze/partners/answer/13458165)
- [IDFM PRIM](https://prim.iledefrance-mobilites.fr/en/catalogue-data)
- [Telraam Traffic Counts](https://telraam.net/)
- [CARTO Traffico](https://carto.com/blog/carto-traffico-traffic-management-solution)

### Public Transport
- [MobilityData Awesome Transit](https://github.com/MobilityData/awesome-transit)
- [Navitia Documentation](https://doc.navitia.io/)
- [GTFS Resources](https://gtfs.org/)
- [Transpo-RT API](https://github.com/etalab/transpo-rt)

### Mobility Options
- [Mobility Data Specification](https://github.com/openmobilityfoundation/mobility-data-specification)
- [WoBike Documentation](https://github.com/ubahnverleih/WoBike)
- [JCDecaux Open Data](https://www.jcdecaux.com/blog/open-data-latest-public-distribution-bike-share-data)

### Weather & Environment
- [Open-Meteo Weather API](https://open-meteo.com/)
- [OpenWeatherMap](https://openweathermap.org/api)
- [OpenAQ](https://openaq.org/)
- [AQICN API](https://aqicn.org/api/)
- [AirGradient](https://www.airgradient.com/)

### POI & Geospatial
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Geoapify Places API](https://www.geoapify.com/places-api/)

### Carbon & Environmental
- [Travel CO2 API](https://travelco2.com/)
- [Climatiq](https://www.climatiq.io/)
- [Carbon Interface](https://www.carboninterface.com/vehicles)

### Events
- [GDELT Project](https://www.gdeltproject.org/)
- [PredictHQ](https://www.predicthq.com/)
- [Ticketmaster Developer](https://developer.ticketmaster.com/)

---

## 🎓 KEY PRINCIPLES

1. **Zero Redundancy**: No API called twice in same time window
2. **Smart Caching**: TTL varies by data type and freshness
3. **Data Normalization**: All sources convert to unified model
4. **Confidence Scoring**: Track reliability of each data source
5. **Graceful Degradation**: App works with subset of data sources
6. **Monitoring**: Track which sources work best for your use case
7. **Cost Optimization**: Expensive APIs called less frequently
8. **Scalability**: System works for 1 city or 100 cities

---

**This is your blueprint for becoming a true urban data aggregator.** 🏆

Implemented correctly, your system will be **faster, cheaper, and more reliable** than any single API provider.
