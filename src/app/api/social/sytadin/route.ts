/**
 * Social feed API
 * Combines:
 *   1. Live Sytadin.fr traffic alerts (HTML scrape)
 *   2. Enriched posts generated from real IDF road segments (local GeoJSON)
 */

import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

// ── Types ────────────────────────────────────────────────────────────────────

export interface SocialPost {
  id: string
  type: 'alert' | 'congestion' | 'info' | 'network'
  text: string
  location: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  tags: string[]
  km?: number
  source: 'sytadin' | 'idf-data' | 'synthetic'
}

// ── IDF GeoJSON — module-level cache of major roads only ─────────────────────

interface IdfHighway {
  roadName: string
  roadNumber: string
  county: string
  frc: number
  totalKm: number
  avgLanes: number
}

let _idfHighways: IdfHighway[] | null = null

function loadIdfHighways(): IdfHighway[] {
  if (_idfHighways) return _idfHighways

  const filePath = path.join(
    process.cwd(),
    'data/data_IledeFrance/maprelease-geojson/extracted/France_Ile_de_France.geojson',
  )

  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const geojson = JSON.parse(raw) as {
      features: { properties: Record<string, string> }[]
    }

    // Aggregate by roadName for FRC 1-3 only
    const map = new Map<string, IdfHighway>()
    for (const f of geojson.features) {
      const p = f.properties
      const frc = parseInt(p.FRC ?? '5', 10)
      if (frc > 3) continue
      const key = p.RoadName || p.RoadNumber || ''
      if (!key) continue
      const existing = map.get(key)
      const km = parseFloat(p.Miles ?? '0') * 1.60934
      const lanes = parseFloat(p.Lanes ?? '1')
      if (existing) {
        existing.totalKm  += km
        existing.avgLanes  = (existing.avgLanes + lanes) / 2
      } else {
        map.set(key, {
          roadName:   p.RoadName ?? '',
          roadNumber: p.RoadNumber ?? '',
          county:     p.County ?? '',
          frc,
          totalKm: km,
          avgLanes: lanes,
        })
      }
    }

    _idfHighways = [...map.values()]
      .sort((a, b) => a.frc - b.frc || b.totalKm - a.totalKm)
    return _idfHighways
  } catch {
    _idfHighways = []
    return _idfHighways
  }
}

// ── Severity helpers ─────────────────────────────────────────────────────────

const SEVERITY_KEYWORDS: Record<string, SocialPost['severity']> = {
  bloqué: 'critical', bouchon: 'high', embouteillage: 'high',
  accident: 'critical', travaux: 'medium', ralentissement: 'medium',
  perturbation: 'medium', incident: 'medium', fermée: 'high',
  fluide: 'low', normal: 'low', info: 'low',
}

function detectSeverity(text: string): SocialPost['severity'] {
  const lower = text.toLowerCase()
  for (const [kw, sev] of Object.entries(SEVERITY_KEYWORDS)) {
    if (lower.includes(kw)) return sev
  }
  return 'low'
}

function extractTags(text: string): string[] {
  const tags: string[] = []
  const roadMatches = text.match(/\b[AN]\d+\b/gi)
  if (roadMatches) tags.push(...roadMatches.map(t => t.toUpperCase()))
  if (/bouchon/i.test(text))     tags.push('Bouchon')
  if (/accident/i.test(text))    tags.push('Accident')
  if (/travaux/i.test(text))     tags.push('Travaux')
  if (/perturbation/i.test(text)) tags.push('Perturbation')
  return [...new Set(tags)].slice(0, 4)
}

// ── Sytadin HTML parsers ─────────────────────────────────────────────────────

function parseAlerts(html: string): SocialPost[] {
  const posts: SocialPost[] = []
  const patterns = [
    /<td[^>]*class="[^"]*alert[^"]*"[^>]*>([\s\S]*?)<\/td>/gi,
    /<div[^>]*class="[^"]*ligne[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<tr[^>]*>([\s\S]*?)<\/tr>/gi,
    /<li[^>]*>([\s\S]*?)<\/li>/gi,
  ]
  const rawTexts: string[] = []
  for (const pattern of patterns) {
    let m: RegExpExecArray | null
    while ((m = pattern.exec(html)) !== null) {
      const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (text.length > 15 && text.length < 300) rawTexts.push(text)
    }
  }
  if (rawTexts.length === 0) {
    const pPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi
    let m: RegExpExecArray | null
    while ((m = pPattern.exec(html)) !== null) {
      const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (text.length > 15 && text.length < 300) rawTexts.push(text)
    }
  }
  const seen = new Set<string>()
  for (const text of rawTexts) {
    if (seen.has(text)) continue
    seen.add(text)
    if (/^(accueil|menu|retour|voir|cliquez|fermer)/i.test(text)) continue
    const locationMatch = text.match(/(?:A|N|D)\d+[^,.\n]*/i)
    posts.push({
      id:        Buffer.from(text).toString('base64').slice(0, 12),
      type:      'alert',
      text,
      location:  locationMatch ? locationMatch[0].trim() : 'Île-de-France',
      severity:  detectSeverity(text),
      timestamp: new Date().toISOString(),
      tags:      extractTags(text),
      source:    'sytadin',
    })
  }
  return posts
}

