/**
 * Sytadin Refresh Cron Job
 * Orchestrates the full pipeline: Scrape → Parse → Geocode → Match → Store
 * Triggered every 60 seconds
 */

import { NextRequest, NextResponse } from 'next/server'
import { scrapeSytadinIncidents } from '@/lib/scrapers/nitter-sytadin'
import { parseIncident } from '@/lib/parsers/french-incident-parser'
import { geocodeIncident } from '@/lib/geocoding/incident-geocoder'
import { matchIncident } from '@/lib/road-matching/incident-road-matcher'
import { createClient } from '@/lib/supabase/server'

// IDF cities for NLP parsing
const IDF_CITIES = [
  'Paris', 'Bobigny', 'Gennevilliers', 'Rueil', 'Boulogne', 'Neuilly',
  'Saint-Denis', 'Montreuil', 'Vincennes', 'Fontenay', 'Orly', 'Versailles',
  'Créteil', 'Châtenay', 'Vanves', 'Malakoff', 'Bagneux', 'Montrouge',
  'Clamart', 'Sèvres', 'Meudon', 'Chaville', 'Vélizy', 'Rambouillet',
  'Fontainebleau', 'Melun', 'Évry', 'Corbeil', 'Essonne', 'Hauts-de-Seine',
  'Belleville', 'Bastille', 'Châtelet', 'Gare du Nord', 'Nation', 'Bercy',
  'République', 'Marais', 'Belleville', 'Buttes-aux-Cailles'
]

const IDF_ROADS = [
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A6a', 'A7', 'A8', 'A9', 'A10',
  'A11', 'A12', 'A13', 'A14', 'A15', 'A16', 'N1', 'N2', 'N3', 'N4', 'N5',
  'N6', 'N7', 'N8', 'N9', 'N10', 'N104', 'N118', 'Périphérique', 'RER'
]

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // Verify CRON_SECRET from header
  const secret = req.headers.get('X-Cron-Secret') || ''
  const expectedSecret = process.env.CRON_SECRET || 'dev-secret'

  if (secret !== expectedSecret) {
    console.warn('[Sytadin Cron] Unauthorized access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  console.log('[Sytadin Cron] Starting refresh...')

  try {
    // STEP 1: Scrape Nitter
    console.log('[Sytadin Cron] Step 1: Scraping Nitter...')
    const rawTweets = await scrapeSytadinIncidents()
    console.log(`[Sytadin Cron] Scraped ${rawTweets.length} tweets`)

    if (rawTweets.length === 0) {
      return NextResponse.json(
        {
          status: 'success',
          message: 'No tweets scraped',
          inserted: 0,
          skipped: 0,
          duration: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        },
        { status: 200 }
      )
    }

    // Initialize processors
    const supabase = await createClient()
    let insertedCount = 0
    let skippedCount = 0
    let errorCount = 0

    // STEP 2-7: Process each tweet through the full pipeline
    console.log('[Sytadin Cron] Processing tweets through pipeline...')

    for (const tweet of rawTweets) {
      try {
        // Check if already in DB
        const { data: existing } = await supabase
          .from('sytadin_incidents')
          .select('id')
          .eq('tweet_id', tweet.id)
          .limit(1)

        if (existing && existing.length > 0) {
          skippedCount++
          continue
        }

        // STEP 2: Parse (French NLP)
        const parsed = parseIncident(tweet.text, IDF_CITIES, IDF_ROADS)
        if (!parsed) {
          console.debug(`[Sytadin Cron] Failed to parse tweet ${tweet.id}`)
          skippedCount++
          continue
        }

        // STEP 3: Geocode
        const geocoded = await geocodeIncident(parsed)
        if (!geocoded) {
          console.debug(`[Sytadin Cron] Failed to geocode tweet ${tweet.id}`)
          skippedCount++
          continue
        }

        // STEP 4: Match to road
        const matched = await matchIncident(geocoded)
        if (!matched) {
          console.debug(`[Sytadin Cron] Failed to match tweet ${tweet.id}`)
          skippedCount++
          continue
        }

        // STEP 5: Insert into database
        const { error: insertError } = await supabase
          .from('sytadin_incidents')
          .insert({
            tweet_id: tweet.id,
            type: matched.type,
            severity: matched.severity,
            road: matched.road,
            direction: matched.direction,
            from_city: matched.from_city,
            to_city: matched.to_city,
            event_description: matched.event,
            geometry: matched.geometry,
            confidence_parse: matched.confidence_parse,
            confidence_geocode: matched.geometry_type === 'LineString' ? 'high' : 'medium',
            status: 'active',
            tweet_created_at: new Date(tweet.created_at),
            source_url: `https://twitter.com/sytadin/status/${tweet.id}`
          })

        if (insertError) {
          console.warn(`[Sytadin Cron] Insert failed for tweet ${tweet.id}:`, insertError.message)
          errorCount++
        } else {
          insertedCount++
          console.debug(`[Sytadin Cron] Successfully inserted incident from tweet ${tweet.id}`)
        }
      } catch (error) {
        console.warn(`[Sytadin Cron] Error processing tweet ${tweet.id}:`, error)
        errorCount++
      }
    }

    const duration = Date.now() - startTime

    console.log(
      `[Sytadin Cron] Complete: ${insertedCount} inserted, ${skippedCount} skipped, ${errorCount} errors in ${duration}ms`
    )

    return NextResponse.json(
      {
        status: 'success',
        inserted: insertedCount,
        skipped: skippedCount,
        errors: errorCount,
        total_processed: rawTweets.length,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[Sytadin Cron] Fatal error:', error)

    return NextResponse.json(
      {
        status: 'error',
        error: String(error),
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
