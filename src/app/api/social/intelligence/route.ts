import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * GET /api/social/intelligence
 * Fetches synthesized urban events derived from AI analysis of social media signals.
 */
export async function GET(req: NextRequest) {
  try {
    const { data: events, error } = await supabase
      .from('social_intelligence_events')
      .select('*')
      .eq('status', 'active')
      .order('severity', { ascending: false })
      .limit(10)

    if (error) throw error

    return NextResponse.json({
      events: events || [],
      timestamp: new Date().toISOString(),
      status: 'success'
    })
  } catch (err: any) {
    console.error('[Intelligence API] Error:', err.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