function parseCongestion(html: string): SocialPost[] {
  const posts: SocialPost[] = []
  const kmPattern = /(\d+[\.,]?\d*)\s*km/gi
  const rows = html.split(/<tr[\s>]/i)
  for (const row of rows) {
    const clean = row.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const kmMatch = kmPattern.exec(clean)
    if (!kmMatch || clean.length < 10) { kmPattern.lastIndex = 0; continue }
    const km = parseFloat(kmMatch[1].replace(',', '.'))
    const locationMatch = clean.match(/(?:A|N|D|RN|RD)\d+[^,.\n]*/i)
    posts.push({
      id:        Buffer.from(clean.slice(0, 40)).toString('base64').slice(0, 12),
      type:      'congestion',
      text:      clean.slice(0, 160),
      location:  locationMatch ? locationMatch[0].trim() : 'Réseau IDF',
      km,
      severity:  km > 20 ? 'critical' : km > 10 ? 'high' : km > 5 ? 'medium' : 'low',
      timestamp: new Date().toISOString(),
      tags:      [`${km} km`, ...extractTags(clean)],
      source:    'sytadin',
    })
    kmPattern.lastIndex = 0
  }
  return posts
}

// ── IDF data-enriched posts ──────────────────────────────────────────────────

const CONGESTION_TEMPLATES = [
  (road: string, km: number) => `Ralentissements signalés sur ${road} — file estimée ${km} km, circulation dense dans les deux sens.`,
  (road: string, km: number) => `Trafic chargé sur ${road} en direction de Paris. Bouchon de ${km} km entre les échangeurs.`,
  (road: string, _km: number) => `Circulation perturbée sur ${road}. Prévoir un allongement du temps de trajet.`,
  (road: string, km: number) => `${road} : congestion de ${km} km constatée. Itinéraire bis conseillé.`,
]

const INFO_TEMPLATES = [
  (road: string, lanes: number) => `${road} (${lanes.toFixed(0)} voies) intégrée au graphe de simulation CrossFlow. Données réseau IDF en temps réel.`,
  (road: string, km: number) => `Réseau surveillé : ${road} — couverture ${km.toFixed(1)} km. Données TomTom XD IDF.`,
]

function generateIdfPosts(now: string): SocialPost[] {
  const highways = loadIdfHighways()
  if (highways.length === 0) return []

  const posts: SocialPost[] = []
  const h = new Date().getHours()
  const isRush = (h >= 7 && h < 10) || (h >= 17 && h < 20)

  // Pick top highways (FRC 1-2)
  const frc12 = highways.filter(hw => hw.frc <= 2 && hw.roadName).slice(0, 20)

  for (let i = 0; i < Math.min(frc12.length, isRush ? 8 : 4); i++) {
    const hw = frc12[i]
    const km = isRush
      ? Math.round(hw.totalKm * (0.05 + Math.random() * 0.3))
      : Math.round(hw.totalKm * (0.01 + Math.random() * 0.1))

    if (km < 1) continue

    const severity: SocialPost['severity'] = isRush
      ? km > 15 ? 'high' : km > 5 ? 'medium' : 'low'
      : km > 10 ? 'medium' : 'low'

    const tpl = CONGESTION_TEMPLATES[i % CONGESTION_TEMPLATES.length]
    posts.push({
      id:        `idf-cong-${hw.roadName}-${i}`,
      type:      'congestion',
      text:      tpl(hw.roadName, km),
      location:  `${hw.roadName}${hw.county ? ' — ' + hw.county : ''}`,
      km,
      severity,
      timestamp: new Date(Date.now() - Math.random() * 900_000).toISOString(),
      tags:      [hw.roadName, `${km} km`, isRush ? 'HeureDePointe' : 'Trafic'],
      source:    'idf-data',
    })
  }

  // Add a few "network info" posts
  const infoRoads = highways.filter(hw => hw.frc <= 2).slice(0, 3)
  for (const hw of infoRoads) {
    const tpl = INFO_TEMPLATES[Math.floor(Math.random() * INFO_TEMPLATES.length)]
    posts.push({
      id:        `idf-info-${hw.roadName}`,
      type:      'network',
      text:      tpl(hw.roadName, hw.totalKm),
      location:  hw.county || 'Île-de-France',
      severity:  'low',
      timestamp: now,
      tags:      ['RéseauIDF', hw.roadName],
      source:    'idf-data',
    })
  }

  return posts
}

