import type { UrbanEvent } from '../api/events'
import { City } from '@/types'

/**
 * Featured events for Paris as requested by the user.
 * These are pinned to specific dates (Mar 25-26, 2026) in the simulation.
 */
const FEATURED_PARIS_EVENTS: Partial<UrbanEvent>[] = [
  {
    title: "Regards de Femmes 2026 : Industri'ELLES",
    category: 'congrès',
    startDate: '2026-03-25T09:30:00',
    location: { lat: 48.8540, lng: 2.3330, address: "4 Place Saint-Germain des Prés, 75006 Paris, France", district: "6ème" },
    attendance: 76,
    trafficScore: 0.28,
    impactLabel: "Impact léger",
    trafficIncrease: 28,
    source: "predicthq"
  },
  {
    title: "Campus Briefing | Loi de finances : décryptage et points de vigilance",
    category: 'congrès',
    startDate: '2026-03-26T17:00:00',
    location: { lat: 48.8600, lng: 2.3400, address: "75001 Paris, France", district: "1er" },
    attendance: 83,
    trafficScore: 0.28,
    impactLabel: "Impact léger",
    trafficIncrease: 28,
    source: "predicthq"
  },
  {
    title: "Between big law, boutiques and independents",
    category: 'congrès',
    startDate: '2026-03-25T10:00:00',
    location: { lat: 48.8700, lng: 2.3000, address: "75008 Paris, France", district: "8ème" },
    attendance: 70,
    trafficScore: 0.27,
    impactLabel: "Impact léger",
    trafficIncrease: 27,
    source: "predicthq"
  },
  {
    title: "Julius Rodriguez",
    category: 'concert',
    startDate: '2026-03-25T19:30:00',
    location: { lat: 48.8660, lng: 2.3700, address: "Le Duc des Lombards, 75001 Paris, France", district: "1er" },
    attendance: 120,
    trafficScore: 0.27,
    impactLabel: "Impact léger",
    trafficIncrease: 27,
    source: "predicthq"
  },
  {
    title: "L’affaire des armes de destruction massive irakiennes (1970-2003)",
    category: 'congrès',
    startDate: '2026-03-26T18:00:00',
    location: { lat: 48.8500, lng: 2.3300, address: "78 Rue Bonaparte, 75006 Paris, France", district: "6ème" },
    attendance: 74,
    trafficScore: 0.27,
    impactLabel: "Impact léger",
    trafficIncrease: 27,
    source: "predicthq"
  }
]

export function generateEventsForCity(city: City): UrbanEvent[] {
  const isParis = city.id === 'paris'
  
  if (isParis) {
    return FEATURED_PARIS_EVENTS.map((e, i) => ({
      ...e,
      id: `sim-paris-${i}`,
      endDate: e.startDate, // simplifies for now
      radius: 500,
      source: 'predicthq',
    } as UrbanEvent))
  }

  // Generic simulation for other cities
  const categories: Array<UrbanEvent['category']> = ['concert', 'sport', 'congrès', 'marché']
  const simulated: UrbanEvent[] = []
  
  for (let i = 0; i < 6; i++) {
    const cat = categories[i % categories.length]
    const latOffset = (Math.random() - 0.5) * 0.02
    const lngOffset = (Math.random() - 0.5) * 0.02
    const score = 0.2 + Math.random() * 0.6
    
    simulated.push({
      id: `sim-${city.id}-${i}`,
      title: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Event ${i + 1}`,
      category: cat,
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      location: {
        lat: city.center.lat + latOffset,
        lng: city.center.lng + lngOffset,
        address: `${city.name} District ${Math.floor(Math.random() * 20) + 1}`,
        district: `District ${Math.floor(Math.random() * 20) + 1}`
      },
      attendance: Math.floor(Math.random() * 5000),
      radius: 800,
      trafficScore: score,
      impactLabel: score > 0.6 ? "Impact fort" : score > 0.3 ? "Impact modéré" : "Impact léger",
      trafficIncrease: Math.round(score * 40),
      source: 'crossflow-engine'
    })
  }

  return simulated
}
