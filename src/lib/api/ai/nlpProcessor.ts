/**
 * NLP Intelligence Processor
 * Purpose: Structure raw social alerts into high-value urban intelligence.
 * Model: Llama 3 / Mistral (via OpenRouter)
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!
const SEARCH_API_URL     = 'https://openrouter.ai/api/v1/chat/completions'

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

export async function processTrafficAlert(rawText: string): Promise<StructuredEvent> {
  console.log('🧠 Processing Urban Signal:', rawText.substring(0, 50) + '...')

  try {
    const response = await fetch(SEARCH_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  'https://crossflow-mobility.com',
        'X-Title':       'CrossFlow Smart City OS'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3-8b-instruct:free',
        messages: [
          {
            role: 'system',
            content: `You are a Smart City Traffic Intelligence Agent. 
            Analyze the social media post and return a structured JSON object.
            Fields:
            - title: Clear short title (French)
            - summary: Concise explanation (French)
            - category: accident | congestion | public_transport | road_closure | weather | other
            - severity: 0 (minor) to 100 (critical)
            - confidence: 0 to 1
            - latitude/longitude: Best estimate for Paris/Gennevilliers. If unclear, use 48.8566/2.3522 (Paris center).
            - area_context: Street name or neighborhood.
            - actions: Array of 2 recommended actions for city operators.
            Return PURE JSON ONLY.`
          },
          { role: 'user', content: rawText }
        ],
        response_format: { type: 'json_object' }
      })
    })

    const data = await response.json()
    const content = data.choices[0].message.content
    const parsed = JSON.parse(content)

    return {
      title:        parsed.title        || 'Incident Urbain',
      summary:      parsed.summary      || rawText,
      category:     parsed.category     || 'other',
      severity:     parsed.severity     || 50,
      confidence:   parsed.confidence   || 0.5,
      latitude:     parsed.latitude     || 48.8566,
      longitude:    parsed.longitude    || 2.3522,
      area_context: parsed.area_context || 'Zone IDF',
      actions:      parsed.actions      || []
    }
  } catch (err) {
    console.error('❌ AI Processing Failed:', err)
    return {
      title: 'Alerte Sociale',
      summary: rawText,
      category: 'other',
      severity: 30,
      confidence: 0.2,
      latitude: 48.8566,
      longitude: 2.3522,
      area_context: 'Non identifié',
      actions: []
    }
  }
}
