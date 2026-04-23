-- Sytadin Incidents Table
-- Stores real-time incidents scraped from Sytadin via Nitter

CREATE TABLE IF NOT EXISTS public.sytadin_incidents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tweet_id text NOT NULL UNIQUE,

  -- Parsed data
  type text NOT NULL CHECK (type IN ('accident', 'closure', 'roadwork', 'congestion', 'blockage', 'weather', 'other')),
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  road text,
  direction text,
  from_city text,
  to_city text,
  event_description text,

  -- Geometry (PostGIS)
  geometry geometry(Geometry, 4326),

  -- Confidence & metadata
  confidence_parse text CHECK (confidence_parse IN ('high', 'medium', 'low')),
  confidence_geocode text CHECK (confidence_geocode IN ('high', 'medium', 'low')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'duplicate')),

  -- Timestamps
  tweet_created_at timestamp with time zone NOT NULL,
  parsed_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Source tracking
  source text DEFAULT 'sytadin',
  source_url text
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sytadin_incidents_tweet_id ON public.sytadin_incidents(tweet_id);
CREATE INDEX IF NOT EXISTS idx_sytadin_incidents_status ON public.sytadin_incidents(status);
CREATE INDEX IF NOT EXISTS idx_sytadin_incidents_created_at ON public.sytadin_incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sytadin_incidents_road ON public.sytadin_incidents(road);
CREATE INDEX IF NOT EXISTS idx_sytadin_incidents_geometry ON public.sytadin_incidents USING gist(geometry);

-- Function to mark incident as resolved
CREATE OR REPLACE FUNCTION public.mark_sytadin_resolved(incident_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.sytadin_incidents
  SET status = 'resolved', resolved_at = now(), updated_at = now()
  WHERE id = incident_id;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old resolved incidents (keep last 100)
CREATE OR REPLACE FUNCTION public.cleanup_old_sytadin_incidents()
RETURNS void AS $$
BEGIN
  DELETE FROM public.sytadin_incidents
  WHERE id NOT IN (
    SELECT id FROM public.sytadin_incidents
    ORDER BY created_at DESC
    LIMIT 100
  )
  AND status = 'resolved'
  AND resolved_at < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (Row Level Security) if desired
ALTER TABLE public.sytadin_incidents ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON public.sytadin_incidents
  FOR SELECT USING (true);

-- Allow service role to insert/update
CREATE POLICY "Allow service role to insert" ON public.sytadin_incidents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role to update" ON public.sytadin_incidents
  FOR UPDATE USING (true);
