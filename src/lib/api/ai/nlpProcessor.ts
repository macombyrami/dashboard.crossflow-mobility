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
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout

    const response = await fetch(SEARCH_API_URL, {
      method: 'POST',
      signal: controller.signal,
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
            content: `You are a Senior Smart City Traffic Intelligence Agent.
            Analyze the social media post and return a structured JSON object.
            
            MULTILINGUAL SUPPORT:
            - Input may be in French, English, or Arabic.
            - Output 'title' and 'summary' MUST be in French.
            
            ANALYSIS GOALS:
            1. Categorize: accident | congestion | public_transport | road_closure | weather | other
            2. Geocode: Best estimate for Paris/Gennevilliers coordinates.
            3. Sentiment: Detect frustration / pain level (0-100).
            
            Fields:
            - title: Clear short title (French)
            - summary: Concise explanation (French)
            - category: Categorized incident type
            - severity: 0 (minor) to 100 (critical) based on text intensity
            - confidence: 0 to 1 (reliability estimate)
            - latitude/longitude: Geo-coordinates (Float). 
            - area_context: Neighborhood/Street name.
            - actions: Array of 2 recommended actions for city operators.
            
            Return PURE JSON ONLY.`
          },
          { role: 'user', content: rawText }
        ],
        response_format: { type: 'json_object' }
      })
    })

    clearTimeout(timeout)

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
