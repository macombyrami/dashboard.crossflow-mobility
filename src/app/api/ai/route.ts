/**
 * OpenRouter AI — Server-side route
 * Key stays server-side (never exposed to browser)
 */
import { NextRequest, NextResponse } from 'next/server'
import aiData from '@/lib/data/ai.json'
import appData from '@/lib/data/app.json'

const OPENROUTER_BASE = aiData.openrouter.baseUrl
const DEFAULT_MODEL   = aiData.openrouter.defaultModel

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENROUTER_API_KEY manquant dans .env.local' },
      { status: 503 },
    )
  }

  try {
    const body = await req.json()
    const { messages, model = DEFAULT_MODEL, cityContext } = body

    const systemPrompt = buildSystemPrompt(cityContext)

    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  process.env.NEXT_PUBLIC_APP_URL ?? appData.url,
        'X-Title':       aiData.openrouter.xTitle,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: aiData.main.temperature,
        max_tokens:  aiData.main.maxTokens,
        stream:      false,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: `OpenRouter: ${err}` }, { status: response.status })
    }

    const data    = await response.json()
    const content = data.choices?.[0]?.message?.content ?? ''

    return NextResponse.json({ content, model: data.model, usage: data.usage })
  } catch (e) {
    return NextResponse.json(
      { error: `Erreur serveur: ${e instanceof Error ? e.message : 'unknown'}` },
      { status: 500 },
    )
  }
}

// ─── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(ctx?: CityContext): string {
  const now  = new Date()
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  let contextBlock = ''
  if (ctx) {
    const weatherLine = ctx.weather
      ? `\n- **Météo**: ${ctx.weather.emoji} ${ctx.weather.description}, ${ctx.weather.temp}°C, vent ${ctx.weather.windKmh} km/h, visibilité ${ctx.weather.visibilityKm} km${ctx.weather.precipMm > 0 ? `, précip. ${ctx.weather.precipMm} mm` : ''}${ctx.weather.snowDepthCm > 0 ? `, neige ${ctx.weather.snowDepthCm} cm` : ''} → impact trafic: **${ctx.weather.trafficImpact}**`
      : ''

    const aqLine = ctx.airQuality
      ? `\n- **Qualité air**: IQA EU ${ctx.airQuality.aqiEU} (${ctx.airQuality.level}), PM2.5 ${ctx.airQuality.pm25} µg/m³, NO₂ ${ctx.airQuality.no2} µg/m³${ctx.airQuality.trafficImpact > 0 ? ` → +${Math.round(ctx.airQuality.trafficImpact * 100)}% congestion estimée` : ''}`
      : ''

    const cityStatsLine = ctx.cityStats
      ? `\n- **Stats ville**: pop. ${ctx.cityStats.population?.toLocaleString('fr-FR') ?? '—'}, densité ${ctx.cityStats.density?.toLocaleString('fr-FR') ?? '—'} hab/km²`
      : ''

    const zoneLine = ctx.zone?.active
      ? `\n\n### ANALYSE DE ZONE (Focus Localisé)
- **Zone active**: OUI (l'utilisateur analyse un secteur spécifique)
- **Segments dans la zone**: ${ctx.zone.segmentCount}
- **Congestion moyenne zone**: ${Math.round(ctx.zone.avgCongestion * 100)}%
- **Incidents dans la zone**: ${ctx.zone.incidentCount}
- **Rues principales analysées**: ${ctx.zone.streets?.join(', ') || 'n/a'}
${ctx.zone.topIncidents?.length ? `- **Incidents locaux**: ${ctx.zone.topIncidents.join('; ')}` : ''}`
      : ''

    contextBlock = `
## Contexte temps réel — ${ctx.cityName}${ctx.country ? `, ${ctx.country}` : ''}

- **Heure locale**: ${time} — ${date}
- **Congestion globale**: ${Math.round((ctx.congestionRate ?? 0) * 100)}%
- **Temps de trajet moyen**: ${ctx.avgTravelMin ?? '—'} min
- **Indice pollution**: ${ctx.pollutionIndex ?? '—'} / 10
- **Incidents actifs**: ${ctx.activeIncidents ?? 0}
- **Source données trafic**: ${ctx.dataSource ?? 'synthétique'}${weatherLine}${aqLine}${cityStatsLine}${zoneLine}
`
  }

  return `Tu es **CrossFlow Intelligence**, l'IA embarquée de la plateforme CrossFlow Mobility — plateforme Smart City d'analyse et d'optimisation du trafic urbain.
${contextBlock}
## Tes expertises

- Analyse de patterns de trafic et détection d'anomalies
- Optimisations concrètes et actionnables (signalisation, itinéraires, régulation)
- Interprétation météo + qualité de l'air sur le flux de circulation
- Prédictions d'évolution trafic selon heure, météo, événements
- Scénarios de simulation (voie réservée, carrefour intelligent, déviation)
- Mobilité multimodale (TC, vélo, piéton, voiture)
- Impact environnemental et calculs d'émissions CO₂

## Style de réponse

- Concis, structuré, orienté action — pas de remplissage
- Chiffres et pourcentages quand disponibles
- Markdown avec titres, puces et **gras** pour les points clés
- Pense en ingénieur de terrain, propose des mesures concrètes
- Réponds en français sauf si demandé autrement
- **IMPORTANT**: Si une zone est active, focalise ton analyse prioritairement sur les données de cette zone.

Si aucun contexte de ville n'est fourni, réponds en mode général sur la mobilité urbaine.`
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
  zone?: {
    active:         boolean
    segmentCount:   number
    incidentCount:  number
    avgCongestion:  number
    topIncidents?:  string[]
    streets?:       string[]
  }
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
  cityStats?: {
    population?: number
    density?:    number
    area?:       number
  }
}
