-- 20260401_staff_engineer_bootstrap.sql
-- Infrastructure for high-performance traffic snapshots, shared views, and audit logging.

-- 1. Traffic Snapshots (The Sampler)
CREATE TABLE IF NOT EXISTS public.traffic_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id TEXT NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL,
    provider TEXT NOT NULL, -- e.g., 'tomtom', 'here', 'synthetic'
    bbox JSONB, -- The bounding box of the capture
    stats JSONB, -- summary metrics (avg speed, congestion index)
    segments_gz BYTEA, -- Gzipped JSON of segments for storage efficiency
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_city_date ON public.traffic_snapshots (city_id, fetched_at DESC);

-- 2. Simulation Runs (Persistence & Comparison)
CREATE TABLE IF NOT EXISTS public.simulation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id TEXT NOT NULL,
    seed_snapshot_id UUID REFERENCES public.traffic_snapshots(id),
    params JSONB, -- The 'What-if' configuration
    result JSONB, -- The impact metrics (CO2, delay, etc.)
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID -- Track who ran the simulation
);

-- 3. Action Log (Audit & Governance)
CREATE TABLE IF NOT EXISTS public.action_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    city_id TEXT,
    action TEXT NOT NULL, -- 'SIMULATION', 'EXPORT', 'BLOCK_ROAD'
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Shared Views (Permalinks)
CREATE TABLE IF NOT EXISTS public.views_shared (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    state JSONB NOT NULL, -- { zoom, center, layers, simulationId }
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Performance Monitoring (Optional View for Hourly Stats)
CREATE OR REPLACE VIEW public.mv_hourly_traffic_stats AS
SELECT 
    city_id,
    date_trunc('hour', fetched_at) as hour,
    avg((stats->>'avg_speed')::float) as avg_speed,
    avg((stats->>'congestion_index')::float) as avg_congestion,
    count(*) as snap_count
FROM public.traffic_snapshots
GROUP BY 1, 2
ORDER BY 2 DESC;
