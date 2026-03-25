/**
 * Transport multimodal IDF — remplace Navitia (offre freemium supprimée)
 * Source: PRIM Île-de-France Mobilités (officiel, clé IDFM_API_KEY)
 *
 * Exports identiques à l'ancienne API Navitia pour éviter toute migration.
 */

// ─── Types (compatibilité Navitia) ────────────────────────────────────────────

export interface NavitiaDisruption {
  id:          string
  status:      'active' | 'future' | 'past'
  severity:    { name: string; effect: string; color: string; priority: number }
  title:       string
  message:     string
  lines:       { id: string; name: string; code: string; color: string; mode: string }[]
  startDate:   string
  endDate:     string
  updatedAt:   string
}

export interface NavitiaLine {
  id:      string
  name:    string
  code:    string
  color:   string
  mode:    string
  network: string
}

export interface NavitiaDeparture {
  line:          NavitiaLine
  stopName:      string
  direction:     string
  departureTime: string
  realtime:      boolean
  delay:         number
}

// ─── Key check ────────────────────────────────────────────────────────────────

export function hasKey(): boolean {
  // PRIM IDFM remplace Navitia — clé serveur, toujours active si configurée
  return typeof window !== 'undefined' // côté client on assume actif (clé serveur)
    ? true
    : Boolean(process.env.IDFM_API_KEY)
}

// ─── Disruptions via PRIM (proxy /api/prim-disruptions) ──────────────────────

export async function fetchDisruptions(
  lat: number,
  lng: number,
  _radiusM = 5000,
): Promise<NavitiaDisruption[]> {
  // PRIM couvre toute l'IDF — on filtre sur la zone Paris/IDF
  const isIDF = lat > 48.1 && lat < 49.3 && lng > 1.4 && lng < 3.6
  if (!isIDF) return []

  try {
    const res = await fetch('/api/prim-disruptions', {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.disruptions ?? []) as NavitiaDisruption[]
  } catch {
    return []
  }
}

// ─── Next departures ──────────────────────────────────────────────────────────
// PRIM stop-monitoring nécessite un MonitoringRef STIF (résolution par coords non supportée)
// → Utiliser fetchNextPassages() dans ratp.ts pour les passages RATP.

export async function fetchNextDepartures(
  _lat: number,
  _lng: number,
): Promise<NavitiaDeparture[]> {
  return []
}
