import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 🛰️ STAFF ENGINEER: Traffic Database Maintenance (Cron)
 * 
 * Target: Once daily.
 * - Prunes old snapshots to optimize Supabase storage (Retention: 30 days).
 * - Forces refresh of Materialized Views for accurate analytics.
 */

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET || 'crossflow_internal_secret'
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  try {
    const retentionDays = 30
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()

    // 1. Prune Old Snapshots
    const { count, error: pruneError } = await supabase
      .from('traffic_snapshots')
      .delete({ count: 'exact' })
      .lt('fetched_at', cutoffDate)

    if (pruneError) throw pruneError

    // 2. Refresh Hourly Analytics View (RPC defined in migration)
    const { error: refreshError } = await supabase.rpc('refresh_traffic_stats')
    if (refreshError) throw refreshError

    return NextResponse.json({ 
      success: true, 
      pruned_count: count,
      retention: `${retentionDays} days`,
      timestamp: new Date().toISOString()
    })

  } catch (err: any) {
    console.error('[CleanupJob] Maintenance Failed:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
