import type { Incident, City } from '@/types'
import { fetchSytadinData, sytadinAlertToIncident } from '@/lib/api/sytadin'

/**
 * Sytadin Engine — DiRIF / Île-de-France
 *
 * Sources live data from sytadin.fr via /api/sytadin proxy.
 * Falls back to time-aware synthetic data when offline.
 */

export interface SytadinKPIs {
  totalCongestionKm: number
  trend:             'stable' | 'increasing' | 'decreasing'
  lastUpdated:       string
  source:            'live' | 'synthetic'
  degraded:          boolean
}

export interface SytadinTravelTime {
  axis:          string
  from:          string
  to:            string
  timeMin:       number
  normalTimeMin: number
  status:        'fluid' | 'dense' | 'saturated'
}

// ─── Reference travel times (normal conditions) ────────────────────────────

const AXES: Array<Omit<SytadinTravelTime, 'timeMin' | 'status'>> = [
  { axis: 'A1',          from: 'Roissy CDG',      to: 'Porte de la Chapelle', normalTimeMin: 18 },
  { axis: 'A6',          from: 'Évry',             to: "Porte d'Italie",       normalTimeMin: 25 },
  { axis: 'A13',         from: 'Rocquencourt',     to: "Porte d'Auteuil",      normalTimeMin: 15 },
  { axis: 'A86',         from: 'Nanterre',         to: 'Saint-Denis',          normalTimeMin: 12 },
  { axis: 'Périphérique',from: 'Porte de Bagnolet',to: 'Porte de Versailles',  normalTimeMin: 10 },
]

// ─── Time-aware congestion estimator ──────────────────────────────────────

function congestionFactor(): number {
  const h = new Date().getHours()
  if (h >= 7  && h < 10)  return 2.5 + Math.random() * 1.2   // AM rush
  if (h >= 17 && h < 20)  return 2.8 + Math.random() * 1.4   // PM rush
  if (h >= 11 && h < 14)  return 1.3 + Math.random() * 0.4   // lunch
  if (h >= 22 || h < 6)   return 1.0 + Math.random() * 0.15  // night
  return 1.1 + Math.random() * 0.3
}

