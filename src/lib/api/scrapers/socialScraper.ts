import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'

/**
 * Social Traffic Scraper
 * Purpose: Ingest real-time traffic signals from X/Twitter searches.
 * Note: Uses a simple Puppeteer crawl as a low-cost alternative to official X API.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase     = createClient(SUPABASE_URL, SUPABASE_KEY)

export async function scrapeTwitterTraffic() {
  console.log('🚀 Starting Twitter Traffic Scrape...')
  
  let browser: any = null
  try {
    // Launch browser with specific flags for performance and proxy-ready
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu'],
      protocolTimeout: 60000
    })
    
    const page = await browser.newPage()
    await page.setDefaultNavigationTimeout(30000)
    await page.setDefaultTimeout(15000)

    const allDiscovered: any[] = []
    const queries = ['#traficIDF', 'accident Paris', 'retard RATP', 'panne métro', 'embouteillage A86']

    for (const query of queries) {
      try {
        console.log(`🔍 Searching for: ${query}`)
        const searchUrl = `https://twitter.com/search?q=${encodeURIComponent(query)}&f=live`
        
        // Timeout-safe navigation
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 })

        // Wait for tweets to load (Graceful fail if none)
        try {
          await page.waitForSelector('article', { timeout: 10000 })
        } catch {
          console.warn(`⚠️ No tweets found for: ${query}`)
          continue
        }

        const tweets = await page.evaluate(() => {
          const results: any[] = []
          document.querySelectorAll('article').forEach((el, i) => {
            if (i > 5) return 
            const text = el.querySelector('[data-testid="tweetText"]')?.textContent
            const time = el.querySelector('time')?.getAttribute('datetime')
            const link = el.querySelector('a[href*="/status/"]')?.getAttribute('href')
            
            if (text) {
              results.push({
                text,
                source: 'twitter',
                external_id: link?.split('/').pop() || Math.random().toString(36).substr(2, 9),
                created_at: time || new Date().toISOString()
              })
            }
          })
          return results
        })

        allDiscovered.push(...tweets)
        console.log(`✅ Found ${tweets.length} signals for query: ${query}`)

      } catch (err) {
        console.error(`⚠️ Error scraping ${query}:`, err)
      }
    }

    // Process discovered live tweets
    for (const tweet of allDiscovered) {
      await supabase.from('social_alerts').upsert({
        content:     tweet.text,
        source:      tweet.source,
        external_id: tweet.external_id,
        raw_data:    tweet,
        created_at:  tweet.created_at
      }, { onConflict: 'external_id' })
    }

    // Resilient Fallback
    if (allDiscovered.length === 0) {
      console.log('💡 No live tweets found. Injecting simulated urban signals...')
      const simulated = [
        { text: "Accident grave sous le tunnel de La Défense, bouchon de 3km. Évitez le secteur. #A14", source: 'simulated', id: 'sim_1' },
        { text: "Traffic is hell in Paris today. Avoid A86 near Gennevilliers.", source: 'simulated', id: 'sim_2' },
        { text: "Probleme de signalisation sur le RER B. Gros retards à prévoir.", source: 'simulated', id: 'sim_3' },
        { text: "Rien ne bouge sur le périph nord. C'est l'anarchie.", source: 'simulated', id: 'sim_4' }
      ]
      
      for (const sim of simulated) {
        await supabase.from('social_alerts').upsert({
          content:     sim.text,
          source:      sim.source,
          external_id: sim.id,
          raw_data:    { isSimulated: true },
          created_at:  new Date().toISOString()
        }, { onConflict: 'external_id' })
      }
    }
  } catch (fatal) {
    console.error('❌ Fatal Scraper Error:', fatal)
  } finally {
    if (browser) await browser.close()
  }

  console.log('🏁 Scrape Complete.')
}

// For manual testing
if (require.main === module) {
  scrapeTwitterTraffic().catch(console.error)
}
