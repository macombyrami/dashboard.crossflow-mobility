-- *** Begin SQL Migration: 20260401_social_refactor.sql ***

-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Main table for social events
CREATE TABLE IF NOT EXISTS social_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id text NOT NULL,
    captured_at timestamptz NOT NULL,
    source text NOT NULL, -- 'x', 'rss', 'op'
    author_id_hash text,
    lang text DEFAULT 'fr',
    text text NOT NULL,
    tokens jsonb DEFAULT '[]',
    sentiment numeric, -- -1.0 to 1.0 (NLP)
    severity text DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
    entities jsonb DEFAULT '{}'::jsonb,
    geo geometry(Point, 4326),
    bbox jsonb,
    status text DEFAULT 'new', -- 'new', 'moderated', 'hidden'
    raw jsonb,
    created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_city_time ON social_events (city_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_geo ON social_events USING gist(geo);

-- 2. Materialized view for hourly aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_social_city_hour AS
SELECT 
    city_id,
    date_trunc('hour', captured_at) as hour,
    count(*) as event_count,
    avg(sentiment) as mean_sentiment,
    jsonb_agg(DISTINCT entities) as aggregated_entities
FROM social_events
WHERE status != 'hidden'
GROUP BY city_id, hour;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_social_city_hour ON mv_social_city_hour (city_id, hour);

-- 3. Action log for governance and audit
CREATE TABLE IF NOT EXISTS social_action_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    city_id text NOT NULL,
    action text NOT NULL, -- 'moderate', 'replay_incident'
    payload jsonb,
    created_at timestamptz DEFAULT now()
);

-- 4. Retention Policy: Purge detailing data older than 30 days
-- Note: Requires pg_cron for automation, but the query is provided here:
-- DELETE FROM social_events WHERE captured_at < NOW() - INTERVAL '30 days';

-- *** End SQL Migration ***
