import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * GET /api/social/anomalies
 * Detects sudden spikes in traffic posts.
 * Logic: Compare volume of last 15m vs previous 15m.
 */
export async function GET(req: NextRequest) {
  try {
    const now            = new Date()
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60000).toISOString()
    const thirtyMinsAgo  = new Date(now.getTime() - 30 * 60000).toISOString()

    // 1. Fetch current window volume
    const { count: currentCount, error: err1 } = await supabase
      .from('social_alerts')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', fifteenMinsAgo)

    // 2. Fetch previous window volume
    const { count: prevCount, error: err2 } = await supabase
      .from('social_alerts')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', thirtyMinsAgo)
      .lt('created_at', fifteenMinsAgo)

    if (err1 || err2) throw new Error('Database query failed')

    const current = currentCount || 0
    const previous = prevCount || 0
    const ratio   = previous === 0 ? current : current / previous
    const isAnomaly = current > 5 && ratio > 2.5 // Threshold: 5+ posts and 2.5x spike

    return NextResponse.json({
      anomaly: isAnomaly,
      stats: { current, previous, ratio },
      message: isAnomaly ? '🚨 Sudden spike in traffic signals detected' : '✅ Signal volume within normal bounds',
      timestamp: now.toISOString()
    })
  } catch (err: any) {
    console.error('[Anomalies API] Error:', err.message)
    return NextResponse.json({ error: 'Failed to detect anomalies' }, { status: 500 })
  }
}
