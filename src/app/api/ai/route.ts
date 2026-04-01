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

    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method:  'POST',
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
        temperature: 0.1, // Deterministic
        max_tokens:  aiData.main.maxTokens,
        response_format: { type: 'json_object' },
        stream:      false,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: `AI Provider: ${err}` }, { status: response.status })
    }

    const data    = await response.json()
    const rawContent = data.choices?.[0]?.message?.content ?? ''
    
    // Split JSON block from Markdown summary
    // Expected format: JSON... \n\n Markdown...
    let jsonPart = ''
    let markdownPart = ''
    
    try {
      const firstBrace = rawContent.indexOf('{')
      const lastBrace = rawContent.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonPart = rawContent.substring(firstBrace, lastBrace + 1)
        markdownPart = rawContent.substring(lastBrace + 1).trim()
      } else {
        throw new Error('Structure JSON absente')
      }

      const parsedJSON = JSON.parse(jsonPart)
      const validated = AIResponseSchema.safeParse(parsedJSON)

      if (!validated.success) {
        console.error('[AI Refinement] Zod Validation Failed:', validated.error)
        return NextResponse.json({ error: 'Contexte insuffisant pour une réponse fiable (Validation KO)' }, { status: 422 })
      }

      // Hallucination Guard: ensure Markdown summary doesn't contain terms not in context
      // Simple implementation: check if Markdown mentions words like "PSG" or "Match" if not in JSON events
      const sensitiveTerms = ['psg', 'match', 'olympia', 'travaux', 'incident', 'manifestation']
      const halluTerms = sensitiveTerms.filter(term => 
        markdownPart.toLowerCase().includes(term) && 
        !jsonPart.toLowerCase().includes(term)
      )

      if (halluTerms.length > 0) {
        console.warn('[AI Refinement] Hallucination Flagged:', halluTerms)
        markdownPart = "💡 L'IA a détecté une possible incohérence avec les données réelles et a tronqué son analyse narrative par sécurité."
      }

      return NextResponse.json({ 
        content: markdownPart, 
        data: validated.data,
        usage: data.usage 
      })

    } catch (parseErr) {
      console.error('[AI Refinement] Parse Error:', parseErr, 'Raw Content:', rawContent)
      return NextResponse.json({ error: 'Erreur formatage IA (JSON invalide)' }, { status: 500 })
    }
  } catch (e) {
    return NextResponse.json(
      { error: `Erreur serveur: ${e instanceof Error ? e.message : 'unknown'}` },
      { status: 500 },
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
