/**
 * /api/ratp-traffic
 * Proxy serveur pour le trafic RATP/IDFM.
 * - Source 1: api-ratp.pierre-grimaud.fr (non-officielle, aucune clé)
 * - Source 2: prim.iledefrance-mobilites.fr (officielle, IDFM_API_KEY)
 * Cache 60 s.
 */

import { NextResponse } from 'next/server'

const PG_BASE   = 'https://api-ratp.pierre-grimaud.fr/v3'
const PRIM_BASE = 'https://prim.iledefrance-mobilites.fr/marketplace'
const UA        = 'Mozilla/5.0 (compatible; CrossFlow/1.0; +https://crossflow-mobility.com)'

// ─── STIF Line ID → RATP slug mapping ────────────────────────────────────────
// Source: IDFM référentiel-des-lignes open data
const STIF_TO_SLUG: Record<string, string> = {
  C01742: '1',  C01743: '2',  C01744: '3',  C01745: '3b',
  C01746: '4',  C01747: '5',  C01748: '6',  C01749: '7',
  C01750: '7b', C01751: '8',  C01752: '9',  C01753: '10',
  C01754: '11', C01755: '12', C01756: '13', C01757: '14',
  C01758: '15', C01759: '16', C01760: '17', C01761: '18',
  // RER
  C01727: 'A',  C01728: 'B',  C01729: 'C',  C01730: 'D',  C01731: 'E',
  // Tram
  C01714: 'T1', C01715: 'T2', C01716: 'T3a', C01717: 'T3b',
  C01719: 'T4', C01720: 'T5', C01721: 'T6',  C01722: 'T7',
  C01718: 'T8', C01723: 'T9', C01724: 'T10', C01725: 'T11',
  C01726: 'T12',C01712: 'T13',
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RatpTrafficLine {
  slug:    string
  type:    'metros' | 'rers' | 'tramways'
  title:   string
  message: string
}

interface PrimInfoMessage {
  InfoChannelRef?: { value: string }
  ValidUntilTime?: string
  Content?: {
    Message?: { MessageType: string; MessageText: { value: string } }[]
    LineRef?:  { value: string }[]
  }
}

// ─── Pierre Grimaud fetch ─────────────────────────────────────────────────────

async function fetchPierreGrimaud(): Promise<RatpTrafficLine[]> {
  const types = ['metros', 'rers', 'tramways'] as const
  const lines: RatpTrafficLine[] = []

  await Promise.allSettled(
    types.map(async (type) => {
      try {
        const res = await fetch(`${PG_BASE}/traffic/${type}`, {
          headers: {
            'User-Agent': UA,
            'Accept':     'application/json',
            'Origin':     'https://crossflow-mobility.com',
          },
          signal: AbortSignal.timeout(6000),
        })
        if (!res.ok) return

        const data = await res.json()
        const raw: { line?: string; slug?: string; title?: string; message?: string }[] =
          data?.result?.[type] ?? []

        for (const l of raw) {
          const slug = (l.line ?? l.slug ?? '').toUpperCase()
          if (!slug) continue
          lines.push({
            slug,
            type,
            title:   l.title   ?? 'Trafic normal',
            message: l.message ?? '',
          })
        }
      } catch {
        // API non-officielle — echec silencieux
      }
    }),
  )

  return lines
}

// ─── PRIM IDFM fetch (officiel) ───────────────────────────────────────────────

async function fetchPrimDisruptions(apiKey: string): Promise<Map<string, string>> {
  const disruptions = new Map<string, string>()
  try {
    const res = await fetch(`${PRIM_BASE}/general-message`, {
      headers: {
        'apikey': apiKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return disruptions

    const data = await res.json()
    const messages: PrimInfoMessage[] =
      data?.Siri?.ServiceDelivery?.GeneralMessageDelivery?.[0]?.InfoMessage ?? []

    for (const msg of messages) {
      const validUntil = msg.ValidUntilTime ? new Date(msg.ValidUntilTime) : null
      if (validUntil && validUntil < new Date()) continue // expired

      const text = msg.Content?.Message?.find(m =>
        m.MessageType === 'shortMessage' || m.MessageType === 'longMessage',
      )?.MessageText?.value ?? ''

      if (!text) continue

      const lineRefs = msg.Content?.LineRef ?? []
      for (const ref of lineRefs) {
        // "STIF:Line::C01742:" → C01742
        const stifId = ref.value?.match(/::([^:]+):/)?.[1] ?? ''
        const slug   = STIF_TO_SLUG[stifId]
        if (slug) disruptions.set(slug, text)
      }
    }
  } catch {
    // PRIM indisponible — pas bloquant
  }
  return disruptions
}

// ─── PRIM IDFM — état des lignes (estimated-timetable) ───────────────────────
// Requête légère : on vérifie juste si une ligne a des perturbations actives

async function fetchPrimLineStatus(apiKey: string): Promise<Map<string, 'normal' | 'perturbé' | 'interrompu'>> {
  const status = new Map<string, 'normal' | 'perturbé' | 'interrompu'>()
  try {
    const res = await fetch(`${PRIM_BASE}/general-message`, {
      headers: { 'apikey': apiKey, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return status

    const data = await res.json()
    const messages: PrimInfoMessage[] =
      data?.Siri?.ServiceDelivery?.GeneralMessageDelivery?.[0]?.InfoMessage ?? []

    for (const msg of messages) {
      const validUntil = msg.ValidUntilTime ? new Date(msg.ValidUntilTime) : null
      if (validUntil && validUntil < new Date()) continue

      const channel = msg.InfoChannelRef?.value?.toLowerCase() ?? ''
      const lineRefs = msg.Content?.LineRef ?? []

      for (const ref of lineRefs) {
        const stifId = ref.value?.match(/::([^:]+):/)?.[1] ?? ''
        const slug   = STIF_TO_SLUG[stifId]
        if (!slug) continue

        const current = status.get(slug)
        if (current === 'interrompu') continue // ne pas downgrader

        if (channel.includes('perturbation') || channel.includes('incident')) {
          status.set(slug, 'perturbé')
        } else if (channel.includes('interru') || channel.includes('susp')) {
          status.set(slug, 'interrompu')
        } else if (!current) {
          status.set(slug, 'perturbé')
        }
      }
    }
  } catch {}
  return status
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET() {
  const primKey = process.env.IDFM_API_KEY ?? ''

  // Fetch sources in parallel
  const [pgLines, primDisruptions, primStatus] = await Promise.all([
    fetchPierreGrimaud(),
    primKey ? fetchPrimDisruptions(primKey) : Promise.resolve(new Map<string, string>()),
    primKey ? fetchPrimLineStatus(primKey)  : Promise.resolve(new Map<string, 'normal' | 'perturbé' | 'interrompu'>()),
  ])

  // Merge PRIM data into PG lines
  const merged = pgLines.map(line => {
    const primMsg    = primDisruptions.get(line.slug) ?? primDisruptions.get(line.slug.toLowerCase())
    const primSt     = primStatus.get(line.slug) ?? primStatus.get(line.slug.toLowerCase())

    return {
      ...line,
      // Prefer PRIM message if available (more detailed/official)
      message: primMsg ?? line.message,
      // Prefer PRIM status if Pierre Grimaud says "normal" but PRIM has a disruption
      title: primSt && line.title.toLowerCase().includes('normal')
        ? primSt === 'interrompu' ? 'Trafic interrompu' : 'Trafic perturbé'
        : line.title,
      source: primMsg ? 'prim+pg' : 'pg',
    }
  })

  // If Pierre Grimaud returned nothing but PRIM has data, build from PRIM
  if (merged.length === 0 && primDisruptions.size > 0) {
    for (const [slug, message] of primDisruptions) {
      const st = primStatus.get(slug) ?? 'perturbé'
      merged.push({
        slug,
        type: slug.length <= 2 && !slug.startsWith('T')
          ? slug.match(/^[A-E]$/) ? 'rers' : 'metros'
          : 'tramways',
        title:   st === 'interrompu' ? 'Trafic interrompu' : 'Trafic perturbé',
        message,
        source: 'prim',
      })
    }
  }

  return NextResponse.json(
    {
      lines:      merged,
      hasPrim:    Boolean(primKey),
      fetchedAt:  new Date().toISOString(),
      lineCount:  merged.length,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' } },
  )
}
