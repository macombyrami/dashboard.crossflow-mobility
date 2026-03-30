/**
 * Sytadin.fr — DiRIF (Direction des Routes d'Île-de-France)
 * Live traffic alerts for the Greater Paris highway network.
 * Data refreshed every 3 minutes on sytadin.fr
 * Proxy: /api/sytadin?endpoint=alerts|congestion
 */

import type { Incident, IncidentSeverity, IncidentType } from '@/types'

// ─── Road coordinate lookup (IDF major roads) ─────────────────────────────

const IDF_ROADS: Record<string, { lat: number; lng: number }> = {
  'A1':   { lat: 48.977, lng: 2.342 }, // Paris-CDG
  'A3':   { lat: 48.862, lng: 2.445 }, // Paris-Est
  'A4':   { lat: 48.836, lng: 2.494 }, // Autoroute de l'Est
  'A5':   { lat: 48.730, lng: 2.456 }, // Autoroute du Soleil (S-E)
  'A6':   { lat: 48.746, lng: 2.348 }, // Autoroute du Soleil (S)
  'A6B':  { lat: 48.804, lng: 2.320 },
  'A10':  { lat: 48.791, lng: 2.056 }, // Aquitaine
  'A11':  { lat: 48.774, lng: 2.025 }, // Océane
  'A12':  { lat: 48.805, lng: 2.047 },
  'A13':  { lat: 48.865, lng: 2.085 }, // Normandie
  'A14':  { lat: 48.899, lng: 2.175 }, // La Défense
  'A15':  { lat: 49.015, lng: 2.157 }, // Cergy-Pontoise
  'A16':  { lat: 49.050, lng: 2.108 },
  'A86':  { lat: 48.875, lng: 2.258 }, // Grande Couronne
  'A104': { lat: 48.935, lng: 2.583 }, // Francilienne Nord
  'N7':   { lat: 48.783, lng: 2.388 },
  'N10':  { lat: 48.710, lng: 2.153 },
  'N12':  { lat: 48.820, lng: 1.989 },
  'N13':  { lat: 48.942, lng: 2.054 },
  'N14':  { lat: 49.030, lng: 2.075 },
  'N20':  { lat: 48.635, lng: 2.348 },
  'N104': { lat: 48.655, lng: 2.582 }, // Francilienne Sud
  'N118': { lat: 48.728, lng: 2.218 }, // Voie rapide Sud
  'N184': { lat: 49.048, lng: 2.072 }, // Cergy-Pontoise
  'D30':  { lat: 49.073, lng: 2.091 },
  'D308': { lat: 49.083, lng: 2.097 },
  'BP':   { lat: 48.864, lng: 2.336 }, // Boulevard Périphérique
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SytadinAlert {
  id:          string         // fragment ID from sytadin.fr
  raw:         string         // original text
  prefix:      '!FLASH' | 'FLASH' | 'INFO' | 'TERMINE' | 'UNKNOWN'
  road:        string         // 'A4', 'N184', etc.
  direction:   string         // 'vers Paris' | 'vers la province' | 'intérieur' | 'extérieur'
  actionType:  string         // 'COUPURE' | 'Fermeture' | 'Accident' | 'Bouchon' | ...
  location:    string         // municipality / junction
  coords:      { lat: number; lng: number }
  publishedAt: string         // ISO
  severity:    IncidentSeverity
  incidentType: IncidentType
}

export interface SytadinData {
  alerts:            SytadinAlert[]
  congestionKm:      number
  lastUpdated:       string
  degraded:          boolean   // sytadin.fr "degrade" flag
  dataTimestamp:     string    // "date donnees" from HTML comment
}

// ─── HTML parsers ──────────────────────────────────────────────────────────

function parseAlertHtml(html: string): { alerts: SytadinAlert[]; degraded: boolean; dataTimestamp: string } {
  const degraded  = /degrade\s*:\s*true/i.test(html)
  const tsMatch   = html.match(/date donnees\s*:\s*([\d\-\s:.]+)/)
  const dataTimestamp = tsMatch ? tsMatch[1].trim() : new Date().toISOString()

  // Extract each <li> item
  const liRegex  = /<li>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*title="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/li>/gi
  const alerts: SytadinAlert[] = []
  let match: RegExpExecArray | null

  while ((match = liRegex.exec(html)) !== null) {
    const href  = match[1] ?? ''
    const title = decodeHtmlEntities((match[2] ?? '').trim())
    const idStr = href.split('#')[1] ?? String(Date.now() + alerts.length)

    const parsed = parseAlertText(title, idStr)
    if (parsed) alerts.push(parsed)
  }

  return { alerts, degraded, dataTimestamp }
}

function parseCongestionHtml(html: string): number {
  // Pattern: alt="8 km" or filename led_number_8.gif, led_number_Km
  const altMatch  = html.match(/alt="(\d+)\s*km"/i)
  if (altMatch) return parseInt(altMatch[1], 10)

  const gifMatch  = html.match(/led_number_(\d+)\.gif/i)
  if (gifMatch) return parseInt(gifMatch[1], 10)

  return 0
}

function parseAlertText(text: string, id: string): SytadinAlert | null {
  if (!text || text.length < 5) return null

  // Detect prefix
  let prefix: SytadinAlert['prefix'] = 'UNKNOWN'
  let body = text
  if (/^\[Terminé\]/i.test(text)) {
    prefix = 'TERMINE'
    body   = text.replace(/^\[Terminé\]\s*/i, '')
  }
  if (/^!FLASH\//i.test(body)) {
    prefix = '!FLASH'
    body   = body.replace(/^!FLASH\//i, '')
  } else if (/^FLASH\//i.test(body)) {
    prefix = 'FLASH'
    body   = body.replace(/^FLASH\//i, '')
  } else if (/^INFO\//i.test(body)) {
    prefix = 'INFO'
    body   = body.replace(/^INFO\//i, '')
  }

  // Extract road identifier (A4, N118, BP, D30...)
  const roadMatch = body.match(/\b([A-Z](?:P|104|86|\d{1,3})(?:[A-Z]b?)?)\b/)
  const road      = roadMatch ? roadMatch[1].toUpperCase() : 'IDF'

  // Extract direction
  let direction = ''
  if (/vers\s+Paris/i.test(body))          direction = 'vers Paris'
  else if (/vers\s+la\s+province/i.test(body)) direction = 'vers la province'
  else if (/sens\s+int[eé]rieur/i.test(body))  direction = 'sens intérieur'
  else if (/sens\s+ext[eé]rieur/i.test(body))  direction = 'sens extérieur'

  // Extract action type
  let actionType = 'Incident'
  const actionMap: [RegExp, string][] = [
    [/COUPURE/i,         'Coupure'],
    [/[Ff]ermeture/,     'Fermeture'],
    [/[Aa]ccident/,      'Accident'],
    [/SATURATION|SATURE/i,'Saturation'],
    [/[Bb]ouchon/,       'Bouchon'],
    [/[Tt]ravaux/,       'Travaux'],
    [/[Pp]anne/,         'Panne'],
    [/[Mm]anifestation/,'Manifestation'],
    [/[Cc]ontretemps/,   'Contretemps'],
  ]
  for (const [re, label] of actionMap) {
    if (re.test(body)) { actionType = label; break }
  }

  // Extract location (after "à " or inside parentheses)
  let location = ''
  const parenMatch = body.match(/\(([^)]+)\)/)
  const aMatch     = body.match(/\bà\s+([A-ZÀ-Ÿ][^,.\n:]+)/i)
  location = parenMatch ? parenMatch[1].trim() : aMatch ? aMatch[1].trim() : ''

  // Coordinates lookup
  const coords = IDF_ROADS[road] ??
    IDF_ROADS[road.replace(/B$/, '')] ??   // 'A6B' → 'A6'
    { lat: 48.866 + (Math.random() - 0.5) * 0.08, lng: 2.333 + (Math.random() - 0.5) * 0.15 }

  // Severity mapping
  const severity: IncidentSeverity =
    prefix === '!FLASH'                                  ? 'critical' :
    prefix === 'FLASH'                                   ? 'high'     :
    prefix === 'INFO'                                    ? 'low'      :
    prefix === 'TERMINE'                                 ? 'low'      : 'medium'

  // Incident type mapping
  const incidentType: IncidentType =
    actionType === 'Accident'                            ? 'accident'   :
    actionType === 'Travaux'                             ? 'roadwork'   :
    ['Saturation', 'Bouchon'].includes(actionType)       ? 'congestion' :
    ['Fermeture', 'Coupure'].includes(actionType)        ? 'roadwork'   : 'anomaly'

  return {
    id:          `sytadin-${id}`,
    raw:         text,
    prefix,
    road,
    direction,
    actionType,
    location,
    coords,
    publishedAt: new Date().toISOString(),
    severity,
    incidentType,
  }
}

// ─── API client (Core Fetcher — No circular calls) ───────────────────────

export async function fetchSytadinRaw(endpoint: 'alerts' | 'congestion'): Promise<{ html: string; degraded: boolean }> {
  const url = endpoint === 'alerts' 
    ? 'https://www.sytadin.fr/refreshed/alert_block.jsp.html' 
    : 'https://www.sytadin.fr/refreshed/cumul_bouchon.jsp.html'

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (compatible; CrossFlow/1.0; contact@crossflow-mobility.com)',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Accept':          'text/html,application/xhtml+xml',
      },
      next: { revalidate: 180 },
      signal: AbortSignal.timeout(8000), 
    })

    if (!res.ok) throw new Error(`Sytadin upstream error: ${res.status}`)
    
    const html = await res.text()
    const degraded = res.headers.get('X-Sytadin-Fallback') === 'true' || /degrade\s*:\s*true/i.test(html)
    
    return { html, degraded }
  } catch (err) {
    console.error(`[Sytadin Raw Fetch] Fail for ${endpoint}:`, err)
    return { html: '', degraded: true }
  }
}

