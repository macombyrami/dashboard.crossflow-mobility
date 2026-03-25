/**
 * /api/prim-disruptions
 * Proxy server-side — PRIM Île-de-France Mobilités
 * Remplace Navitia (plus disponible gratuitement).
 * Données: perturbations actives toutes lignes IDFM (RATP + Transilien + RER)
 */

import { NextResponse } from 'next/server'

const PRIM_BASE = 'https://prim.iledefrance-mobilites.fr/marketplace'

// STIF Line ID → slug + metadata
const LINE_META: Record<string, { code: string; name: string; color: string; mode: string }> = {
  // Métro
  C01742: { code: '1',   name: 'Métro 1',   color: '#FFCD00', mode: 'Métro' },
  C01743: { code: '2',   name: 'Métro 2',   color: '#003CA6', mode: 'Métro' },
  C01744: { code: '3',   name: 'Métro 3',   color: '#837902', mode: 'Métro' },
  C01745: { code: '3b',  name: 'Métro 3b',  color: '#6EC4E8', mode: 'Métro' },
  C01746: { code: '4',   name: 'Métro 4',   color: '#CF009E', mode: 'Métro' },
  C01747: { code: '5',   name: 'Métro 5',   color: '#FF7E2E', mode: 'Métro' },
  C01748: { code: '6',   name: 'Métro 6',   color: '#6ECA97', mode: 'Métro' },
  C01749: { code: '7',   name: 'Métro 7',   color: '#FA9ABA', mode: 'Métro' },
  C01750: { code: '7b',  name: 'Métro 7b',  color: '#6ECA97', mode: 'Métro' },
  C01751: { code: '8',   name: 'Métro 8',   color: '#E19BDF', mode: 'Métro' },
  C01752: { code: '9',   name: 'Métro 9',   color: '#B6BD00', mode: 'Métro' },
  C01753: { code: '10',  name: 'Métro 10',  color: '#C9910A', mode: 'Métro' },
  C01754: { code: '11',  name: 'Métro 11',  color: '#704B1C', mode: 'Métro' },
  C01755: { code: '12',  name: 'Métro 12',  color: '#007852', mode: 'Métro' },
  C01756: { code: '13',  name: 'Métro 13',  color: '#6EC4E8', mode: 'Métro' },
  C01757: { code: '14',  name: 'Métro 14',  color: '#62259D', mode: 'Métro' },
  C01758: { code: '15',  name: 'Métro 15',  color: '#B90845', mode: 'Métro' },
  C01759: { code: '16',  name: 'Métro 16',  color: '#F3A002', mode: 'Métro' },
  C01760: { code: '17',  name: 'Métro 17',  color: '#D5C900', mode: 'Métro' },
  C01761: { code: '18',  name: 'Métro 18',  color: '#00A88F', mode: 'Métro' },
  // RER
  C01727: { code: 'A',   name: 'RER A',     color: '#E2231A', mode: 'RER' },
  C01728: { code: 'B',   name: 'RER B',     color: '#47A0D5', mode: 'RER' },
  C01729: { code: 'C',   name: 'RER C',     color: '#FFCD00', mode: 'RER' },
  C01730: { code: 'D',   name: 'RER D',     color: '#00814F', mode: 'RER' },
  C01731: { code: 'E',   name: 'RER E',     color: '#C04191', mode: 'RER' },
  // Tram
  C01714: { code: 'T1',  name: 'Tram T1',   color: '#E85D0E', mode: 'Tramway' },
  C01715: { code: 'T2',  name: 'Tram T2',   color: '#2E67B1', mode: 'Tramway' },
  C01716: { code: 'T3a', name: 'Tram T3a',  color: '#65AE30', mode: 'Tramway' },
  C01717: { code: 'T3b', name: 'Tram T3b',  color: '#65AE30', mode: 'Tramway' },
  C01719: { code: 'T4',  name: 'Tram T4',   color: '#E2231A', mode: 'Tramway' },
  C01720: { code: 'T5',  name: 'Tram T5',   color: '#694394', mode: 'Tramway' },
  C01721: { code: 'T6',  name: 'Tram T6',   color: '#FF7F00', mode: 'Tramway' },
  C01722: { code: 'T7',  name: 'Tram T7',   color: '#AA57A7', mode: 'Tramway' },
  C01718: { code: 'T8',  name: 'Tram T8',   color: '#E2231A', mode: 'Tramway' },
  C01723: { code: 'T9',  name: 'Tram T9',   color: '#00A1E0', mode: 'Tramway' },
  C01724: { code: 'T10', name: 'Tram T10',  color: '#004B9B', mode: 'Tramway' },
  C01725: { code: 'T11', name: 'Tram T11',  color: '#00A99D', mode: 'Tramway' },
  C01726: { code: 'T12', name: 'Tram T12',  color: '#E85D0E', mode: 'Tramway' },
  C01712: { code: 'T13', name: 'Tram T13',  color: '#00A1E0', mode: 'Tramway' },
  // Transilien
  C01737: { code: 'H',   name: 'Transilien H', color: '#6E6E70', mode: 'Transilien' },
  C01738: { code: 'J',   name: 'Transilien J', color: '#C5A57E', mode: 'Transilien' },
  C01739: { code: 'K',   name: 'Transilien K', color: '#7F4F7B', mode: 'Transilien' },
  C01736: { code: 'L',   name: 'Transilien L', color: '#914897', mode: 'Transilien' },
  C01733: { code: 'N',   name: 'Transilien N', color: '#00814F', mode: 'Transilien' },
  C01734: { code: 'P',   name: 'Transilien P', color: '#F07E20', mode: 'Transilien' },
  C01735: { code: 'R',   name: 'Transilien R', color: '#E77820', mode: 'Transilien' },
  C01732: { code: 'U',   name: 'Transilien U', color: '#C9218E', mode: 'Transilien' },
}

