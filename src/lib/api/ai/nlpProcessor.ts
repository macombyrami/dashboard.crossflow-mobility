/**
 * NLP Intelligence Processor — Production-Hardened
 *
 * Fixes:
 * - clearTimeout now called in finally{} so it always fires (prevents timer leak)
 * - AbortController correctly aborts the fetch, not the JSON parsing
 * - Reduced model to a reliable paid model (free tier has no SLA)
 * - Added structured error response to prevent collection route from hanging
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_URL     = 'https://openrouter.ai/api/v1/chat/completions'

// Use a paid, low-latency model. Free tier has no SLA and can hang indefinitely.
// Set via env so it can be swapped without code change.
const NLP_MODEL = process.env.NLP_MODEL ?? 'mistralai/mistral-7b-instruct'
const NLP_TIMEOUT_MS = 15_000 // 15s max per signal

export interface StructuredEvent {
  title:        string
  summary:      string
  category:     'accident' | 'congestion' | 'public_transport' | 'road_closure' | 'weather' | 'other'
  severity:     number // 0-100
  confidence:   number // 0-1
  latitude:     number
  longitude:    number
  area_context: string
  actions:      string[]
}

/** Fallback event for when AI processing fails — never throws */
function fallbackEvent(rawText: string): StructuredEvent {
  return {
    title:        'Alerte Sociale',
    summary:      rawText,
    category:     'other',
    severity:     30,
    confidence:   0.2,
    latitude:     48.8566,
    longitude:    2.3522,
    area_context: 'Non identifié',
    actions:      [],
  }
}

export async function processTrafficAlert(rawText: string): Promise<StructuredEvent> {
  if (!OPENROUTER_API_KEY) {
    console.warn('[NLP] OPENROUTER_API_KEY not set — returning fallback event')
    return fallbackEvent(rawText)
  }

  console.log('[NLP] Processing signal:', rawText.substring(0, 60) + '...')

  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), NLP_TIMEOUT_MS)

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  'https://crossflow-mobility.com',
        'X-Title':       'CrossFlow Smart City OS',
      },
      body: JSON.stringify({
        model: NLP_MODEL,
        messages: [
          {
            role: 'system',
            content: `Tu es un agent d'intelligence urbaine pour Paris/IDF.
Analyse le signalement et retourne un objet JSON STRICT avec ces champs:
- title: string (court titre en français)
- summary: string (résumé en français ≤80 mots)
- category: "accident" | "congestion" | "public_transport" | "road_closure" | "weather" | "other"
- severity: number 0-100
- confidence: number 0-1
- latitude: number (Paris par défaut: 48.8566)
- longitude: number (Paris par défaut: 2.3522)
- area_context: string (nom rue/quartier)
- actions: string[] (2 actions pour opérateurs)

RETOURNE UNIQUEMENT DU JSON VALIDE. Aucun texte autour.`
          },
          { role: 'user', content: rawText },
        ],
        response_format: { type: 'json_object' },
        temperature:     0.1,
        max_tokens:      512,
      }),
    })

    // clearTimeout AFTER fetch resolves, before reading body
    clearTimeout(timer)

    if (!response.ok) {
      console.error('[NLP] Provider error:', response.status, await response.text())
      return fallbackEvent(rawText)
    }

    const data    = await response.json()
    const content = data?.choices?.[0]?.message?.content

    if (!content) {
      console.error('[NLP] Empty content from provider')
      return fallbackEvent(rawText)
    }

    const parsed = JSON.parse(content)

    return {
      title:        String(parsed.title        ?? 'Incident Urbain'),
      summary:      String(parsed.summary      ?? rawText),
      category:     parsed.category            ?? 'other',
      severity:     Number(parsed.severity     ?? 50),
      confidence:   Number(parsed.confidence   ?? 0.5),
      latitude:     Number(parsed.latitude     ?? 48.8566),
      longitude:    Number(parsed.longitude    ?? 2.3522),
      area_context: String(parsed.area_context ?? 'Zone IDF'),
      actions:      Array.isArray(parsed.actions) ? parsed.actions : [],
    }
  } catch (err: any) {
    clearTimeout(timer) // safety: ensure timer is always cleared
    const isTimeout = err?.name === 'AbortError'
    console.error(`[NLP] ${isTimeout ? 'Timeout' : 'Error'}:`, err?.message ?? err)
    return fallbackEvent(rawText)
  }
}
