/**
 * Calendrier contextuel — données France
 * 100% GRATUIT · Aucune clé
 *
 * Sources:
 * - Jours fériés: calendrier.api.gouv.fr (API officielle gouvernement)
 * - Calendrier scolaire: data.education.gouv.fr
 * - Sunrise/sunset: sunrise-sunset.org
 *
 * Impact sur le modèle prévisionnel:
 * - Jour férié        → -50% congestion
 * - Vacances scolaires → -30% congestion
 * - Veille de férié   → +15% (départs anticipés)
 * - Rentrée           → +20% (choc de rentrée)
 */

export interface HolidayInfo {
  isFerie:          boolean
  ferieLabel?:      string
  isVacances:       boolean
  vacancesZone?:    'A' | 'B' | 'C'    // zones académiques France
  vacancesLabel?:   string
  isVeilleFerie:    boolean
  isRentree:        boolean
  schoolPeriod:     'vacances' | 'normal' | 'inconnue'
}

export interface SunInfo {
  sunrise:   string   // HH:MM local
  sunset:    string   // HH:MM local
  dayLength: number   // minutes
  isDaytime: boolean
  isGoldenHour: boolean  // ±30 min around sunrise/sunset → glare risk
}

export interface CalendarContext {
  date:         Date
  holiday:      HolidayInfo
  sun:          SunInfo | null
  trafficFactor: number   // multiplicateur 0.3–1.4 à appliquer sur congestion de base
  reasons:      string[]  // explications pour l'IA
}

// ─── Jours fériés France ──────────────────────────────────────────────────

export async function fetchJoursFeries(year: number = new Date().getFullYear()): Promise<Record<string, string>> {
  try {
    const res = await fetch(
      `https://calendrier.api.gouv.fr/jours-feries/metropole/${year}.json`,
      { next: { revalidate: 86400 } }, // cache 24h
    )
    if (!res.ok) return getFeriesFallback(year)
    return await res.json()
  } catch {
    return getFeriesFallback(year)
  }
}

// ─── Calendrier scolaire ──────────────────────────────────────────────────

interface VacanceRecord {
  start_date:  string
  end_date:    string
  description: string
  zones:       string    // "Zone A", "Zone B", "Zone C"
  location:    string
}

export async function fetchCalendrierScolaire(year?: number): Promise<VacanceRecord[]> {
  const y = year ?? new Date().getFullYear()
  try {
    const res = await fetch(
      `https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records?where=start_date%3E%3D%22${y}-01-01%22%20AND%20end_date%3C%3D%22${y+1}-08-31%22&limit=50&order_by=start_date`,
      { next: { revalidate: 86400 } },
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? []) as VacanceRecord[]
  } catch {
    return []
  }
}

// ─── Sunrise / Sunset ─────────────────────────────────────────────────────

