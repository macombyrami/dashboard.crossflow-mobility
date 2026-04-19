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

const timelineCache = new Map<string, { expiresAt: number; data: SocialTimeline }>()
const timelineInflight = new Map<string, Promise<SocialTimeline>>()
const collectInflight = new Map<string, Promise<unknown>>()
const collectCooldown = new Map<string, number>()

export async function collectSocialSignals(cityId: string) {
  const now = Date.now()
  const last = collectCooldown.get(cityId) ?? 0
  const inflight = collectInflight.get(cityId)

  if (inflight) {
    return inflight
  }

  if (now - last < 30_000) {
    return { deduped: true, cityId }
  }

  const request = fetch('/api/social/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cityId })
  }).then(async res => {
    collectCooldown.set(cityId, Date.now())
    return res.ok ? res.json() : { ok: false, status: res.status }
  }).finally(() => {
    collectInflight.delete(cityId)
  })

  collectInflight.set(cityId, request)
  return request
}

export async function getSocialTimeline(cityId: string, minutes: number = 1440): Promise<SocialTimeline> {
  const key = `${cityId}:${minutes}`
  const cached = timelineCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const inflight = timelineInflight.get(key)
  if (inflight) {
    return inflight
  }

  const request = fetch(`/api/social/timeline?cityId=${cityId}&minutes=${minutes}`)
    .then(async res => {
      if (!res.ok) throw new Error('Failed to fetch social timeline')
      const data = await res.json() as SocialTimeline
      timelineCache.set(key, {
        data,
        expiresAt: Date.now() + 5 * 60 * 1000,
      })
      return data
    })
    .finally(() => {
      timelineInflight.delete(key)
    })

  timelineInflight.set(key, request)
  return request
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
