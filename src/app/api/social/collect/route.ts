import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processTrafficAlert } from '@/lib/api/ai/nlpProcessor'
import crypto from 'crypto'

/**
 * POST /api/social/collect
 * Purpose: Multi-provider ingestion, deduplication, and NLP enrichment.
 */

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { cityId } = await req.json()

  try {
    // 1. Fetch raw social signals (Mocking multi-provider ingestion)
    // In a real scenario, this would call X API, RSS feeds, etc.
    const rawSignals = [
      { source: 'x', text: "Gros bouchon sur l'A86 direction Nanterre, accident suspect.", author_id: "user123" },
      { source: 'rss', text: "Perturbations majeures sur la Ligne 13, trafic interrompu.", author_id: "ratp_info" }
    ]

    const processedEvents = []

    for (const signal of rawSignals) {
      // 2. Deduplication (hash auteur + texte troncature)
      const hash = crypto.createHash('sha256')
        .update(`${signal.author_id}:${signal.text.substring(0, 50)}`)
        .digest('hex')

      // Check if already exists in last 10 minutes
      const { data: existing } = await supabase
        .from('social_events')
        .select('id')
        .eq('author_id_hash', hash)
        .gt('captured_at', new Date(Date.now() - 600000).toISOString())
        .maybeSingle()

      if (existing) continue

      // 3. NLP Enrichment (Llama-3/Mistral)
      const enriched = await processTrafficAlert(signal.text)

      // 4. Persistence
      const { data, error } = await supabase
        .from('social_events')
        .insert({
          city_id: cityId,
          captured_at: new Date().toISOString(),
          source: signal.source,
          author_id_hash: hash,
          text: signal.text,
          sentiment: enriched.confidence, // Using confidence as sentiment proxy for now
          severity: enriched.severity > 70 ? 'critical' : enriched.severity > 40 ? 'high' : 'medium',
          entities: { area: enriched.area_context, actions: enriched.actions },
          geo: enriched.latitude ? `SRID=4326;POINT(${enriched.longitude} ${enriched.latitude})` : null,
          status: 'new',
          raw: signal
        })
        .select()
        .single()

      if (!error && data) {
        processedEvents.push(data)
      }
    }

    return NextResponse.json({
      success: true,
      collected_count: processedEvents.length,
      events: processedEvents,
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    console.error('❌ Social Collection Failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
