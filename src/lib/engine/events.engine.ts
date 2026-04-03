import type { UrbanEvent } from '../api/events'
import { City } from '@/types'

/**
 * Utility to generate a date relative to now in ISO format.
 */
function getRelativeDate(daysOffset: number, hour: number = 8): string {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString().split('.')[0]
}

/**
 * Featured events for Paris — updated with dynamic 2026 data.
 */
const FEATURED_PARIS_EVENTS: Partial<UrbanEvent>[] = [
  {
    title: 'Marathon de Paris 2026 — Passage',
    category: 'sport',
    startDate: getRelativeDate(2, 8),
    endDate:   getRelativeDate(2, 15),
    location:  { lat: 48.8698, lng: 2.3078, address: 'Avenue des Champs-Élysées, Paris 8ème', district: '75008' },
    venue:     'Avenue des Champs-Élysées',
    attendance: 55000,
    trafficScore: 0.95,
    impactLabel: 'Impact critique',
    trafficIncrease: 80,
    distanceKm: 5.0,
    source: 'crossflow-engine',
  },
  {
    title: 'PSG vs Rennes — Ligue 1',
    category: 'sport',
    startDate: getRelativeDate(0, 21),
    endDate:   getRelativeDate(0, 23),
    location:  { lat: 48.8414, lng: 2.2530, address: 'Parc des Princes, Paris 16ème', district: '75016' },
    venue:     'Parc des Princes',
    attendance: 48000,
    trafficScore: 0.87,
    impactLabel: 'Impact fort',
    trafficIncrease: 68,
    distanceKm: 3.8,
    source: 'predicthq',
  },
  {
    title: 'Festival Chorus — Les voix du monde',
    category: 'festival',
    startDate: getRelativeDate(1, 14),
    endDate:   getRelativeDate(2, 22),
    location:  { lat: 48.8351, lng: 2.2223, address: 'La Seine Musicale, Boulogne-Billancourt', district: '92100' },
    venue:     'La Seine Musicale',
    attendance: 5000,
    trafficScore: 0.72,
    impactLabel: 'Impact fort',
    trafficIncrease: 52,
    distanceKm: 0.9,
    source: 'predicthq',
  },
  {
    title: 'Julius Rodriguez',
    category: 'concert',
    startDate: getRelativeDate(-1, 19),
    endDate:   getRelativeDate(-1, 23),
    location:  { lat: 48.8660, lng: 2.3477, address: 'Le Duc des Lombards, Paris 1er', district: '75001' },
    venue:     'Le Duc des Lombards',
    attendance: 35,
    trafficScore: 0.45,
    impactLabel: 'Impact modéré',
    trafficIncrease: 35,
    distanceKm: 7.5,
    source: 'predicthq',
  },
  {
    title: 'Regards de Femmes 2026 : Industri\'ELLES',
    category: 'congrès',
    startDate: getRelativeDate(3, 9),
    endDate:   getRelativeDate(3, 19),
    location:  { lat: 48.8540, lng: 2.3330, address: '4 Place Saint-Germain des Prés, 75006', district: '75006' },
    venue:     'Saint-Germain des Prés',
    attendance: 18,
    trafficScore: 0.28,
    impactLabel: 'Impact léger',
    trafficIncrease: 18,
    distanceKm: 2.2,
    source: 'predicthq',
  },
]

/**
 * Compute proximity impact for an event relative to a user position.
 */
export function computeProximityImpact(
  event: UrbanEvent,
  userLat: number,
  userLng: number,
  graphDensity = 1.0, // IDF zone multiplier (1.0 = average)
) {
  const distM = haversineM(userLat, userLng, event.location.lat, event.location.lng)

  // People potentially affected within 1km radius around user
  const overlapRatio    = Math.max(0, 1 - distM / (event.radius + 1000))
  const impactPersonnes = Math.round(event.attendance * overlapRatio * 0.3)

  // Traffic delta %
  const trafficDeltaPct = Math.round(event.trafficScore * graphDensity * (1 - distM / 5000) * 100)

  // Severity
  const score = (event.trafficScore * 0.5) + (overlapRatio * 0.35) + (Math.min(1, event.attendance / 20000) * 0.15)
  const severity: 'low' | 'medium' | 'high' | 'critical' =
    score > 0.75 ? 'critical' : score > 0.5 ? 'high' : score > 0.25 ? 'medium' : 'low'

  return { impactPersonnes, trafficDeltaPct, severity, overlapRatio, distM }
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6371000
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180
  const a  = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export function generateEventsForCity(city: City): UrbanEvent[] {
  const isParis = city.id === 'paris'

  if (isParis) {
    return FEATURED_PARIS_EVENTS.map((e, i) => ({
      ...e,
      id:         `sim-paris-${i}`,
      endDate:    e.endDate ?? e.startDate ?? new Date().toISOString(),
      startDate:  e.startDate ?? new Date().toISOString(),
      radius:     e.radius ?? 800,
      source:     e.source ?? 'crossflow-engine',
      distanceKm: e.distanceKm ?? parseFloat((Math.random() * 8 + 0.5).toFixed(1)),
      proximityScore: e.trafficScore ?? parseFloat((0.3 + Math.random() * 0.6).toFixed(2)),
    } as UrbanEvent))
  }

  // Generic simulation for other cities
  const categories: Array<UrbanEvent['category']> = ['concert', 'sport', 'festival', 'congrès', 'marché']
  const simulated: UrbanEvent[] = []

  for (let i = 0; i < 6; i++) {
    const cat       = categories[i % categories.length]
    const latOffset = (Math.random() - 0.5) * 0.02
    const lngOffset = (Math.random() - 0.5) * 0.02
    const score     = 0.2 + Math.random() * 0.6
    const dist      = parseFloat((Math.random() * 12 + 0.5).toFixed(1))

    simulated.push({
      id:           `sim-${city.id}-${i}`,
      title:        `${cat.charAt(0).toUpperCase() + cat.slice(1)} Event ${i + 1}`,
      category:     cat,
      startDate:    new Date().toISOString(),
      endDate:      new Date().toISOString(),
      location: {
        lat:      city.center.lat + latOffset,
        lng:      city.center.lng + lngOffset,
        address:  `${city.name} — Zone ${Math.floor(Math.random() * 20) + 1}`,
        district: `District ${Math.floor(Math.random() * 20) + 1}`,
      },
      attendance:      Math.floor(Math.random() * 5000) + 100,
      radius:          800,
      trafficScore:    score,
      impactLabel:     score > 0.6 ? 'Impact fort' : score > 0.3 ? 'Impact modéré' : 'Impact léger',
      trafficIncrease: Math.round(score * 60),
      distanceKm:      dist,
      proximityScore:  parseFloat((score * 0.5 + Math.random() * 0.3).toFixed(2)),
      source:          'crossflow-engine',
    })
  }

  return simulated
}