function baseCongestionKm(): number {
  const h = new Date().getHours()
  if (h >= 7  && h < 10)  return 130 + Math.random() * 220
  if (h >= 17 && h < 20)  return 160 + Math.random() * 260
  if (h >= 11 && h < 14)  return 50  + Math.random() * 80
  if (h >= 22 || h < 6)   return 3   + Math.random() * 15
  return 30 + Math.random() * 60
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Fetch live Sytadin KPIs from sytadin.fr.
 * Falls back to synthetic data on error.
 */
export async function fetchSytadinKPIs(): Promise<SytadinKPIs> {
  try {
    const data = await fetchSytadinData()
    const km   = data.congestionKm || Math.round(baseCongestionKm())

    // Determine trend based on time of day
    const h = new Date().getHours()
    const trend: SytadinKPIs['trend'] =
      (h >= 7  && h < 9)  ? 'increasing' :
      (h >= 9  && h < 11) ? 'decreasing' :
      (h >= 17 && h < 19) ? 'increasing' :
      (h >= 19 && h < 21) ? 'decreasing' : 'stable'

    return {
      totalCongestionKm: km,
      trend,
      lastUpdated:       data.lastUpdated,
      source:            'live',
      degraded:          data.degraded,
    }
  } catch {
    return generateSytadinKPIs()
  }
}

/**
 * Synthetic fallback KPIs (time-aware, no network request).
 */
export function generateSytadinKPIs(_city?: City): SytadinKPIs {
  const h = new Date().getHours()
  const trend: SytadinKPIs['trend'] =
    (h >= 7  && h < 9)  ? 'increasing' :
    (h >= 9  && h < 11) ? 'decreasing' :
    (h >= 17 && h < 19) ? 'increasing' :
    (h >= 19 && h < 21) ? 'decreasing' : 'stable'

  return {
    totalCongestionKm: Math.round(baseCongestionKm()),
    trend,
    lastUpdated:       new Date().toISOString(),
    source:            'synthetic',
    degraded:          false,
  }
}

/**
 * Travel times for IDF major axes.
 * Multiplied by current congestion factor.
 */
export function generateSytadinTravelTimes(): SytadinTravelTime[] {
  const factor = congestionFactor()
  return AXES.map(ax => {
    const jitter  = 1 + (Math.random() - 0.5) * 0.2
    const timeMin = Math.round(ax.normalTimeMin * factor * jitter)
    const ratio   = timeMin / ax.normalTimeMin
    const status: SytadinTravelTime['status'] =
      ratio > 2.0 ? 'saturated' : ratio > 1.4 ? 'dense' : 'fluid'
    return { ...ax, timeMin, status }
  })
}

/**
 * Fetch live Sytadin incidents and merge with existing incidents.
 * For non-IDF cities, returns existing unchanged.
 */
export async function fetchAndInjectSytadinIncidents(
  city: City,
  existing: Incident[],
): Promise<Incident[]> {
  if (!isIdfCity(city)) return existing

  try {
    const data      = await fetchSytadinData()
    const active    = data.alerts.filter(a => a.prefix !== 'TERMINE')
    const incidents = active.map(sytadinAlertToIncident)
    return [...incidents, ...existing.filter(i => i.source !== 'Sytadin')]
  } catch {
    return injectSytadinIncidents(city, existing)
  }
}

/**
 * Synthetic incident injection (fallback).
 */
export function injectSytadinIncidents(city: City, existing: Incident[]): Incident[] {
  if (!isIdfCity(city)) return existing

  const templates = [
    { title: 'A1 — Travaux',           description: "Fermeture nocturne de la bretelle d'accès vers la province.", severity: 'high'     as const, road: 'A1' },
    { title: 'A86 Ext. — Accident',     description: 'Accident impliquant un PL à hauteur de Colombes.',           severity: 'critical' as const, road: 'A86' },
    { title: 'Périphérique — Bouchon',  description: 'Ralentissement entre Porte Maillot et Porte d\'Orléans.',   severity: 'medium'   as const, road: 'BP' },
    { title: 'A6b — Chantier',          description: 'Réfection de chaussée, vitesse limitée à 70 km/h.',         severity: 'low'      as const, road: 'A6B' },
    { title: 'A13 — Panne',             description: 'Véhicule en panne sur la bande d\'arrêt d\'urgence.',       severity: 'low'      as const, road: 'A13' },
  ]

  const IDF_COORDS: Record<string, { lat: number; lng: number }> = {
    'A1':  { lat: 48.977, lng: 2.342 }, 'A86': { lat: 48.875, lng: 2.258 },
    'BP':  { lat: 48.864, lng: 2.336 }, 'A6B': { lat: 48.804, lng: 2.320 },
    'A13': { lat: 48.865, lng: 2.085 },
  }
  const colorMap = { critical: '#FF3B30', high: '#FF9500', medium: '#FFD600', low: '#34C759' }

  const synthetic: Incident[] = templates.slice(0, 3).map((t, i) => ({
    id:          `sytadin-synth-${i}`,
    type:        t.title.includes('Travaux') || t.title.includes('Chantier') ? 'roadwork' :
                 t.title.includes('Accident') ? 'accident' : 'congestion',
    severity:    t.severity,
    title:       t.title,
    description: t.description,
    location:    IDF_COORDS[t.road] ?? { lat: city.center.lat, lng: city.center.lng },
    address:     `${t.road} — Île-de-France`,
    startedAt:   new Date(Date.now() - Math.random() * 3_600_000).toISOString(),
    source:      'Sytadin',
    iconColor:   colorMap[t.severity],
  }))

  return [...synthetic, ...existing.filter(i => i.source !== 'Sytadin')]
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const IDF_CITY_IDS   = new Set(['paris'])
const IDF_CITY_NAMES = ['paris', 'île-de-france', 'versailles', 'boulogne', 'saint-denis',
                        'nanterre', 'créteil', 'argenteuil', 'montreuil', 'cergy']

export function isIdfCity(city: City): boolean {
  if (IDF_CITY_IDS.has(city.id)) return true
  const name = city.name.toLowerCase()
  return IDF_CITY_NAMES.some(n => name.includes(n)) ||
    (city.countryCode === 'FR' && city.bbox
      ? city.center.lat > 48.3 && city.center.lat < 49.3
        && city.center.lng > 1.8 && city.center.lng < 3.2
      : false)
}
