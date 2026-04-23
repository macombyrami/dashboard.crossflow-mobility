/**
 * Sytadin refresh job.
 * Pipeline: scrape -> parse -> geocode -> road-match -> store.
 */

import { NextRequest, NextResponse } from 'next/server'
import type { GeoJSON } from 'geojson'
import { scrapeSytadinIncidents } from '@/lib/scrapers/nitter-sytadin'
import { parseIncident } from '@/lib/parsers/french-incident-parser'
import { geocodeIncident } from '@/lib/geocoding/incident-geocoder'
import { matchIncident } from '@/lib/road-matching/incident-road-matcher'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const IDF_CITIES = [
  'Paris', 'Bobigny', 'Gennevilliers', 'Rueil-Malmaison', 'Boulogne-Billancourt', 'Neuilly-sur-Seine',
  'Saint-Denis', 'Montreuil', 'Vincennes', 'Fontenay-sous-Bois', 'Orly', 'Versailles',
  'Creteil', 'Chatenay-Malabry', 'Vanves', 'Malakoff', 'Bagneux', 'Montrouge',
  'Clamart', 'Sevres', 'Meudon', 'Chaville', 'Velizy-Villacoublay', 'Rambouillet',
  'Fontainebleau', 'Melun', 'Evry', 'Corbeil-Essonnes', 'Ris-Orangis', 'Nanterre',
]

const IDF_ROADS = [
  'A1', 'A3', 'A4', 'A6', 'A6A', 'A6B', 'A10', 'A12', 'A13', 'A14', 'A15', 'A86',
  'N1', 'N2', 'N3', 'N4', 'N7', 'N10', 'N104', 'N118', 'BP', 'Peripherique', 'Francilienne',
]

function geometryToWkt(geometry: GeoJSON.Geometry): string | null {
  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates
    return `SRID=4326;POINT(${lng} ${lat})`
  }
  if (geometry.type === 'LineString') {
    const points = geometry.coordinates.map(([lng, lat]) => `${lng} ${lat}`).join(',')
    return `SRID=4326;LINESTRING(${points})`
  }
  return null
}

export async function POST(req: NextRequest) {
  const start = Date.now()
  const secret = req.headers.get('X-Cron-Secret') || ''
  const expectedSecret = process.env.CRON_SECRET || 'dev-secret'
  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json(
      { status: 'error', error: 'Supabase is not configured for cron ingestion' },
      { status: 503 }
    )
  }

  try {
    const rawTweets = await scrapeSytadinIncidents()
    if (rawTweets.length === 0) {
      return NextResponse.json({
        status: 'success',
        inserted: 0,
        skipped: 0,
        errors: 0,
        raw_tweets: 0,
        duration_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
    }

    // Optional storage for raw traceability.
    await supabase
      .from('sytadin_raw_tweets')
      .upsert(
        rawTweets.map(tweet => ({
          tweet_id: tweet.id,
          content: tweet.text,
          tweet_created_at: new Date(tweet.created_at).toISOString(),
          source_url: `https://twitter.com/sytadin/status/${tweet.id}`,
        })),
        { onConflict: 'tweet_id', ignoreDuplicates: true }
      )

    let inserted = 0
    let skipped = 0
    let errors = 0

    for (const tweet of rawTweets) {
      try {
        const { data: existing, error: existingError } = await supabase
          .from('sytadin_incidents')
          .select('id')
          .eq('tweet_id', tweet.id)
          .limit(1)
        if (existingError) {
          errors++
          continue
        }
        if (existing && existing.length > 0) {
          skipped++
          continue
        }

        const parsed = parseIncident(tweet.text, IDF_CITIES, IDF_ROADS)
        if (!parsed) {
          skipped++
          continue
        }

        const geocoded = await geocodeIncident(parsed)
        if (!geocoded) {
          skipped++
          continue
        }

        const matched = await matchIncident(geocoded)
        if (!matched) {
          skipped++
          continue
        }

        const geometryWkt = geometryToWkt(matched.geometry)
        if (!geometryWkt) {
          skipped++
          continue
        }

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
            geometry: geometryWkt,
            confidence_parse: matched.confidence_parse,
            confidence_geocode: matched.match_confidence,
            status: /\[termine\]|\[terminee\]/i.test(tweet.text) ? 'resolved' : 'active',
            tweet_created_at: new Date(tweet.created_at).toISOString(),
            source: 'sytadin',
            source_url: `https://twitter.com/sytadin/status/${tweet.id}`,
          })

        if (insertError) {
          console.warn(`[Sytadin Cron] Insert failed for tweet ${tweet.id}: ${insertError.message}`)
          errors++
        } else {
          inserted++
        }
      } catch (error) {
        console.warn(`[Sytadin Cron] Error processing tweet ${tweet.id}:`, error)
        errors++
      }
    }

    return NextResponse.json({
      status: 'success',
      inserted,
      skipped,
      errors,
      raw_tweets: rawTweets.length,
      duration_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Sytadin Cron] Fatal error:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: String(error),
        duration_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