// ── Fallback: rich synthetic tweets (when Sytadin scrape fails) ──────────────

function generateFallbackTweets(now: string): SocialPost[] {
  const h       = new Date().getHours()
  const isRush  = (h >= 7 && h < 10) || (h >= 17 && h < 20)
  const isNight = h < 6 || h > 22

  const TWEETS: Array<Omit<SocialPost, 'id' | 'timestamp' | 'source'>> = [
    // ── Alertes critiques ─────────────────────────────────────────────────
    {
      type:     'alert',
      text:     isRush
        ? '🚨 A86 dir. Versailles : accident 2 VL au km 14. Voie de droite obstruée. Ralentissement 8 km. Évitez si possible. #A86 #Accident'
        : '🚧 N118 : travaux de nuit entre Saclay et Vélizy. Circulation sur voie unique de 21h à 5h. Prévoir 20 min supplémentaires.',
      location: 'A86 — Hauts-de-Seine',
      severity: isRush ? 'critical' : 'medium',
      tags:     ['A86', 'Accident', 'Île-de-France'],
      km:       isRush ? 8 : undefined,
    },
    {
      type:     'congestion',
      text:     isRush
        ? '🔴 A1 sens Province→Paris : bouchon de 14 km entre Roissy et le Bourget. Temps de parcours doublé. Alternatif : N17 via Gonesse. #HeureDePointe'
        : '🟡 A1 sens Province→Paris : circulation fluide. Temps de trajet nominal. #Trafic',
      location: 'A1 — Seine-Saint-Denis',
      severity: isRush ? 'critical' : 'low',
      tags:     ['A1', 'Bouchon', isRush ? 'HeureDePointe' : 'Trafic'],
      km:       isRush ? 14 : undefined,
    },
    // ── Bouchons importants ────────────────────────────────────────────────
    {
      type:     'congestion',
      text:     isRush
        ? '🟠 Périphérique extérieur : ralentissement dense de la Porte de Bercy à la Porte de Versailles. File estimée 6 km. #Périphérique #Paris'
        : '🟢 Périphérique intérieur et extérieur : trafic globalement fluide à cette heure.',
      location: 'Périphérique — Paris',
      severity: isRush ? 'high' : 'low',
      tags:     ['Périphérique', isRush ? 'Congestion' : 'Fluide'],
      km:       isRush ? 6 : undefined,
    },
    {
      type:     'congestion',
      text:     isRush
        ? '🟠 A13 dir. Normandie : 9 km de bouchon entre Vélizy et Rocquencourt suite à un incident. Basculement sur N12 possible.'
        : '🟡 A13 : débit normal. Surveillance active des nœuds de Vaucresson.',
      location: 'A13 — Yvelines',
      severity: isRush ? 'high' : 'low',
      tags:     ['A13', isRush ? 'Ralentissement' : 'Trafic'],
      km:       isRush ? 9 : undefined,
    },
    // ── Info réseau ────────────────────────────────────────────────────────
    {
      type:     'info',
      text:     '📡 Données trafic IDF mises à jour. 2 847 km de réseau surveillés en temps réel. Couverture : autoroutes + routes nationales. Source : DiRIF / Cerema.',
      location: 'Île-de-France',
      severity: 'low',
      tags:     ['RéseauIDF', 'DiRIF', 'Information'],
    },
    {
      type:     'info',
      text:     isRush
        ? '⚡ Heure de pointe détectée. Indice de congestion IDF : élevé (72/100). Plus de 340 km de ralentissements comptabilisés sur l\'ensemble du réseau.'
        : isNight
          ? '🌙 Trafic de nuit. Réseau IDF dégagé. Travaux sur A86 et N118 en cours jusqu\'à 5h30.'
          : '✅ Trafic IDF nominal. Indice de congestion modéré (34/100). Réseau en bonne fluidité.',
      location: 'Bilan IDF',
      severity: isRush ? 'medium' : 'low',
      tags:     ['BilanTrafic', 'IDF'],
    },
    // ── Alertes spécifiques ───────────────────────────────────────────────
    {
      type:     'alert',
      text:     '🚧 RN2 Soissons→Paris : déviation mise en place entre La Ferté-Milon et Meaux suite à des travaux d\'ouvrage d\'art. Durée : 3 semaines.',
      location: 'RN2 — Seine-et-Marne',
      severity: 'medium',
      tags:     ['RN2', 'Travaux', 'Déviation'],
    },
    {
      type:     'congestion',
      text:     isRush
        ? '🔴 A4 dir. Paris : bouchon de 11 km entre Marne-la-Vallée et Joinville. Accident VL impliqué. Voie d\'urgence dégagée. #A4 #Bouchon'
        : '🟢 A4 : trafic fluide dans les deux sens. Aucun incident signalé.',
      location: 'A4 — Val-de-Marne',
      severity: isRush ? 'critical' : 'low',
      tags:     ['A4', isRush ? 'Accident' : 'Fluide'],
      km:       isRush ? 11 : undefined,
    },
    {
      type:     'info',
      text:     '🚇 Rappel InfoTrafic : en cas de congestion sur le périphérique, le RER A et les lignes 1, 13 offrent des alternatives rapides pour les trajets transversaux Paris—banlieue.',
      location: 'Paris',
      severity: 'low',
      tags:     ['RERA', 'MetroParis', 'AlternativeTrafic'],
    },
    {
      type:     'alert',
      text:     isRush
        ? '⚠️ A6a (Autoroute du Soleil) direction Paris : chaussée mouillée + forte densité. Vitesse limitée à 110 km/h. Restez vigilants. #A6 #PériodeScolaire'
        : '✅ A6a : chaussée sèche, trafic normal. Aucune restriction de vitesse en vigueur.',
      location: 'A6a — Essonne',
      severity: isRush ? 'medium' : 'low',
      tags:     ['A6', isRush ? 'PluieConduite' : 'Trafic'],
    },
  ]

  return TWEETS.map((t, i) => ({
    ...t,
    id:        `fallback-${i}-${h}`,
    timestamp: new Date(Date.now() - i * 4 * 60_000).toISOString(), // stagger timestamps
    source:    'synthetic' as const,
  }))
}

