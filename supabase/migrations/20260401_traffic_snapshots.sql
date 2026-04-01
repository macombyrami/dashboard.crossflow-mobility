-- 20260401_traffic_snapshots.sql
-- Persistence for 10-minute traffic samples

CREATE TABLE IF NOT EXISTS public.traffic_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    city_id TEXT NOT NULL,
    source TEXT NOT NULL, -- 'TomTom', 'HERE', 'Synthetic'
    segment_count INTEGER NOT NULL,
    average_congestion FLOAT NOT NULL,
    
    -- The core data: snapped segments (id, level, speed)
    -- Using JSONB for flexible querying and easy integration with the frontend
    data JSONB NOT NULL,
    
    -- Metadata for simulation seeding
    weather_impact TEXT,
    is_base_network BOOLEAN DEFAULT false
);

-- Optimize for time-series queries
CREATE INDEX IF NOT EXISTS idx_traffic_snapshots_city_time ON public.traffic_snapshots (city_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.traffic_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated users
CREATE POLICY "Allow read for authenticated users" ON public.traffic_snapshots
    FOR SELECT TO authenticated USING (true);

-- Allow system-level insertions (via service role or edge functions)
CREATE POLICY "Allow system insert" ON public.traffic_snapshots
    FOR INSERT TO service_role WITH CHECK (true);
