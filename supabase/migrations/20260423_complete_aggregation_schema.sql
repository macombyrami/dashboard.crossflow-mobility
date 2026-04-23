-- ════════════════════════════════════════════════════════════════════════════════
-- CROSSFLOW MOBILITY - COMPLETE DATA AGGREGATION SCHEMA
-- Created: April 23, 2026
-- Purpose: Unified multi-source data caching and aggregation infrastructure
-- ════════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════════
-- 1. MAIN AGGREGATION TABLE
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS city_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  city_name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'France',
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  bbox JSONB NOT NULL,

  -- Full aggregated snapshot (all data sources merged)
  aggregated_data JSONB NOT NULL DEFAULT '{}',

  -- Metadata
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  aggregation_ms INT DEFAULT 0,
  sources_used TEXT[] DEFAULT '{}',
  confidence_score FLOAT DEFAULT 0.0,

  CONSTRAINT city_snap_expire_valid CHECK (expires_at > created_at),
  UNIQUE(city_id, created_at)
);

CREATE INDEX idx_city_snapshots_city_expiry ON city_snapshots(city_id, expires_at DESC);
CREATE INDEX idx_city_snapshots_confidence ON city_snapshots(city_id, confidence_score DESC);
CREATE INDEX idx_city_snapshots_created ON city_snapshots(created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════════
-- 2. INDIVIDUAL SOURCE CACHE TABLES
-- ════════════════════════════════════════════════════════════════════════════════

-- Traffic & Flow Data (most frequently updated)
CREATE TABLE IF NOT EXISTS traffic_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  bbox TEXT NOT NULL,

  -- Data from different sources
  tomtom_incidents JSONB,
  tomtom_flow JSONB,
  here_incidents JSONB,
  here_flow JSONB,
  waze_incidents JSONB,
  opentraffic_data JSONB,

  -- Aggregated fields for quick queries
  aggregated_speed FLOAT,
  congestion_level TEXT CHECK (congestion_level IN ('free', 'slow', 'congested', 'critical')),
  incident_count INT DEFAULT 0,

  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(city_id, bbox)
);

CREATE INDEX idx_traffic_cache_city_bbox ON traffic_cache(city_id, bbox);
CREATE INDEX idx_traffic_cache_expires ON traffic_cache(expires_at DESC);

-- Weather & Climate Data
CREATE TABLE IF NOT EXISTS weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,

  openmeteo_current JSONB,
  openmeteo_hourly JSONB,
  openweather_current JSONB,
  weatherbit_current JSONB,

  -- Aggregated fields
  temperature FLOAT,
  feels_like FLOAT,
  humidity INT,
  wind_speed FLOAT,
  precipitation FLOAT,
  uv_index INT,
  weather_code INT,

  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(city_id, created_at)
);

CREATE INDEX idx_weather_cache_city ON weather_cache(city_id, expires_at DESC);

-- Air Quality & Pollution Data
CREATE TABLE IF NOT EXISTS airquality_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,

  aqicn_data JSONB,
  openaq_data JSONB,
  openmeteo_aq JSONB,

  -- Aggregated fields
  aqi INT,
  aqi_level TEXT CHECK (aqi_level IN ('Good', 'Moderate', 'Unhealthy for Sensitive Groups', 'Unhealthy', 'Very Unhealthy', 'Hazardous')),
  pm25 FLOAT,
  pm10 FLOAT,
  o3 FLOAT,
  no2 FLOAT,
  so2 FLOAT,
  co FLOAT,

  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(city_id, created_at)
);

CREATE INDEX idx_airquality_cache_city ON airquality_cache(city_id, expires_at DESC);

-- Points of Interest (large dataset, cached long-term)
CREATE TABLE IF NOT EXISTS poi_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  poi_type TEXT NOT NULL,
  bbox JSONB NOT NULL,

  -- Aggregated POI data
  pois JSONB NOT NULL,  -- [{id, name, lat, lng, properties}, ...]
  poi_count INT DEFAULT 0,

  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(city_id, poi_type, bbox)
);

CREATE INDEX idx_poi_cache_city_type ON poi_cache(city_id, poi_type, expires_at DESC);

