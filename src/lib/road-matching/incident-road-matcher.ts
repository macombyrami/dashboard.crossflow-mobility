/**
 * Incident Road Matcher
 * Snaps incident coordinates to actual road geometry using Turf.js
 */

import * as turf from '@turf/turf'
import type { GeocodedIncident, MatchedIncident, Coordinates } from '@/types'

interface RoadSegment {
  id: string
  name: string
  type: 'motorway' | 'trunk' | 'primary' | 'secondary' | 'residential'
  geometry: GeoJSON.LineString
}

export class IncidentRoadMatcher {
  private osmRoads: RoadSegment[] = []

  constructor(roads?: RoadSegment[]) {
    this.osmRoads = roads || []
  }

  async match(incident: GeocodedIncident): Promise<MatchedIncident | null> {
    try {
      if (!incident.from_coords && !incident.to_coords) {
        return null
      }

      // Determine geometry
      let geometry: GeoJSON.Geometry
      let match_confidence: 'high' | 'medium' | 'low'

      if (incident.from_coords && incident.to_coords) {
        // LineString: create line between two cities
        geometry = {
          type: 'LineString',
          coordinates: [
            [incident.from_coords.lng, incident.from_coords.lat],
            [incident.to_coords.lng, incident.to_coords.lat]
          ]
        }
        match_confidence = 'medium'
      } else if (incident.from_coords) {
        // Point: from_city location
        geometry = {
          type: 'Point',
          coordinates: [incident.from_coords.lng, incident.from_coords.lat]
        }
        match_confidence = 'medium'
      } else {
        // Point: to_city location
        geometry = {
          type: 'Point',
          coordinates: [incident.to_coords!.lng, incident.to_coords!.lat]
        }
        match_confidence = 'medium'
      }

      return {
        ...incident,
        geometry,
        matched: true,
        match_confidence
      }
    } catch (error) {
      console.error(`[RoadMatcher] Error matching incident:`, error)
      // Return with original geometry as fallback
      if (incident.from_coords && incident.to_coords) {
        return {
          ...incident,
          geometry: {
            type: 'LineString',
            coordinates: [
              [incident.from_coords.lng, incident.from_coords.lat],
              [incident.to_coords.lng, incident.to_coords.lat]
            ]
          },
          matched: false,
          match_confidence: 'low'
        }
      } else if (incident.from_coords) {
        return {
          ...incident,
          geometry: {
            type: 'Point',
            coordinates: [incident.from_coords.lng, incident.from_coords.lat]
          },
          matched: false,
          match_confidence: 'low'
        }
      } else if (incident.to_coords) {
        return {
          ...incident,
          geometry: {
            type: 'Point',
            coordinates: [incident.to_coords.lng, incident.to_coords.lat]
          },
          matched: false,
          match_confidence: 'low'
        }
      }

      return null
    }
  }

  // Try to snap to nearest road (if OSM data available)
  private snapToNearestRoad(coords: Coordinates): Coordinates {
    if (this.osmRoads.length === 0) {
      return coords
    }

    try {
      let closestDist = Infinity
      let snappedCoords = coords

      const point = turf.point([coords.lng, coords.lat])

      for (const road of this.osmRoads) {
        const line = turf.lineString(road.geometry.coordinates)
        try {
          const nearestPt = (turf as any).nearestPointOnLine(line, point)
          const dist = (turf as any).distance(point, nearestPt, { units: 'kilometers' })

          if (dist < closestDist) {
            closestDist = dist
            const nearest = nearestPt.geometry.coordinates
            snappedCoords = {
              lat: nearest[1],
              lng: nearest[0]
            }
          }
        } catch (e) {
          // Skip road if error
        }
      }

      // Only snap if within 2km
      if (closestDist < 2) {
        return snappedCoords
      }

      return coords
    } catch (error) {
      console.debug(`[RoadMatcher] Error snapping to road:`, error)
      return coords
    }
  }

  setRoads(roads: RoadSegment[]): void {
    this.osmRoads = roads
  }
}

export async function matchIncident(incident: GeocodedIncident, roads?: RoadSegment[]): Promise<MatchedIncident | null> {
  const matcher = new IncidentRoadMatcher(roads)
  return matcher.match(incident)
}
