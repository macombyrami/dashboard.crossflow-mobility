-- Database Migration: 20260401_traffic_snapshots.sql
-- Goal: High-performance Traffic Snapshots & Analytics

-- 1. Traffic Snapshots Table
CREATE TABLE IF NOT EXISTS public.traffic_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id TEXT NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL,
    provider TEXT NOT NULL, -- 'tomtom', 'here', 'synthetic'
    bbox JSONB, -- The bounding box of the fetch
    stats JSONB, -- { avg_congestion: 0.42, incident_count: 5, active_segments: 1540 }
    segments_gz BYTEA, -- Gzipped/Base64 segments data for heavy payloads
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensuring fast retrieval for timeline playback
    CONSTRAINT unique_city_time UNIQUE (city_id, fetched_at)
);

CREATE INDEX IF NOT EXISTS idx_traffic_snapshots_city_time 
ON public.traffic_snapshots (city_id, fetched_at DESC);

-- 2. Materialized View for Hourly Analytics (Staff Engineer Req)
-- Pre-calculates average congestion and volume per hour per city
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_hourly_traffic_stats AS
SELECT 
    city_id,
    date_trunc('hour', fetched_at) as hour,
    AVG((stats->>'avg_congestion')::float) as avg_congestion,
    COUNT(*) as snapshot_count,
    MAX((stats->>'incident_count')::int) as max_incidents
FROM public.traffic_snapshots
GROUP BY city_id, hour;

-- Unique index required for CONCURRENTLY refreshes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_hourly_traffic_stats_unique 
ON public.mv_hourly_traffic_stats (city_id, hour);

-- 3. Automatic Refresh Logic (10-minute target)
CREATE OR REPLACE FUNCTION public.refresh_traffic_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_hourly_traffic_stats;
END;
$$ LANGUAGE plpgsql;

-- 4. RPC for Front-end variance calculation
CREATE OR REPLACE FUNCTION public.get_traffic_variance(p_city_id TEXT, p_hours INT)
RETURNS TABLE (hour TIMESTAMPTZ, variance_score FLOAT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.hour,
        VARIANCE(m.avg_congestion) OVER (ORDER BY m.hour ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as variance_score
    FROM public.mv_hourly_traffic_stats m
    WHERE m.city_id = p_city_id
    AND m.hour >= NOW() - (p_hours || ' hours')::interval;
END;
$$ LANGUAGE plpgsql;
