import { createClient } from '@supabase/supabase-js'
import { processTrafficAlert } from './ai/nlpProcessor'

/**
 * Intelligence Synthesis Engine
 * Purpose: Periodically synthesize raw social signals into high-level urban events.
 * Pattern: Fetch raw -> AI Parse -> Cluster -> Merge/Insert
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase     = createClient(SUPABASE_URL, SUPABASE_KEY)

export async function synthesizeUrbanIntelligence() {
  console.log('🤖 Starting Intelligence Synthesis...')

  // 1. Fetch un-synthesized raw alerts (from last 2 hours)
  const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000).toISOString()
  
  const { data: rawAlerts, error: fetchErr } = await supabase
    .from('social_alerts')
    .select('*')
    .is('synthesized', false)
    .gt('created_at', twoHoursAgo)
    .limit(20)

  if (fetchErr) {
    console.error('❌ Fetch raw alerts failed:', fetchErr.message)
    return
  }

  if (!rawAlerts || rawAlerts.length === 0) {
    console.log('✅ No new signals to synthesize.')
    return
  }

  console.log(`🧐 Found ${rawAlerts.length} new signals. processing...`)

  for (const alert of rawAlerts) {
    // 2. Process via AI NLP Pipeline
    const intelligence = await processTrafficAlert(alert.content)

    // 3. Simple Clustering: Check if a similar event exists near this location
    const { data: existingEvents, error: clusterErr } = await supabase
      .from('social_intelligence_events')
      .select('*')
      .eq('status', 'active')
      .eq('category', intelligence.category)
      .limit(1)

    // Note: In production, we'd use a PostGIS distance check (ST_DWithin)
    // For this prototype, I'll match by name/street if similar
    const closeEvent = existingEvents?.find((e: any) => 
      e.area_context.toLowerCase() === intelligence.area_context.toLowerCase() ||
      (Math.abs(e.latitude - intelligence.latitude) < 0.005 && Math.abs(e.longitude - intelligence.longitude) < 0.005)
    )

    if (closeEvent) {
      console.log(`🔗 Correlating signal to existing event: ${closeEvent.title}`)
      
      // Update existing event
      await supabase
        .from('social_intelligence_events')
        .update({
          source_ids:  [...closeEvent.source_ids, alert.id],
          severity:    Math.min(100, closeEvent.severity + 5), // Increase severity with more reports
          confidence:  Math.min(1, (closeEvent.source_ids.length + 1) / 5),
          updated_at:  new Date().toISOString()
        })
        .eq('id', closeEvent.id)

    } else {
      console.log(`✨ Creating NEW intelligence event: ${intelligence.title}`)
      
      // Create new synthesized event
      await supabase
        .from('social_intelligence_events')
        .insert({
          title:        intelligence.title,
          summary:      intelligence.summary,
          category:     intelligence.category,
          severity:     intelligence.severity,
          confidence:   intelligence.confidence,
          latitude:     intelligence.latitude,
          longitude:    intelligence.longitude,
          area_context: intelligence.area_context,
          source_ids:   [alert.id],
          recommended_actions: intelligence.actions
        })
    }

    // 4. Mark raw alert as synthesized
    await supabase
      .from('social_alerts')
      .update({ synthesized: true })
      .eq('id', alert.id)
  }

  console.log('🏁 Synthesis Cycle Complete.')
}
