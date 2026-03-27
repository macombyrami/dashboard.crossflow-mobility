import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'

/**
 * Social Traffic Scraper
 * Purpose: Ingest real-time traffic signals from X/Twitter searches.
 * Note: Uses a simple Puppeteer crawl as a low-cost alternative to official X API.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase     = createClient(SUPABASE_URL, SUPABASE_KEY)

export async function scrapeTwitterTraffic() {
  console.log('🚀 Starting Twitter Traffic Scrape...')
  const browser = await puppeteer.launch({ headless: true })
  const page    = await browser.newPage()

  // Targets: Search for traffic hashtags and keywords
  const queries = [
    '#traficIDF',
    'accident Paris',
    'retard RATP',
    'panne métro',
    'embouteillage A86'
  ]

  for (const query of queries) {
    try {
      console.log(`🔍 Searching for: ${query}`)
      const searchUrl = `https://twitter.com/search?q=${encodeURIComponent(query)}&f=live`
      await page.goto(searchUrl, { waitUntil: 'networkidle2' })

      // Wait for tweets to load
      await page.waitForSelector('article', { timeout: 10000 })

      const tweets = await page.evaluate(() => {
        const results: any[] = []
        document.querySelectorAll('article').forEach((el, i) => {
          if (i > 5) return // Limit to latest 5 per query
          const text = el.querySelector('[data-testid="tweetText"]')?.textContent
          const time = el.querySelector('time')?.getAttribute('datetime')
          const link = el.querySelector('a[href*="/status/"]')?.getAttribute('href')
          
          if (text) {
            results.push({
              text,
              source: 'twitter',
              external_id: link?.split('/').pop(),
              created_at: time || new Date().toISOString()
            })
          }
        })
        return results
      })

      console.log(`✅ Found ${tweets.length} signals.`)

      // Insert into Supabase (social_alerts table)
      for (const tweet of tweets) {
        const { error } = await supabase
          .from('social_alerts')
          .upsert({
            content:     tweet.text,
            source:      tweet.source,
            external_id: tweet.external_id,
            raw_data:    tweet,
            created_at:  tweet.created_at
          }, { onConflict: 'external_id' })
        
        if (error) console.error('❌ Insert Error:', error.message)
      }
    } catch (err) {
      console.error(`⚠️ Error scraping ${query}:`, err)
    }
  }

  await browser.close()
  console.log('🏁 Scrape Complete.')
}

// For manual testing
if (require.main === module) {
  scrapeTwitterTraffic().catch(console.error)
}
