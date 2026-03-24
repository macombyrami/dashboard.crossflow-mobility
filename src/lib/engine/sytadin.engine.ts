import { Incident, City } from '@/types'

/**
 * Sytadin Engine
 * Simulates real-time traffic indicators from Sytadin (Île-de-France).
 */

export interface SytadinKPIs {
  totalCongestionKm: number
  trend: 'stable' | 'increasing' | 'decreasing'
  lastUpdated: string
}

export interface SytadinTravelTime {
  axis: string
  from: string
  to: string
  timeMin: number
  normalTimeMin: number
  status: 'fluid' | 'dense' | 'saturated'
}

/**
 * Featured Sytadin incidents for Paris.
 */
const SYTADIN_INCIDENT_TEMPLATES = [
  { title: "A1 — Travaux", description: "Fermeture nocturne de la bretelle d'accès vers la province.", severity: 'high' as const },
  { title: "A86 Extérieur — Accident", description: "Accident impliquant un PL à hauteur de Colombes.", severity: 'critical' as const },
  { title: "BP Intérieur — Bouchon", description: "Ralentissement important entre Porte Maillot et Porte d'Orléans.", severity: 'medium' as const },
  { title: "A6b — Chantier", description: "Réfection de chaussée, vitesse limitée à 70km/h.", severity: 'low' as const },
  { title: "A13 — Panne", description: "Véhicule en panne sur la bande d'arrêt d'urgence.", severity: 'low' as const },
]

export function generateSytadinKPIs(city: City): SytadinKPIs {
  const hour = new Date().getHours()
  const isRushHour = (hour >= 7 && hour <= 10) || (hour >= 16 && hour <= 19)
  
  let baseKm = 50
  if (isRushHour) baseKm = 150 + Math.random() * 250
  else if (hour > 22 || hour < 6) baseKm = 5 + Math.random() * 20
  else baseKm = 40 + Math.random() * 80

  const trends: SytadinKPIs['trend'][] = ['stable', 'increasing', 'decreasing']
  
  return {
    totalCongestionKm: Math.round(baseKm),
    trend: trends[Math.floor(Math.random() * 3)],
    lastUpdated: new Date().toISOString()
  }
}

export function generateSytadinTravelTimes(): SytadinTravelTime[] {
  return [
    { axis: 'A1', from: 'Roissy', to: 'Porte de la Chapelle', timeMin: 35, normalTimeMin: 18, status: 'saturated' },
    { axis: 'A6', from: 'Evry', to: 'Porte d\'Italie', timeMin: 42, normalTimeMin: 25, status: 'saturated' },
    { axis: 'A13', from: 'Rocquencourt', to: 'Porte d\'Auteuil', timeMin: 22, normalTimeMin: 15, status: 'dense' },
    { axis: 'A86', from: 'Nanterre', to: 'Saint-Denis', timeMin: 28, normalTimeMin: 12, status: 'saturated' },
    { axis: 'Périphérique', from: 'Porte de Bagnolet', to: 'Porte de Versailles', timeMin: 18, normalTimeMin: 10, status: 'dense' },
  ]
}

export function injectSytadinIncidents(city: City, existing: Incident[]): Incident[] {
  if (city.id !== 'paris') return existing

  const sytadinIncidents: Incident[] = SYTADIN_INCIDENT_TEMPLATES.slice(0, 3).map((t, i) => ({
    id: `sytadin-${i}`,
    type: t.title.toLowerCase().includes('travaux') ? 'roadwork' : t.title.toLowerCase().includes('accident') ? 'accident' : 'congestion',
    severity: t.severity,
    title: t.title,
    description: t.description,
    location: { lat: city.center.lat + (Math.random() - 0.5) * 0.05, lng: city.center.lng + (Math.random() - 0.5) * 0.05 },
    address: "Île-de-France",
    startedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    source: "Sytadin",
    iconColor: t.severity === 'critical' ? '#FF3B30' : t.severity === 'high' ? '#FF9500' : '#FFCC00'
  }))

  return [...sytadinIncidents, ...existing]
}
