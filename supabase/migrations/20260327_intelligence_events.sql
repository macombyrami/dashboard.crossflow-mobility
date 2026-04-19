-- Migration: Social Intelligence Events
-- Purpose: Store synthesized urban events derived from raw social signals.

CREATE TABLE IF NOT EXISTS social_intelligence_events (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        text NOT NULL,
  summary      text,
  category     text CHECK (category IN ('accident', 'congestion', 'public_transport', 'road_closure', 'weather', 'other')),
  severity     int CHECK (severity >= 0 AND severity <= 100),
  confidence   float CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Geographic context
  latitude     float8 NOT NULL,
  longitude    float8 NOT NULL,
  area_context text, -- e.g. "Paris 15e", "Gennevilliers"
  
  -- Lifecycle
  status       text DEFAULT 'active', -- active, resolved, archived
  source_ids   uuid[] DEFAULT '{}', -- References to raw social_alerts
  
  -- AI Insights
  recommended_actions text[],
  prediction_impact   text,
  
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  resolved_at  timestamptz
);

-- Index for real-time dashboard performance
CREATE INDEX IF NOT EXISTS idx_intel_events_status ON social_intelligence_events(status);
CREATE INDEX IF NOT EXISTS idx_intel_events_category ON social_intelligence_events(category);
