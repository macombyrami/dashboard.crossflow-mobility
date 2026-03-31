-- ════════════════════════════════════════════════════════════════════════════════
-- CrossFlow Mobility — Traffic Optimization Migration
-- ════════════════════════════════════════════════════════════════════════════════

-- ─── 1. Traffic Snapshots ───────────────────────────────────────────────────────
-- Stores real TomTom data fragments so we don't fetch from the API again 
-- for the same area within a short time window.
CREATE TABLE IF NOT EXISTS traffic_snapshots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id      TEXT NOT NULL,
  bbox         JSONB NOT NULL, -- [west, south, east, north]
  segments     JSONB NOT NULL, -- List of TrafficSegment
  incidents    JSONB NOT NULL, -- List of Incident
  congestion   FLOAT NOT NULL, -- Global rate (0-1)
  source       TEXT DEFAULT 'tomtom',
  fetched_at   TIMESTAMPTZ DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL -- Pre-calculated TTL (5-10m)
);

CREATE INDEX IF NOT EXISTS idx_traffic_snapshots_city ON traffic_snapshots(city_id);
CREATE INDEX IF NOT EXISTS idx_traffic_snapshots_expiry ON traffic_snapshots(expires_at);

-- ─── 2. Client Profiles & Usage Patterns ──────────────────────────────────────────
-- Stores client-specific usage to pre-calculate scenarios and optimize cache.
CREATE TABLE IF NOT EXISTS client_profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id),
  city_id      TEXT NOT NULL,
  preferences  JSONB DEFAULT '{}',
  usage_stats  JSONB DEFAULT '{ "api_calls": 0, "cache_hits": 0 }',
  last_active  TIMESTAMPTZ DEFAULT now(),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── 3. API Usage Logs ──────────────────────────────────────────────────────────
-- Tracks performance, cache hits, and estimated costs to visualize in the dashboard.
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service      TEXT NOT NULL, -- 'tomtom-flow', 'tomtom-incidents', 'openweather'
  endpoint     TEXT NOT NULL,
  params       JSONB,
  cache_status TEXT NOT NULL, -- 'hit' | 'miss' | 'stale'
  response_time INTEGER,      -- ms
  status       INTEGER,       -- 200, 400, 429, etc.
  cost_units   FLOAT DEFAULT 1.0, -- Relative cost for tracking
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── 4. Periodic Cleaning — Function & Trigger (Optional/Manual) ───────────────
-- Deletes snapshots older than 24h to keep the table lean.
CREATE OR REPLACE FUNCTION delete_expired_traffic() RETURNS void AS $$
BEGIN
  DELETE FROM traffic_snapshots WHERE expires_at < now();
  DELETE FROM api_usage_logs WHERE created_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;

-- CRON-style behavior (if available in Supabase, else manual)
-- COMMENT: In a real Supabase environment, you would use pg_cron or an Edge Function.
