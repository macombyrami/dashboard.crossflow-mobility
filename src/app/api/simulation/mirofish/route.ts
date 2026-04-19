/**
 * CrossFlow × MiroFish — Moteur de simulation multi-agents
 *
 * Ce endpoint orchestre une simulation de mobilité urbaine en français :
 * 1. Reçoit un scénario (fermeture, événement, etc.) + données trafic live
 * 2. Génère des agents IA (automobilistes, livreurs, usagers TC, cyclistes)
 * 3. Fait interagir les agents via OpenRouter (ChatGPT-4o)
 * 4. Retourne un rapport de prédiction narratif + insights agents
 *
 * Model   : openai/chatgpt-4o-latest (via OpenRouter)
 * Mémoire : Zep Cloud (sessions d'agents)
 */

import { NextRequest, NextResponse } from 'next/server'
import personasData from '@/lib/data/personas.json'
import aiData from '@/lib/data/ai.json'
import appData from '@/lib/data/app.json'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

const OPENROUTER_BASE = aiData.openrouter.baseUrl
const MODEL           = aiData.openrouter.miroFishModel
const APP_URL         = process.env.NEXT_PUBLIC_APP_URL ?? appData.url
const ZEP_BASE        = aiData.zep.baseUrl
const X_TITLE         = aiData.openrouter.miroFishXTitle

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SimSeed {
  ville:         string
  scenario:      string
  descriptionScenario: string
  traficActuel: {
    congestion:  number   // 0-1
    vitesseMoyenne: number // km/h
    incidents:   string[]
    evenements:  string[]
  }
  meteo?:        { condition: string; tempC: number }
  horaireDebut:  string   // ex: "08:00"
  horizonHeures: number   // 1 à 8
  nbAgents?:     number   // 50 / 200 / 500
}

export interface AgentInsight {
  role:           string
  comportement:   string
  decisionPrise:  string
  impactEstime:   string
}

export interface MiroFishResult {
  simulationId:     string
  status:           'terminee' | 'echouee'
  rapportNarratif:  string
  predictions:      { axe: string; congestionEstimee: number; tendance: string }[]
  evenementsEmergents: string[]
  recommandations:  string[]
  insightsAgents:   AgentInsight[]
  scoreImpact:      number   // 0-100
  termineeA:        string
}

// ─── Personas ─────────────────────────────────────────────────────────────────

const PERSONAS = personasData

// ─── Zep Cloud — mémoire des agents ──────────────────────────────────────────

async function creerSessionZep(simId: string): Promise<void> {
  const key = process.env.ZEP_API_KEY
  if (!key) return
  try {
    await fetch(`${ZEP_BASE}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${key}`,
      },
      body: JSON.stringify({ session_id: simId, metadata: { source: 'crossflow-mirofish' } }),
    })
  } catch { /* Zep non bloquant */ }
}

async function sauvegarderMemoireZep(simId: string, role: string, message: string): Promise<void> {
  const key = process.env.ZEP_API_KEY
  if (!key) return
  try {
    await fetch(`${ZEP_BASE}/sessions/${simId}/memory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${key}`,
      },
      body: JSON.stringify({
        messages: [{
          role:    'user',
          content: `[Agent: ${role}] ${message}`,
        }],
      }),
    })
  } catch { /* non bloquant */ }
}

// ─── Appel LLM via OpenRouter ─────────────────────────────────────────────────

