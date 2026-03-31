import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 1. Get recent logs (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: logs, error } = await supabase
      .from('api_usage_logs')
      .select('*')
      .gt('created_at', yesterday)
      .order('created_at', { ascending: false })

    if (error) throw error

    // 2. Aggregate stats
    const stats = {
      totalRequests: logs.length,
      cacheHits:     logs.filter(l => l.cache_status.startsWith('hit')).length,
      predictive:    logs.filter(l => l.cache_status === 'predictive').length,
      errors:        logs.filter(l => l.status >= 400).length,
      responseTime:  Math.round(logs.reduce((acc, l) => acc + (l.response_time || 0), 0) / (logs.length || 1)),
      byService: {
        flow:      logs.filter(l => l.service === 'tomtom-flow').length,
        incidents: logs.filter(l => l.service === 'tomtom-incidents').length
      },
      savingsPct: logs.length > 0 
        ? Math.round(((logs.filter(l => l.cache_status !== 'miss').length) / logs.length) * 100)
        : 0
    }

    return NextResponse.json(stats)
  } catch (err) {
    console.error('[MonitoringAPI] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
