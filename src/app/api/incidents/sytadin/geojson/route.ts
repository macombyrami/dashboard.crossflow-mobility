/**
 * Sytadin Incidents GeoJSON Endpoint
 * Returns real-time Sytadin incidents as GeoJSON
 */

import { createClient } from '@/lib/supabase/server'
import type { GeoJSON } from 'geojson'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic' // Dynamic server rendering to use cookies in request context
export const revalidate = 30 // 30 second cache

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Query active Sytadin incidents
    const { data: incidents, error } = await supabase
      .from('sytadin_incidents')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      throw new Error(`Supabase error: ${error.message}`)
    }

    if (!incidents || incidents.length === 0) {
      const emptyGeoJSON: GeoJSON = {
        type: 'FeatureCollection',
        features: []
      }
      return NextResponse.json(emptyGeoJSON, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          'Content-Type': 'application/geo+json'
        }
      })
    }

    // Build FeatureCollection
    const features: GeoJSON.Feature[] = incidents
      .filter(i => i.geometry)
      .reduce((acc: GeoJSON.Feature[], incident) => {
        let geometry: GeoJSON.Geometry

        try {
          // Parse geometry if it's a string
          if (typeof incident.geometry === 'string') {
            geometry = JSON.parse(incident.geometry)
          } else {
            geometry = incident.geometry as GeoJSON.Geometry
          }
        } catch (e) {
          console.warn(`[GeoJSON] Failed to parse geometry for incident ${incident.id}:`, e)
          // Skip incidents with invalid geometry
          return acc
        }

        acc.push({
          type: 'Feature',
          geometry,
          properties: {
            id: incident.id,
            tweet_id: incident.tweet_id,
            type: incident.type,
            severity: incident.severity,
            road: incident.road,
            direction: incident.direction,
            from_city: incident.from_city,
            to_city: incident.to_city,
            description: incident.event_description,
            source: 'sytadin',
            confidence: {
              parse: incident.confidence_parse,
              geocode: incident.confidence_geocode
            },
            timestamp: incident.created_at,
            resolved_at: incident.resolved_at,
            status: incident.status
          }
        })
        return acc
      }, [])

    const geojson: GeoJSON = {
      type: 'FeatureCollection',
      features
    }

    return NextResponse.json(geojson, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'Content-Type': 'application/geo+json'
      }
    })
  } catch (error) {
    console.error('[Sytadin GeoJSON] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate GeoJSON',
        type: 'FeatureCollection',
        features: []
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/geo+json'
        }
      }
    )
  }
}
