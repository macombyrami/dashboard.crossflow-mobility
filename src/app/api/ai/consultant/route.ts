import { NextRequest, NextResponse } from 'next/server'
import { CONSULTANT_SYSTEM_PROMPT } from '@/lib/api/ai/consultant'

/**
 * Next.js API Route for AI Consultant
 * Uses OpenRouter (Llama 3 / Mistral)
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function POST(req: NextRequest) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 })
  }

  try {
    const { query, context } = await req.json()

    const contextStr = `
    CITY: ${context.city}
    TRAFFIC: ${context.traffic} (Congestion: ${Math.round(context.congestionRate * 100)}%)
    WEATHER: ${context.weather}
    INCIDENTS: ${context.incidents.join(', ') || 'Aucun'}
    EVENTS: ${context.events.join(', ') || 'Aucun'}
    SOCIAL: ${context.social.join(', ') || 'Aucun'}
    TRANSPORT_LOAD: ${context.transportLoad}
    `

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  'https://crossflow-mobility.com',
        'X-Title':       'CrossFlow AI Consultant'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // Power & Efficiency balance for mobility expert
        messages: [
          { role: 'system', content: CONSULTANT_SYSTEM_PROMPT },
          { role: 'user',   content: `CONTEXTE TEMPS RÉEL :\n${contextStr}\n\nQUESTION :\n${query}` }
        ],
        temperature: 0.2, // Low temperature for high reliability/compliance
        max_tokens:  1024
      })
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: 'OpenRouter Error', detail: err }, { status: 502 })
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    return NextResponse.json({ content })
  } catch (err: any) {
    console.error('❌ AI Consultant Route Failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
