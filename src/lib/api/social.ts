/**
 * Social Engine API Library
 * Purpose: City-centric real-time social intelligence.
 */

export interface SocialEvent {
  id:             string
  city_id:        string
  captured_at:    string
  source:         'x' | 'rss' | 'op'
  text:           string
  sentiment:      number
  severity:       'low' | 'medium' | 'high' | 'critical'
  entities:       Record<string, any>
  geo?:           { lat: number, lng: number }
  status:         'new' | 'moderated' | 'hidden'
}

export interface SocialTimeline {
  city_id:     string
  from:        string
  to:          string
  events:      SocialEvent[]
  aggregates:  {
    hour:           string
    count:          number
    mean_sentiment: number
  }[]
}

export async function collectSocialSignals(cityId: string) {
  const res = await fetch('/api/social/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cityId })
  })
  return res.json()
}

export async function getSocialTimeline(cityId: string, minutes: number = 1440): Promise<SocialTimeline> {
  const res = await fetch(`/api/social/timeline?cityId=${cityId}&minutes=${minutes}`)
  if (!res.ok) throw new Error('Failed to fetch social timeline')
  return res.json()
}

export async function seedSimulationFromSocial(cityId: string, eventId: string, radiusM: number = 300) {
  // Call the FastAPI backend via Next.js proxy or directly if configured
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/social/seed-from-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ city_id: cityId, event_id: eventId, radius_m: radiusM })
  })
  return res.json()
}