async function appelLLM(
  prompt: string,
  systemPrompt: string,
  maxTokens = aiData.miroFish.maxTokensDefault,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY manquant')

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  APP_URL,
      'X-Title':       X_TITLE,
    },
    body: JSON.stringify({
      model:       MODEL,
      messages:    [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: prompt },
      ],
      temperature: aiData.miroFish.temperature,
      max_tokens:  maxTokens,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// ─── Simuler un agent ─────────────────────────────────────────────────────────

async function simulerAgent(
  persona: typeof PERSONAS[0],
  seed: SimSeed,
  simId: string,
): Promise<AgentInsight> {
  const systeme = `Tu es un agent de simulation de mobilité urbaine à ${seed.ville}.
Tu incarnes le rôle suivant : ${persona.role}.
Ton comportement : ${persona.comportement}.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans explication.`

  const prompt = `Scénario : ${seed.descriptionScenario}
Heure : ${seed.horaireDebut}
Congestion actuelle : ${Math.round(seed.traficActuel.congestion * 100)}%
Vitesse moyenne : ${seed.traficActuel.vitesseMoyenne} km/h
Incidents : ${seed.traficActuel.incidents.join(', ') || 'aucun'}
Événements : ${seed.traficActuel.evenements.join(', ') || 'aucun'}
Météo : ${seed.meteo ? `${seed.meteo.condition}, ${seed.meteo.tempC}°C` : 'inconnue'}

En tant que ${persona.role}, réponds en JSON avec exactement ces champs :
{
  "comportement": "Description de ton comportement face à ce scénario (1 phrase)",
  "decisionPrise": "Quelle décision tu prends (itinéraire, mode, heure de départ)",
  "impactEstime": "Quel impact tu auras sur le trafic (1 phrase chiffrée)"
}`

  try {
    const raw = await appelLLM(prompt, systeme, aiData.miroFish.maxTokensAgent)

    // Extraire le JSON de la réponse
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const parsed    = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    const insight: AgentInsight = {
      role:          `${persona.emoji} ${persona.role}`,
      comportement:  parsed?.comportement   ?? persona.comportement,
      decisionPrise: parsed?.decisionPrise  ?? 'Adapte son trajet selon les conditions',
      impactEstime:  parsed?.impactEstime   ?? 'Impact modéré sur le flux local',
    }

    // Sauvegarder dans Zep
    await sauvegarderMemoireZep(
      simId,
      persona.role,
      `Décision: ${insight.decisionPrise}. Impact: ${insight.impactEstime}`,
    )

    return insight
  } catch {
    return {
      role:          `${persona.emoji} ${persona.role}`,
      comportement:  persona.comportement,
      decisionPrise: 'Adapte son trajet en fonction des conditions',
      impactEstime:  'Impact modéré estimé',
    }
  }
}

// ─── Générer le rapport final ─────────────────────────────────────────────────

async function genererRapport(
  seed: SimSeed,
  insights: AgentInsight[],
): Promise<Pick<MiroFishResult, 'rapportNarratif' | 'predictions' | 'evenementsEmergents' | 'recommandations' | 'scoreImpact'>> {
  const systeme = `Tu es CrossFlow Intelligence, expert en analyse de mobilité urbaine.
Tu reçois les résultats d'une simulation multi-agents et génères un rapport de prédiction.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte supplémentaire.
Toutes les réponses doivent être en français.`

  const insightsSummary = insights.map(i =>
    `- ${i.role}: ${i.decisionPrise} → ${i.impactEstime}`
  ).join('\n')

  const prompt = `Ville : ${seed.ville}
Scénario : ${seed.descriptionScenario}
Horizon de simulation : ${seed.horizonHeures}h à partir de ${seed.horaireDebut}
Congestion initiale : ${Math.round(seed.traficActuel.congestion * 100)}%
Incidents existants : ${seed.traficActuel.incidents.join(', ') || 'aucun'}
Événements proches : ${seed.traficActuel.evenements.join(', ') || 'aucun'}

Décisions des agents simulés :
${insightsSummary}

Génère un rapport JSON avec exactement cette structure :
{
  "rapportNarratif": "Paragraphe narratif de 3-4 phrases résumant l'évolution prévue du trafic",
  "predictions": [
    { "axe": "Nom de l'axe ou zone", "congestionEstimee": 0.75, "tendance": "hausse" },
    { "axe": "Axe 2", "congestionEstimee": 0.40, "tendance": "stable" },
    { "axe": "Axe 3", "congestionEstimee": 0.20, "tendance": "baisse" }
  ],
  "evenementsEmergents": [
    "Description d'un événement émergent prévu",
    "Deuxième phénomène émergent"
  ],
  "recommandations": [
    "Recommandation opérationnelle concrète 1",
    "Recommandation 2",
    "Recommandation 3"
  ],
  "scoreImpact": 72
}`

  try {
    const raw = await appelLLM(prompt, systeme, aiData.miroFish.maxTokensReport)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const parsed    = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    return {
      rapportNarratif:     parsed?.rapportNarratif   ?? `Simulation terminée pour ${seed.ville}.`,
      predictions:         parsed?.predictions       ?? [],
      evenementsEmergents: parsed?.evenementsEmergents ?? [],
      recommandations:     parsed?.recommandations   ?? [],
      scoreImpact:         parsed?.scoreImpact       ?? 50,
    }
  } catch {
    return {
      rapportNarratif:     `La simulation pour ${seed.ville} indique une perturbation modérée sur ${seed.horizonHeures}h.`,
      predictions:         [{ axe: 'Réseau principal', congestionEstimee: seed.traficActuel.congestion + 0.1, tendance: 'hausse' }],
      evenementsEmergents: ['Report de trafic vers les axes secondaires'],
      recommandations:     ['Surveiller les axes alternatifs', 'Informer les usagers en temps réel'],
      scoreImpact:         Math.round(seed.traficActuel.congestion * 100),
    }
  }
}

// ─── Simulation core (shared between JSON + SSE modes) ────────────────────────

async function runSimulation(
  seed: SimSeed,
  onEvent: (event: Record<string, unknown>) => void,
): Promise<MiroFishResult> {
  const simId = `mf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  onEvent({ type: 'session', simId })

  await creerSessionZep(simId)

  const nb            = seed.nbAgents ?? 50
  const tiers         = aiData.miroFish.agentSelectionTiers
  const personasCount = nb <= tiers.small.maxAgents  ? tiers.small.personasCount :
                        nb <= tiers.medium.maxAgents ? tiers.medium.personasCount : tiers.large.personasCount
  const personnages   = PERSONAS.slice(0, personasCount)

  onEvent({ type: 'agents_start', total: personnages.length })

  // Run agents in batches — 10 concurrent is safe for serverless + Groq rate limits
  const insights: AgentInsight[] = []
  const BATCH = 10
  for (let i = 0; i < personnages.length; i += BATCH) {
    const batch   = personnages.slice(i, i + BATCH)
    const results = await Promise.all(batch.map(p => simulerAgent(p, seed, simId)))
    for (const insight of results) {
      insights.push(insight)
      onEvent({ type: 'agent_done', done: insights.length, total: personnages.length, insight })
    }
  }

  onEvent({ type: 'report_start' })
  const rapport = await genererRapport(seed, insights)

  const result: MiroFishResult = {
    simulationId:   simId,
    status:         'terminee',
    insightsAgents: insights,
    termineeA:      new Date().toISOString(),
    ...rapport,
  }

  onEvent({ type: 'complete', result })
  return result
}

// ─── Route POST — Lancer la simulation ────────────────────────────────────────
// Supports two response modes based on Accept header:
//   application/json       → wait for full result (backward-compatible)
//   text/event-stream      → stream SSE progress events in real time

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY manquant' }, { status: 503 })
  }

  // Rate limit: 3 simulations per minute per IP (expensive LLM calls)
  const ip = getClientIp(req.headers)
  const rl = await rateLimit(ip, 'mirofish', 3, 60)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Trop de simulations — réessayez dans ${rl.resetIn}s` },
      { status: 429, headers: { 'Retry-After': String(rl.resetIn) } },
    )
  }

  const wantsSSE = req.headers.get('accept')?.includes('text/event-stream')

  let seed: SimSeed
  try {
    seed = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  // ── SSE streaming mode ─────────────────────────────────────────────────────
  if (wantsSSE) {
    const encoder  = new TextEncoder()
    const { readable, writable } = new TransformStream<Uint8Array>()
    const writer   = writable.getWriter()

    const send = (event: Record<string, unknown>) => {
      writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
    }

    // Run in background — stream closes when simulation ends
    runSimulation(seed, send).catch(e => {
      send({ type: 'error', message: e instanceof Error ? e.message : 'inconnue' })
    }).finally(() => writer.close())

    return new Response(readable, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
        'X-Accel-Buffering': 'no', // disable Nginx buffering on Vercel
      },
    })
  }

  // ── JSON mode (backward-compatible) ───────────────────────────────────────
  try {
    const noop = () => { /* no streaming in JSON mode */ }
    const result = await runSimulation(seed, noop)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[MiroFish] Erreur simulation:', e)
    return NextResponse.json(
      { error: `Erreur simulation: ${e instanceof Error ? e.message : 'inconnue'}` },
      { status: 500 },
    )
  }
}
