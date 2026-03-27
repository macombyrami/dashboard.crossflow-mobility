import { NextRequest, NextResponse } from 'next/server'
import { scrapeTwitterTraffic } from '@/lib/api/scrapers/socialScraper'
import { synthesizeUrbanIntelligence } from '@/lib/api/intelligenceEngine'

/**
 * POST /api/social/analyze
 * Triggers a manual intelligence cycle: Scrape -> Synthesize.
 * Note: Only authorized personnel should trigger this. (Mocked for now).
 */
export async function POST(req: NextRequest) {
  console.log('⚡ Manually triggering Intelligence Cycle...')

  try {
    // 1. Scrape latest signals from X/RSS
    await scrapeTwitterTraffic()

    // 2. Synthesize signals into urban events
    await synthesizeUrbanIntelligence()

    return NextResponse.json({
      message: 'Intelligence cycle complete',
      timestamp: new Date().toISOString(),
      status: 'success'
    })
  } catch (err: any) {
    console.error('[Analyze API] Fatal Error:', err.message)
    return NextResponse.json({ error: 'Failed to run analysis cycle' }, { status: 500 })
  }
}