export async function fetchSunInfo(lat: number, lng: number, date?: Date): Promise<SunInfo | null> {
  const d = date ?? new Date()
  const ds = d.toISOString().slice(0, 10)
  try {
    const res = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${ds}&formatted=0`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 'OK') return null

    const sunrise  = new Date(data.results.sunrise)
    const sunset   = new Date(data.results.sunset)
    const now      = new Date()
    const dayLen   = Math.round((sunset.getTime() - sunrise.getTime()) / 60000)

    const diffSunrise = Math.abs(now.getTime() - sunrise.getTime()) / 60000
    const diffSunset  = Math.abs(now.getTime() - sunset.getTime())  / 60000

    return {
      sunrise:      `${sunrise.getHours().toString().padStart(2, '0')}:${sunrise.getMinutes().toString().padStart(2, '0')}`,
      sunset:       `${sunset.getHours().toString().padStart(2, '0')}:${sunset.getMinutes().toString().padStart(2, '0')}`,
      dayLength:    dayLen,
      isDaytime:    now > sunrise && now < sunset,
      isGoldenHour: diffSunrise <= 30 || diffSunset <= 30,
    }
  } catch {
    return null
  }
}

// ─── Aggregate context ────────────────────────────────────────────────────

export async function buildCalendarContext(
  lat: number,
  lng: number,
  zone: 'A' | 'B' | 'C' = 'C',   // Paris = Zone C
): Promise<CalendarContext> {
  const now   = new Date()
  const today = now.toISOString().slice(0, 10)
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10)

  const [feries, vacances, sun] = await Promise.all([
    fetchJoursFeries(now.getFullYear()),
    fetchCalendrierScolaire(now.getFullYear()),
    fetchSunInfo(lat, lng),
  ])

  // Check fériés
  const ferieLabel      = feries[today]
  const isFerie         = Boolean(ferieLabel)
  const isVeilleFerie   = Boolean(feries[tomorrow])

  // Check vacances scolaires
  const zoneKey = `Zone ${zone}`
  const currentVac = vacances.find(v =>
    v.zones?.includes(zoneKey) &&
    today >= v.start_date.slice(0, 10) &&
    today <= v.end_date.slice(0, 10),
  )
  const isVacances    = Boolean(currentVac)
  const vacancesLabel = currentVac?.description

  // Check rentrée: first school day after summer/vacation
  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10)
  const wasVacancesYesterday = vacances.find(v =>
    v.zones?.includes(zoneKey) &&
    yesterday >= v.start_date.slice(0, 10) &&
    yesterday <= v.end_date.slice(0, 10),
  )
  const isRentree = Boolean(wasVacancesYesterday) && !isVacances && !isFerie

  // Compute traffic factor
  let factor  = 1.0
  const reasons: string[] = []

  if (isFerie) {
    factor *= 0.45
    reasons.push(`Jour férié: ${ferieLabel} (-55% trafic)`)
  } else if (isVacances) {
    factor *= 0.68
    reasons.push(`Vacances scolaires Zone ${zone}: ${vacancesLabel ?? ''} (-32% trafic)`)
  } else if (isRentree) {
    factor *= 1.20
    reasons.push(`Rentrée scolaire (+20% trafic)`)
  }

  if (isVeilleFerie && !isFerie) {
    factor *= 1.15
    reasons.push('Veille de jour férié (+15% départs anticipés)')
  }

  // Weekend
  const dow = now.getDay()
  if (dow === 6) { factor *= 0.65; reasons.push('Samedi (-35%)') }
  if (dow === 0) { factor *= 0.50; reasons.push('Dimanche (-50%)') }

  // August effect (Paris vidé)
  if (now.getMonth() === 7 && lng > -1 && lng < 4 && lat > 48 && lat < 49.5) {
    factor *= 0.60
    reasons.push('Mois d\'août Paris (-40% trafic résidentiel)')
  }

  // Golden hour visibility risk
  if (sun?.isGoldenHour) {
    factor *= 1.08
    reasons.push('Heure dorée — éblouissement (+8% prudence)')
  }

  if (reasons.length === 0) reasons.push('Jour ouvrable standard')

  return {
    date:    now,
    holiday: {
      isFerie,
      ferieLabel,
      isVacances,
      vacancesZone:  isVacances ? zone : undefined,
      vacancesLabel,
      isVeilleFerie,
      isRentree,
      schoolPeriod:  isVacances ? 'vacances' : vacances.length > 0 ? 'normal' : 'inconnue',
    },
    sun,
    trafficFactor: Math.round(factor * 100) / 100,
    reasons,
  }
}

// ─── Fallback jours fériés (hardcodés pour l'année courante) ─────────────

function getFeriesFallback(year: number): Record<string, string> {
  return {
    [`${year}-01-01`]: 'Jour de l\'An',
    [`${year}-05-01`]: 'Fête du Travail',
    [`${year}-05-08`]: 'Victoire 1945',
    [`${year}-07-14`]: 'Fête Nationale',
    [`${year}-08-15`]: 'Assomption',
    [`${year}-11-01`]: 'Toussaint',
    [`${year}-11-11`]: 'Armistice',
    [`${year}-12-25`]: 'Noël',
  }
}
