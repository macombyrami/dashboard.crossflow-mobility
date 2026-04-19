import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processTrafficAlert } from '@/lib/api/ai/nlpProcessor'
import crypto from 'crypto'

/**
 * POST /api/social/collect
 * Purpose: Multi-provider ingestion, deduplication, and parallel NLP enrichment.
 *
 * Production fixes:
 * - NLP calls run in PARALLEL via Promise.allSettled (was sequential = 60s hang)
 * - cityId validation before processing
 * - Auth guard: requires valid session
 */

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Auth guard — only authenticated users can trigger collection
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { cityId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { cityId } = body
  if (!cityId || typeof cityId !== 'string') {
    return NextResponse.json({ error: 'cityId is required' }, { status: 400 })
  }

  try {
    // Raw social signals (in production: call X API, RSS, etc.)
    const rawSignals = [
      { source: 'x',   text: "Gros bouchon sur l'A86 direction Nanterre, accident suspect.", author_id: 'user123' },
      { source: 'rss', text: 'Perturbations majeures sur la Ligne 13, trafic interrompu.',   author_id: 'ratp_info' },
    ]

    // ─── Deduplication check (runs before NLP to avoid wasted API calls) ───
    const deduped: typeof rawSignals = []
    for (const signal of rawSignals) {
      const hash = crypto
        .createHash('sha256')
        .update(`${signal.author_id}:${signal.text.substring(0, 50)}`)
        .digest('hex')

      const { data: existing } = await supabase
        .from('social_events')
        .select('id')
        .eq('author_id_hash', hash)
        .gt('captured_at', new Date(Date.now() - 600_000).toISOString())
        .maybeSingle()

      if (!existing) deduped.push({ ...signal, _hash: hash } as any)
    }

    if (deduped.length === 0) {
      return NextResponse.json({ success: true, collected_count: 0, events: [], timestamp: new Date().toISOString() })
    }

    // ─── Parallel NLP enrichment — max 15s each, all run concurrently ───────
    const enrichmentResults = await Promise.allSettled(
      deduped.map(s => processTrafficAlert(s.text))
    )

    // ─── Persistence ────────────────────────────────────────────────────────
    const processedEvents = []
    for (let i = 0; i < deduped.length; i++) {
      const signal  = deduped[i] as any
      const result  = enrichmentResults[i]
      const enriched = result.status === 'fulfilled' ? result.value : null

      if (!enriched) {
        console.warn('[Collect] NLP failed for signal, skipping:', signal.text.substring(0, 40))
        continue
      }

      const { data, error } = await supabase
        .from('social_events')
        .insert({
          city_id:        cityId,
          captured_at:    new Date().toISOString(),
          source:         signal.source,
          author_id_hash: signal._hash,
          text:           signal.text,
          sentiment:      enriched.confidence,
          severity:       enriched.severity > 70 ? 'critical' : enriched.severity > 40 ? 'high' : 'medium',
          entities:       { area: enriched.area_context, actions: enriched.actions },
          geo:            enriched.latitude ? `SRID=4326;POINT(${enriched.longitude} ${enriched.latitude})` : null,
          status:         'new',
          raw:            signal,
        })
        .select()
        .single()

      if (!error && data) processedEvents.push(data)
    }

    return NextResponse.json({
      success:         true,
      collected_count: processedEvents.length,
      events:          processedEvents,
      timestamp:       new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[Social Collect] Failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
