/**
 * SNCF Open Data API — Trafic trains France
 * Gratuit · Clé API gratuite sur data.sncf.com
 * https://data.sncf.com/api/explore/v2.1
 *
 * Données: perturbations, retards, trafic grandes lignes,
 * données Transilien (RER + trains banlieue)
 */

const BASE_V2 = 'https://data.sncf.com/api/explore/v2.1/catalog/datasets'

function hasNavitiaKey(): boolean {
  return false // Navitia supprimé — utiliser PRIM IDFM ou SNCF Open Data
}

export interface SNCFTrainStatus {
  trainNumber:   string
  axe:           string        // ligne (ex: "Paris - Lyon")
  departure:     string        // gare départ
  arrival:       string        // gare arrivée
  scheduledDep:  string        // HH:MM prévu
  realDep:       string        // HH:MM réel
  delayMin:      number
  status:        'à l\'heure' | 'retardé' | 'supprimé' | 'inconnu'
  cause?:        string
}

export interface SNCFDisruption {
  id:       string
  title:    string
  message:  string
  lines:    string[]
  severity: 'info' | 'warning' | 'critical'
  start:    string
  end:      string
}

export interface SNCFPonctualite {
  axe:              string
  tauxPonctualite:  number   // %
  nbTrains:         number
  nbRetards:        number
  retardMoyen:      number   // minutes
  mois:             string
}

// ─── Perturbations en cours ────────────────────────────────────────────────

export async function fetchSNCFDisruptions(): Promise<SNCFDisruption[]> {
  if (!hasNavitiaKey()) return await fetchSNCFDisruptionsOpenData()

  try {
    const res = await fetch(
      `/api/navitia/coverage/sncf/disruptions?count=30`,
      { signal: AbortSignal.timeout(6000) },
    )
    if (!res.ok) throw new Error('navitia failed')
    const data = await res.json()

    return (data.disruptions ?? [])
      .filter((d: any) => d.status === 'active')
      .map((d: any): SNCFDisruption => ({
        id:       d.id,
        title:    d.messages?.[0]?.text ?? 'Perturbation',
        message:  d.messages?.[1]?.text ?? '',
        lines:    (d.impacted_objects ?? [])
          .filter((o: any) => o.pt_object?.embedded_type === 'line')
          .map((o: any) => o.pt_object.line?.name ?? ''),
        severity: mapNavitiaSeverity(d.severity?.effect),
        start:    d.application_periods?.[0]?.begin ?? '',
        end:      d.application_periods?.[0]?.end   ?? '',
      }))
      .slice(0, 15)
  } catch {
    return fetchSNCFDisruptionsOpenData()
  }
}

// Fallback: Open Data SNCF (aucune clé)
async function fetchSNCFDisruptionsOpenData(): Promise<SNCFDisruption[]> {
  try {
    const res = await fetch(
      `${BASE_V2}/tgvmax/records?limit=5&order_by=date desc`,
      {
        signal: AbortSignal.timeout(5000),
        next:   { revalidate: 300 },
      },
    )
    // This is just sample data — real disruptions need the Navitia key
    return []
  } catch {
    return []
  }
}

// ─── Ponctualité par axe (open data — aucune clé) ─────────────────────────

export async function fetchSNCFPonctualite(): Promise<SNCFPonctualite[]> {
  try {
    const res = await fetch(
      `${BASE_V2}/regularite-mensuelle-intercites/records?limit=10&order_by=date desc`,
      {
        signal: AbortSignal.timeout(8000),
        next:   { revalidate: 3600 },
      },
    )
    if (!res.ok) return []
    const data = await res.json()

    return (data.results ?? []).map((r: any) => ({
      axe:             r.axe ?? '',
      tauxPonctualite: parseFloat(r.taux_de_regularite ?? '0'),
      nbTrains:        parseInt(r.nombre_de_trains_programmes ?? '0'),
      nbRetards:       parseInt(r.nombre_de_trains_retardes_a_l_arrivee ?? '0'),
      retardMoyen:     parseFloat(r.retard_moyen_des_trains_en_retard ?? '0'),
      mois:            r.date ?? '',
    }))
  } catch {
    return []
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function mapNavitiaSeverity(effect?: string): SNCFDisruption['severity'] {
  if (!effect) return 'info'
  const e = effect.toUpperCase()
  if (e.includes('NO_SERVICE') || e.includes('SIGNIFICANT'))   return 'critical'
  if (e.includes('REDUCED') || e.includes('MODIFIED'))        return 'warning'
  return 'info'
}
