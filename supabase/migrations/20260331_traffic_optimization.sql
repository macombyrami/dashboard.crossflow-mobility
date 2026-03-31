-- ════════════════════════════════════════════════════════════════════════════════
-- CrossFlow Mobility — Traffic Optimization Migration (UPDATE)
-- ════════════════════════════════════════════════════════════════════════════════

-- Nettoyage forcé pour garantir le nouveau schéma (Cache éphémère uniquement)
DROP TABLE IF EXISTS traffic_snapshots CASCADE;
DROP TABLE IF EXISTS client_profiles CASCADE;
DROP TABLE IF EXISTS api_usage_logs CASCADE;

-- ─── 1. Traffic Snapshots ───────────────────────────────────────────────────────
-- Stocke les fragments de données TomTom pour éviter de relancer l'API
CREATE TABLE traffic_snapshots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id      TEXT NOT NULL,
  bbox         JSONB NOT NULL,
  segments     JSONB NOT NULL,
  incidents    JSONB NOT NULL,
  congestion   FLOAT NOT NULL,
  source       TEXT DEFAULT 'tomtom',
  fetched_at   TIMESTAMPTZ DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_traffic_snapshots_city ON traffic_snapshots(city_id);
CREATE INDEX idx_traffic_snapshots_expiry ON traffic_snapshots(expires_at);

-- ─── 2. Client Profiles & Usage Patterns ──────────────────────────────────────────
-- Stocke les préférences et l'utilisation par client pour optimiser le cache
CREATE TABLE client_profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id),
  city_id      TEXT NOT NULL,
  preferences  JSONB DEFAULT '{}',
  usage_stats  JSONB DEFAULT '{ "api_calls": 0, "cache_hits": 0 }',
  last_active  TIMESTAMPTZ DEFAULT now(),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── 3. API Usage Logs ──────────────────────────────────────────────────────────
-- Trace la performance et les économies de quota pour le dashboard
CREATE TABLE api_usage_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service      TEXT NOT NULL,
  endpoint     TEXT NOT NULL,
  params       JSONB,
  cache_status TEXT NOT NULL,
  response_time INTEGER,
  status       INTEGER,
  cost_units   FLOAT DEFAULT 1.0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── 4. Periodic Cleaning — Function ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_expired_traffic() RETURNS void AS $$
BEGIN
  DELETE FROM traffic_snapshots WHERE expires_at < now();
  DELETE FROM api_usage_logs WHERE created_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;