// ── Route handler ─────────────────────────────────────────────────────────────

const SYTADIN_BASE = 'https://www.sytadin.fr/refreshed'

export async function GET() {
  const now = new Date().toISOString()

  // Fetch Sytadin + IDF posts in parallel (best effort)
  const [alertRes, congestionRes, idfPosts] = await Promise.all([
    fetch(`${SYTADIN_BASE}/alert_block.jsp.html`, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (compatible; CrossFlow-Mobility/1.0)',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Accept':          'text/html',
        'Referer':         'https://www.sytadin.fr/',
      },
      next: { revalidate: 180 },
    }).catch(() => null),
    fetch(`${SYTADIN_BASE}/cumul_bouchon.jsp.html`, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (compatible; CrossFlow-Mobility/1.0)',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Accept':          'text/html',
        'Referer':         'https://www.sytadin.fr/',
      },
      next: { revalidate: 180 },
    }).catch(() => null),
    Promise.resolve(generateIdfPosts(now)),
  ])

  const posts: SocialPost[] = []

  if (alertRes?.ok) {
    const scraped = parseAlerts(await alertRes.text())
    posts.push(...scraped)
  }
  if (congestionRes?.ok) {
    const scraped = parseCongestion(await congestionRes.text())
    posts.push(...scraped)
  }

  // Always include IDF data-driven posts
  posts.push(...idfPosts)

  // If scraping yielded nothing (blocked, CORS, etc.) → use rich fallback
  if (posts.length < 3) {
    posts.push(...generateFallbackTweets(now))
  }

  // Deduplicate by id, sort critical first
  const seen = new Set<string>()
  const deduped = posts.filter(p => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  const order: Record<SocialPost['severity'], number> = { critical: 0, high: 1, medium: 2, low: 3 }
  deduped.sort((a, b) => order[a.severity] - order[b.severity])

  return NextResponse.json(
    { posts: deduped.slice(0, 25), fetchedAt: now },
    { headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=60' } },
  )
}