export async function fetchSytadinData(): Promise<SytadinData> {
  // Use direct raw fetching instead of HTTP calls to own proxy
  const [alertRes, congestRes] = await Promise.all([
    fetchSytadinRaw('alerts'),
    fetchSytadinRaw('congestion'),
  ])

  const { alerts, degraded, dataTimestamp } = parseAlertHtml(alertRes.html)
  const congestionKm = parseCongestionHtml(congestRes.html)

  return {
    alerts,
    congestionKm,
    lastUpdated:   new Date().toISOString(),
    degraded:      degraded || alertRes.degraded || congestRes.degraded,
    dataTimestamp,
  }
}

// ─── Convert SytadinAlert → Incident (CrossFlow format) ───────────────────

export function sytadinAlertToIncident(alert: SytadinAlert): Incident {
  const colorMap: Record<IncidentSeverity, string> = {
    critical: '#FF3B30',
    high:     '#FF9500',
    medium:   '#FFD600',
    low:      '#34C759',
  }

  const dirLabel  = alert.direction ? ` — ${alert.direction}` : ''
  const locLabel  = alert.location  ? ` (${alert.location})`  : ''

  return {
    id:          alert.id,
    type:        alert.incidentType,
    severity:    alert.severity,
    title:       `${alert.road} — ${alert.actionType}${locLabel}`,
    description: alert.raw,
    location:    alert.coords,
    address:     `${alert.road}${dirLabel}${locLabel} — Île-de-France`,
    startedAt:   alert.publishedAt,
    source:      'Sytadin',
    iconColor:   colorMap[alert.severity],
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&agrave;/g, 'à').replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è')
    .replace(/&ecirc;/g, 'ê').replace(/&ocirc;/g, 'ô').replace(/&ucirc;/g, 'û')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#\d+;/g, c => String.fromCharCode(parseInt(c.slice(2, -1), 10)))
}
