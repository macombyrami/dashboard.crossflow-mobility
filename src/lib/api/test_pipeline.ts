import { scrapeTwitterTraffic } from './scrapers/socialScraper'
import { synthesizeUrbanIntelligence } from './intelligenceEngine'

/**
 * AI Intelligence Module Test Pipeline
 * Run this to verify the end-to-end integration.
 */
async function runVerification() {
  console.log('🧪 Starting AI Intelligence Verification Run...')
  
  try {
    // Phase 1: Ingestion
    console.log('\n--- PHASE 1: INGESTION ---')
    await scrapeTwitterTraffic()
    
    // Phase 2: Synthesis
    console.log('\n--- PHASE 2: SYNTHESIS ---')
    await synthesizeUrbanIntelligence()
    
    console.log('\n✅ VERIFICATION COMPLETE: Pipeline is operational.')
  } catch (err: any) {
    console.error('\n❌ VERIFICATION FAILED:', err.message)
  }
}

runVerification()