function stifIdToMeta(stifId: string) {
  return LINE_META[stifId] ?? null
}

function parseChannelSeverity(channel: string): {
  name: string; effect: string; color: string; priority: number
} {
  const c = channel.toLowerCase()
  if (c.includes('perturb') || c.includes('incident')) {
    return { name: 'Perturbation', effect: 'SIGNIFICANT_DELAYS', color: 'FF6D00', priority: 2 }
  }
  if (c.includes('interru') || c.includes('susp')) {
    return { name: 'Interrompu',   effect: 'NO_SERVICE',          color: 'FF3B30', priority: 1 }
  }
  if (c.includes('trav')) {
    return { name: 'Travaux',      effect: 'MODIFIED_SERVICE',    color: 'F97316', priority: 3 }
  }
  return   { name: 'Information',  effect: 'MODIFIED_SERVICE',    color: 'FFCD00', priority: 4 }
}

export interface PrimDisruptionResult {
  disruptions: {
    id: string
    status: 'active'
    severity: { name: string; effect: string; color: string; priority: number }
    title: string
    message: string
    lines: { id: string; name: string; code: string; color: string; mode: string }[]
    startDate: string
    endDate: string
    updatedAt: string
  }[]
  fetchedAt: string
  source: 'prim'
}

export async function GET(): Promise<Response> {
  const apiKey = process.env.IDFM_API_KEY
  if (!apiKey) {
    return Response.json({ disruptions: [], fetchedAt: new Date().toISOString(), source: 'prim' })
  }

  try {
    const res = await fetch(`${PRIM_BASE}/general-message`, {
      headers: {
        'apikey': apiKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return Response.json(
        { disruptions: [], fetchedAt: new Date().toISOString(), source: 'prim', error: res.status },
        { status: 200 },
      )
    }

    const data = await res.json()
    const messages: any[] =
      data?.Siri?.ServiceDelivery?.GeneralMessageDelivery?.[0]?.InfoMessage ?? []

    const now = new Date()
    const disruptions = messages
      .filter(msg => {
        const validUntil = msg.ValidUntilTime ? new Date(msg.ValidUntilTime) : null
        return !validUntil || validUntil > now
      })
      .map(msg => {
        const identifier  = msg.InfoMessageIdentifier?.value ?? msg.ItemIdentifier ?? String(Math.random())
        const channel     = msg.InfoChannelRef?.value ?? 'Information'
        const severity    = parseChannelSeverity(channel)
        const shortText   = msg.Content?.Message?.find((m: any) => m.MessageType === 'shortMessage')
          ?.MessageText?.value ?? ''
        const longText    = msg.Content?.Message?.find((m: any) => m.MessageType === 'longMessage')
          ?.MessageText?.value ?? shortText

        const lineRefs: string[] = (msg.Content?.LineRef ?? []).map((r: any) => r.value ?? '')
        const lines = lineRefs
          .map((ref: string) => {
            const stifId = ref.match(/::([^:]+):/)?.[1] ?? ''
            const meta   = stifIdToMeta(stifId)
            if (!meta) return null
            return {
              id:    ref,
              name:  meta.name,
              code:  meta.code,
              color: meta.color,
              mode:  meta.mode,
            }
          })
          .filter(Boolean) as { id: string; name: string; code: string; color: string; mode: string }[]

        return {
          id:         identifier,
          status:     'active' as const,
          severity,
          title:      shortText || channel,
          message:    longText,
          lines,
          startDate:  msg.RecordedAtTime ?? now.toISOString(),
          endDate:    msg.ValidUntilTime ?? '',
          updatedAt:  msg.RecordedAtTime ?? now.toISOString(),
        }
      })
      // Sort: most critical first
      .sort((a, b) => a.severity.priority - b.severity.priority)

    const result: PrimDisruptionResult = {
      disruptions,
      fetchedAt: now.toISOString(),
      source:    'prim',
    }

    return Response.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
    })
  } catch (err) {
    return Response.json(
      { disruptions: [], fetchedAt: new Date().toISOString(), source: 'prim', error: String(err) },
    )
  }
}