-- Transit & Public Transport Data
CREATE TABLE IF NOT EXISTS transit_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,

  idfm_data JSONB,
  navitia_data JSONB,
  gtfs_data JSONB,
  siri_data JSONB,

  -- Aggregated fields
  total_departures INT DEFAULT 0,
  active_disruptions INT DEFAULT 0,
  average_crowding TEXT,

  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(city_id, created_at)
);

CREATE INDEX idx_transit_cache_city ON transit_cache(city_id, expires_at DESC);

-- Events & Incidents Data
CREATE TABLE IF NOT EXISTS events_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,

  predicthq_events JSONB,
  ticketmaster_events JSONB,
  social_events JSONB,
  waze_incidents JSONB,

  -- Aggregated fields
  total_events INT DEFAULT 0,
  estimated_traffic_impact INT DEFAULT 0,  -- -100 to +100

  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(city_id, created_at)
);

CREATE INDEX idx_events_cache_city ON events_cache(city_id, expires_at DESC);

-- Mobility Options (bike share, scooters, car share)
CREATE TABLE IF NOT EXISTS mobility_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,

  gbfs_data JSONB,
  mds_data JSONB,
  jcdecaux_data JSONB,

  -- Aggregated fields
  total_bikes_available INT DEFAULT 0,
  total_scooters_available INT DEFAULT 0,

  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(city_id, created_at)
);

CREATE INDEX idx_mobility_cache_city ON mobility_cache(city_id, expires_at DESC);

-- Carbon & Environmental Data
CREATE TABLE IF NOT EXISTS environmental_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,

  travel_co2_data JSONB,
  climatiq_data JSONB,
  noise_data JSONB,

  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(city_id, created_at)
);

CREATE INDEX idx_environmental_cache_city ON environmental_cache(city_id, expires_at DESC);

-- ════════════════════════════════════════════════════════════════════════════════
-- 3. ANALYTICS & MONITORING TABLES
-- ════════════════════════════════════════════════════════════════════════════════

-- API Performance Tracking
CREATE TABLE IF NOT EXISTS api_performance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name TEXT NOT NULL,
  city_id TEXT,
  endpoint TEXT NOT NULL,

  response_time_ms INT,
  success BOOLEAN NOT NULL DEFAULT true,
  cache_hit BOOLEAN DEFAULT false,
  data_quality_score FLOAT DEFAULT 1.0,
  error_message TEXT,
  error_code TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_perf_api_time ON api_performance_log(api_name, created_at DESC);
CREATE INDEX idx_api_perf_city ON api_performance_log(city_id, created_at DESC);
CREATE INDEX idx_api_perf_success ON api_performance_log(success, created_at DESC);

-- User Access Patterns
CREATE TABLE IF NOT EXISTS user_city_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  city_id TEXT NOT NULL,

  last_visited TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  visit_count INT DEFAULT 1,
  total_session_time_s INT DEFAULT 0,
  most_used_features TEXT[] DEFAULT '{}',
  preferred_layers TEXT[] DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, city_id)
);

CREATE INDEX idx_user_visits_user ON user_city_visits(user_id, last_visited DESC);
CREATE INDEX idx_user_visits_city ON user_city_visits(city_id, visit_count DESC);

-- Data Freshness Tracking
CREATE TABLE IF NOT EXISTS data_freshness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  data_type TEXT NOT NULL,

  last_update TIMESTAMP WITH TIME ZONE,
  age_seconds INT DEFAULT 0,
  needs_refresh BOOLEAN DEFAULT false,
  refresh_queued BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(city_id, data_type)
);

CREATE INDEX idx_freshness_city_type ON data_freshness(city_id, data_type);
CREATE INDEX idx_freshness_needs_refresh ON data_freshness(needs_refresh, city_id);

-- Aggregation Job Log
CREATE TABLE IF NOT EXISTS aggregation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,

  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INT,

  sources_count INT DEFAULT 0,
  sources_success INT DEFAULT 0,
  sources_failed INT DEFAULT 0,

  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_aggregation_jobs_city ON aggregation_jobs(city_id, created_at DESC);
