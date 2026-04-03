/**
 * CrossFlow Intelligence — Data-Grounded AI Advisor
 * Strictly adheres to cityContext, no hallucinations allowed.
 */
import { NextRequest, NextResponse } from 'next/server'
import aiData from '@/lib/data/ai.json'
import appData from '@/lib/data/app.json'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { z } from 'zod'

const OPENROUTER_BASE = aiData.openrouter.baseUrl
const DEFAULT_MODEL   = aiData.openrouter.defaultModel

// ─── AI Response Schema (Strict) ─────────────────────────────────────────────

const AIResponseSchema = z.object({
  ville: z.string(),
  horodatage_local: z.string(),
  situation: z.object({
    congestion_pct: z.number().nullable(),
    meteo: z.object({
      temp_c: z.number().nullable(),
      description: z.string().default('inconnu')
    }),
    incidents_total: z.number().default(0),
    ralentissements_axes: z.array(z.string()).default([])
  }),
  sources_utilisees: z.object({
    trafic: z.boolean(),
    meteo: z.boolean(),
    transport: z.boolean(),
    evenements: z.boolean(),
    social: z.boolean()
  }),
  evenements: z.array(z.string()).default([]),
  transport_perturbations: z.array(z.string()).default([]),
  analyse: z.object({
    causes_probables: z.array(z.string())
  }),
  recommandations: z.array(z.string()),
  projection: z.object({
    projection_possible: z.boolean(),
    t_plus_30_min_congestion_pct: z.number().nullable(),
    t_plus_60_min_congestion_pct: z.number().nullable(),
    confiance: z.enum(['faible', 'moyenne', 'elevee'])
  }),
  limites: z.array(z.string())
})

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers)
  const rl = await rateLimit(ip, 'ai', 20, 60)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Trop de requêtes — réessayez dans ${rl.resetIn}s` },
      { status: 429, headers: { 'Retry-After': String(rl.resetIn) } },
    )
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY manquant' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const { 
      messages, 
      model = DEFAULT_MODEL, 
      cityContext,
      sources = { trafic: true, meteo: true, transport: false, evenements: false, social: false }
    } = body

    const systemPrompt = buildSystemPrompt(cityContext, sources)

    const controller = new AbortController()
    const timeout    = setTimeout(() => controller.abort(), 30_000) // 30s timeout

    let response: Response
    try {
      response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method:  'POST',
        signal:  controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
          'HTTP-Referer':  process.env.NEXT_PUBLIC_APP_URL ?? appData.url,
          'X-Title':       'CrossFlow Intelligence (Strict)',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          temperature: 0.1,
          max_tokens:  aiData.main.maxTokens,
          // Removed response_format: 'json_object' to allow more flexible text+json combined responses
          stream:      false,
        }),
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: `AI Provider: ${err}` }, { status: response.status })
    }

    const data    = await response.json()
    const rawContent = data.choices?.[0]?.message?.content ?? ''
    
    // 🛰️ Staff Engineer: Resilient JSON Extraction
    // Search for JSON block anywhere in the string to handle "Certainly! Here is your analysis: { ... }"
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      const jsonPart = jsonMatch[0]
      const markdownPart = rawContent.replace(jsonPart, '').trim()
      
      try {
        const parsedJSON = JSON.parse(jsonPart)
        const validated = AIResponseSchema.safeParse(parsedJSON)

        if (!validated.success) {
          console.warn('[AI Refinement] Zod partial match, using best-effort data.')
          return NextResponse.json({
            content: markdownPart || rawContent,
            data:    parsedJSON,
            usage:   data.usage,
            warning: 'schema_drift'
          })
        }

        return NextResponse.json({ 
          content: markdownPart || "Analyse télémétrique complétée.", 
          data: validated.data,
          usage: data.usage 
        })
      } catch (parseErr) {
        // Fallback: If it looks like JSON but parsing fails, return raw text
        return NextResponse.json({ content: rawContent, usage: data.usage })
      }
    }

    // 🕊️ Fallback: No JSON found, returning natural language only
    return NextResponse.json({ 
      content: rawContent, 
      usage:   data.usage,
      warning: 'no_json_struct'
    })

  } catch (e: any) {
    const isTimeout = e?.name === 'AbortError' || e?.name === 'TimeoutError'
    const message   = isTimeout
      ? 'Le moteur IA prend trop de temps à répondre (Timeout Provider).'
      : `Erreur critique: ${e instanceof Error ? e.message : 'unknown'}`
    return NextResponse.json(
      { error: message, code: isTimeout ? 'timeout' : 'server_error' },
      { status: isTimeout ? 504 : 500 },
    )
  }
}

// ─── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(ctx?: CityContext, sources?: any): string {
  const jsonContext = JSON.stringify(ctx || {}, null, 2)
  const hasHistoryOrPred = !!(ctx?.history || ctx?.prediction)

  return `Tu es **CrossFlow Intelligence**. Tu DOIS t’en tenir STRICTEMENT au contexte fourni ci-dessous.

## CONTEXTE VILLE (JSON)
\`\`\`json
${jsonContext}
\`\`\`

## SOURCES ACTIVÉES
- Trafic: ${sources?.trafic ? 'OUI' : 'NON'}
- Météo: ${sources?.meteo ? 'OUI' : 'NON'}
- Transport: ${sources?.transport ? 'OUI' : 'NON'}
- Événements: ${sources?.evenements ? 'OUI' : 'NON'}
- Social: ${sources?.social ? 'OUI' : 'NON'}

## RÈGLES D'OR (INTERDICTIONS ABSOLUES)
1. Ne JAMAIS citer d’événement (match, équipe, lieu), travaux ou incident s’ils ne figurent pas explicitement dans les champs fournis.
2. Ne pas inférer d’“heure de pointe” ou “charge élevée” sans indicateur explicite.
3. Toute affirmation chiffrée doit citer la clé contextuelle entre ctx:key (ex: ctx:traffic.congestion).
4. Si une info manque, écrire “non_disponible” ou “inconnu”.
5. Projection = possible UNIQUEMENT si cityContext.history ou prediction est fourni (ici: ${hasHistoryOrPred ? 'OUI' : 'NON'}).

## FORMAT DE SORTIE OBLIGATOIRE
1. Un bloc JSON compact validé par le schéma attendu.
2. Un résumé Markdown court (≤120 mots) purement factuel.

Exemple d'analyse attendue: "Hausse congestion alignée sur trafic.congestion (0.32) ctx:traffic.congestion"`
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CityContext {
  cityName?:        string
  country?:         string
  congestionRate?:  number
  avgTravelMin?:    number
  pollutionIndex?:  number
  activeIncidents?: number
  dataSource?:      string
  events?:          string[]
  transport?: {
    disruptions?: string[]
    status?:      string
  }
  history?:         any[]
  prediction?:      any[]
  weather?: {
    emoji:         string
    description:   string
    temp:          number
    windKmh:       number
    visibilityKm:  number
    precipMm:      number
    snowDepthCm:   number
    trafficImpact: string
  }
  airQuality?: {
    aqiEU:         number
    level:         string
    pm25:          number
    no2:           number
    trafficImpact: number
  }
}
