-- Migration: Create social_alerts table for real-time traffic pulse

CREATE TABLE IF NOT EXISTS public.social_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE, -- Original tweet ID or similar
    source TEXT NOT NULL,    -- 'x', 'facebook', 'sytadin-pulse'
    type TEXT DEFAULT 'info', -- 'alert', 'congestion', 'info'
    severity TEXT DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
    text TEXT NOT NULL,
    location TEXT,
    axis TEXT,               -- A1, A86, etc.
    author_name TEXT,
    author_handle TEXT,
    author_avatar TEXT,
    timestamp TIMESTAMPTZ DEFAULT now(),
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup of latest alerts
CREATE INDEX IF NOT EXISTS idx_social_alerts_timestamp ON public.social_alerts (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_social_alerts_source ON public.social_alerts (source);

-- Enable RLS
ALTER TABLE public.social_alerts ENABLE ROW LEVEL SECURITY;

-- Allow public read access (anon)
CREATE POLICY "Allow public read access" ON public.social_alerts
    FOR SELECT USING (true);

-- Allow service role to insert/update (for scraper)
CREATE POLICY "Allow service role full access" ON public.social_alerts
    USING (true)
    WITH CHECK (true);
