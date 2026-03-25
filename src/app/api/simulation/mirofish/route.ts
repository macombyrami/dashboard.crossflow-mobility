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

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const MODEL           = 'openai/gpt-oss-120b:free'
const APP_URL         = process.env.NEXT_PUBLIC_APP_URL ?? 'https://myaccount.crossflow-mobility.com'
const ZEP_BASE        = 'https://api.getzep.com/api/v2'

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
  maxTokens = 800,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY manquant')

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  APP_URL,
      'X-Title':       'CrossFlow MiroFish',
    },
    body: JSON.stringify({
      model:       MODEL,
      messages:    [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: prompt },
      ],
      temperature: 0.7,
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

// ─── Personas mobilité ────────────────────────────────────────────────────────

const PERSONAS = [
  {
    role:         'Automobiliste domicile-travail',
    emoji:        '🚗',
    proportion:   0.40,
    comportement: 'Évite les bouchons, suit les apps GPS, sensible au temps de trajet',
  },
  {
    role:         'Livreur colis / coursier',
    emoji:        '📦',
    proportion:   0.10,
    comportement: 'Contraintes horaires strictes, cherche à se garer, prend des risques',
  },
  {
    role:         'Usager transports en commun',
    emoji:        '🚇',
    proportion:   0.30,
    comportement: 'Réagit aux perturbations RATP, peut marcher 15 min, multimodal',
  },
  {
    role:         'Cycliste urbain',
    emoji:        '🚲',
    proportion:   0.12,
    comportement: 'Évite les axes rapides, sensible à la météo, utilise les pistes cyclables',
  },
  {
    role:         'Piéton / touriste',
    emoji:        '🚶',
    proportion:   0.08,
    comportement: 'Se déplace à pied, traversées imprévisibles, flux concentré sur les zones touristiques',
  },
]

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
    const raw = await appelLLM(prompt, systeme, 300)

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
    const raw = await appelLLM(prompt, systeme, 900)
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

// ─── Route POST — Lancer la simulation ────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY manquant' }, { status: 503 })
  }

  try {
    const seed: SimSeed = await req.json()

    // Identifiant unique de simulation
    const simId = `mf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // Créer la session Zep (mémoire des agents)
    await creerSessionZep(simId)

    // Sélectionner les personas à simuler selon nbAgents
    const nb         = seed.nbAgents ?? 50
    const personnages = nb <= 50  ? PERSONAS.slice(0, 3) :
                        nb <= 200 ? PERSONAS.slice(0, 4) : PERSONAS

    // Simuler les agents en parallèle par lots (éviter rate-limit)
    const insights: AgentInsight[] = []
    const lots = [personnages.slice(0, 2), personnages.slice(2)]

    for (const lot of lots) {
      const resultats = await Promise.all(lot.map(p => simulerAgent(p, seed, simId)))
      insights.push(...resultats)
    }

    // Générer le rapport final
    const rapport = await genererRapport(seed, insights)

    const result: MiroFishResult = {
      simulationId:    simId,
      status:          'terminee',
      insightsAgents:  insights,
      termineeA:       new Date().toISOString(),
      ...rapport,
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    console.error('[MiroFish] Erreur simulation:', e)
    return NextResponse.json(
      { error: `Erreur simulation: ${e instanceof Error ? e.message : 'inconnue'}` },
      { status: 500 },
    )
  }
}