CREATE INDEX idx_aggregation_jobs_status ON aggregation_jobs(status, created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════════
-- 4. ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════════════════════════

ALTER TABLE city_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_city_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_performance_log ENABLE ROW LEVEL SECURITY;

-- Public read access for snapshots
CREATE POLICY "Public read city snapshots" ON city_snapshots
  FOR SELECT USING (true);

-- Authenticated users can read their own visits
CREATE POLICY "Users read own visits" ON user_city_visits
  FOR SELECT USING (auth.uid() = user_id);

-- Admin can read performance logs
CREATE POLICY "Authenticated read performance" ON api_performance_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- ════════════════════════════════════════════════════════════════════════════════
-- 5. MATERIALIZED VIEWS FOR ANALYTICS
-- ════════════════════════════════════════════════════════════════════════════════

-- City data statistics
CREATE MATERIALIZED VIEW city_data_stats AS
SELECT
  c.city_id,
  c.city_name,
  MAX(c.created_at) as last_update,
  AVG(c.confidence_score) as avg_confidence,
  COUNT(*) as total_snapshots,
  ARRAY_LENGTH(c.sources_used, 1) as avg_sources_count
FROM city_snapshots c
WHERE c.created_at > NOW() - INTERVAL '7 days'
GROUP BY c.city_id, c.city_name
ORDER BY last_update DESC;

CREATE INDEX idx_city_stats_city ON city_data_stats(city_id);

-- API performance statistics
CREATE MATERIALIZED VIEW api_performance_stats AS
SELECT
  api_name,
  COUNT(*) as total_calls,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
  ROUND(AVG(response_time_ms), 2) as avg_response_time,
  MAX(response_time_ms) as max_response_time,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
  ROUND(100.0 * SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) / COUNT(*), 2) as cache_hit_rate
FROM api_performance_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY api_name
ORDER BY total_calls DESC;

-- ════════════════════════════════════════════════════════════════════════════════
-- 6. AUTOMATIC CLEANUP FUNCTIONS
-- ════════════════════════════════════════════════════════════════════════════════

-- Clean up expired snapshots (runs daily)
CREATE OR REPLACE FUNCTION cleanup_expired_snapshots()
RETURNS void AS $$
BEGIN
  DELETE FROM city_snapshots WHERE expires_at < NOW();
  DELETE FROM traffic_cache WHERE expires_at < NOW();
  DELETE FROM weather_cache WHERE expires_at < NOW();
  DELETE FROM airquality_cache WHERE expires_at < NOW();
  DELETE FROM poi_cache WHERE expires_at < NOW();
  DELETE FROM transit_cache WHERE expires_at < NOW();
  DELETE FROM events_cache WHERE expires_at < NOW();
  DELETE FROM mobility_cache WHERE expires_at < NOW();
  DELETE FROM environmental_cache WHERE expires_at < NOW();

  RAISE NOTICE 'Cleanup completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Clean up old performance logs (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM api_performance_log WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM aggregation_jobs WHERE created_at < NOW() - INTERVAL '30 days';

  RAISE NOTICE 'Old logs cleanup completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════════════════════
-- 7. SCHEMA DOCUMENTATION
-- ════════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE city_snapshots IS 'Main aggregated data table - contains merged snapshot from all data sources';
COMMENT ON TABLE traffic_cache IS 'Real-time traffic data cache - updated every 5 minutes';
COMMENT ON TABLE weather_cache IS 'Weather data cache - updated hourly';
COMMENT ON TABLE airquality_cache IS 'Air quality data cache - updated hourly';
COMMENT ON TABLE poi_cache IS 'Points of Interest cache - updated daily';
COMMENT ON TABLE transit_cache IS 'Public transport data cache - updated every 10 minutes';
COMMENT ON TABLE events_cache IS 'Events and incidents cache - updated hourly';
COMMENT ON TABLE mobility_cache IS 'Bike share and scooter data - updated every 30 minutes';
COMMENT ON TABLE environmental_cache IS 'Carbon and environmental data - updated every 4 hours';
COMMENT ON TABLE api_performance_log IS 'API call performance metrics for monitoring and optimization';
COMMENT ON TABLE user_city_visits IS 'User access patterns for smart cache preloading';

-- ════════════════════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ════════════════════════════════════════════════════════════════════════════════
