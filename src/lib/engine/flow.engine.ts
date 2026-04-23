/**
 * Traffic Flow Visualization Engine
 *
 * Generates animated flow glyphs from traffic segments to visualize
 * vehicle movement and traffic intensity on the map.
 *
 * Features:
 * - Animated directional arrows showing traffic direction
 * - Intensity-based symbol density (more vehicles = more arrows)
 * - Performance optimized with simplified arrow geometry
 * - Mobile fallback support (no animation needed, just positioning)
 */

import type { TrafficSegment, TrafficSnapshot } from '@/types'
import GeoJSON from 'geojson'

interface FlowArrowConfig {
  /** Distance between arrows in meters */
  spacing: number
  /** Size of arrow glyph in meters (simplified representation) */
  arrowSize: number
  /** Opacity multiplier for flow intensity */
  opacityFactor: number
  /** Rotation based on segment direction */
  bearing: number
}

/**
 * Calculate bearing (direction in degrees) from coordinates
 * 0° = North, 90° = East, 180° = South, 270° = West
 */
function calculateBearing(start: [number, number], end: [number, number]): number {
  const [lng1, lat1] = start
  const [lng2, lat2] = end
  const dLng = lng2 - lng1
  const y = Math.sin((dLng * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180)
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos((dLng * Math.PI) / 180)
  const bearing = (Math.atan2(y, x) * 180) / Math.PI
  return (bearing + 360) % 360
}

/**
 * Calculate distance between two coordinates in meters (simplified)
 */
function calculateDistance(c1: [number, number], c2: [number, number]): number {
  const R = 6371000 // Earth radius in meters
  const lat1 = (c1[1] * Math.PI) / 180
  const lat2 = (c2[1] * Math.PI) / 180
  const dLat = ((c2[1] - c1[1]) * Math.PI) / 180
  const dLng = ((c2[0] - c1[0]) * Math.PI) / 180

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Interpolate a point along a line at a specific distance
 */
function interpolatePoint(
  coordinates: [number, number][],
  targetDistance: number
): [number, number] | null {
  let currentDistance = 0

  for (let i = 0; i < coordinates.length - 1; i++) {
    const segmentDistance = calculateDistance(coordinates[i], coordinates[i + 1])

    if (currentDistance + segmentDistance >= targetDistance) {
      const remainingDistance = targetDistance - currentDistance
      const ratio = segmentDistance > 0 ? remainingDistance / segmentDistance : 0
      return [
        coordinates[i][0] + (coordinates[i + 1][0] - coordinates[i][0]) * ratio,
        coordinates[i][1] + (coordinates[i + 1][1] - coordinates[i][1]) * ratio,
      ]
    }

    currentDistance += segmentDistance
  }

  return null
}

/**
 * Calculate total length of a line
 */
function calculateLineLength(coordinates: [number, number][]): number {
  let total = 0
  for (let i = 0; i < coordinates.length - 1; i++) {
    total += calculateDistance(coordinates[i], coordinates[i + 1])
  }
  return total
}

/**
 * Determine arrow spacing based on traffic intensity
 * More vehicles = more frequent arrows
 */
function getArrowSpacing(flowVehiclesPerHour: number): number {
  // Scale: 0 vehicles → 500m spacing, 3000+ vehicles → 50m spacing
  const maxVehicles = 3000
  const normalizedFlow = Math.min(1, flowVehiclesPerHour / maxVehicles)
  const minSpacing = 50 // meters
  const maxSpacing = 500 // meters
  return maxSpacing - normalizedFlow * (maxSpacing - minSpacing)
}

/**
 * Determine arrow opacity based on traffic intensity
 * More vehicles = more opaque
 */
function getFlowOpacity(flowVehiclesPerHour: number, baseOpacity: number = 0.6): number {
  const maxVehicles = 2000
  const normalizedFlow = Math.min(1, flowVehiclesPerHour / maxVehicles)
  const minOpacity = 0.2
  return minOpacity + normalizedFlow * (baseOpacity - minOpacity)
}

/**
 * Generate flow arrow features from a traffic segment
 * Returns a FeatureCollection of point features representing arrows along the segment
 */
function generateSegmentFlows(
  segment: TrafficSegment,
  animationPhase: number = 0 // 0-1, used for continuous animation
): GeoJSON.Feature[] {
  const features: GeoJSON.Feature[] = []

  if (segment.coordinates.length < 2) {
    return features
  }

  const lineLength = calculateLineLength(segment.coordinates)
  const spacing = getArrowSpacing(segment.flowVehiclesPerHour)
  const opacity = getFlowOpacity(segment.flowVehiclesPerHour)
  const bearing = calculateBearing(
    segment.coordinates[0],
    segment.coordinates[segment.coordinates.length - 1]
  )

  // Generate arrow positions along the segment
  for (let distance = spacing * animationPhase; distance < lineLength; distance += spacing) {
    const point = interpolatePoint(segment.coordinates, distance)

    if (point) {
      features.push({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: point,
        },
        properties: {
          id: `${segment.id}-flow-${distance}`,
          segmentId: segment.id,
          flowVehicles: segment.flowVehiclesPerHour,
          opacity,
          bearing,
          speed: segment.speedKmh,
          size: Math.max(8, Math.min(24, 12 + opacity * 12)), // Scale size by intensity
        },
      })
    }
  }

  return features
}

/**
 * Generate all flow features from a traffic snapshot
 * This is the main entry point for the flow visualization engine
 */
export function generateFlowFeatures(
  snapshot: TrafficSnapshot | null,
  animationPhase: number = 0 // 0-1 value for continuous animation loop
): GeoJSON.FeatureCollection {
  if (!snapshot || !snapshot.segments.length) {
    return {
      type: 'FeatureCollection' as const,
      features: [],
    }
  }

  const allFeatures: GeoJSON.Feature[] = []

  for (const segment of snapshot.segments) {
    const flows = generateSegmentFlows(segment, animationPhase)
    allFeatures.push(...flows)
  }

  return {
    type: 'FeatureCollection' as const,
    features: allFeatures,
  }
}

/**
 * Create an animated flow dataset for a single frame
 * Use this in conjunction with requestAnimationFrame for smooth animation
 */
export function createAnimationFrame(
  snapshot: TrafficSnapshot | null,
  frameNumber: number,
  framesPerCycle: number = 60 // 60 frames = 1 second cycle
): GeoJSON.FeatureCollection {
  const phase = (frameNumber % framesPerCycle) / framesPerCycle
  return generateFlowFeatures(snapshot, phase)
}

/**
 * Generate flow visualization as SVG symbols for MapLibre rendering
 * This creates visual arrows that can be used as marker images
 */
export function createFlowArrowSVG(
  size: number = 16,
  color: string = '#22C55E',
  opacity: number = 0.8
): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <defs>
        <style>
          @keyframes pulse-flow {
            0%, 100% { opacity: ${opacity}; }
            50% { opacity: ${opacity * 0.5}; }
          }
        </style>
      </defs>
      <polygon
        points="12,2 22,16 16,16 16,22 8,22 8,16 2,16"
        fill="${color}"
        opacity="${opacity}"
        style="animation: pulse-flow 1.5s ease-in-out infinite;"
      />
    </svg>
  `
  return encodeURIComponent(svg)
}

/**
 * Generate a heatmap-style flow gradient layer that shows intensity
 * This is a lighter alternative that shows density without individual arrows
 */
export function generateFlowDensityLayer(
  snapshot: TrafficSnapshot | null
): GeoJSON.FeatureCollection {
  if (!snapshot || !snapshot.segments.length) {
    return {
      type: 'FeatureCollection' as const,
      features: [],
    }
  }

  // Group segments by proximity and aggregate flow data
  return {
    type: 'FeatureCollection' as const,
    features: snapshot.segments.map(seg => ({
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: seg.coordinates,
      },
      properties: {
        id: seg.id,
        flowVehicles: seg.flowVehiclesPerHour,
        // Normalize flow to 0-1 for visualization
        flowIntensity: Math.min(1, seg.flowVehiclesPerHour / 3000),
        opacity: getFlowOpacity(seg.flowVehiclesPerHour, 0.7),
      },
    })),
  }
}

/**
 * Update flow features with current animation state
 * This should be called periodically (every 16ms for 60fps animation)
 * or on demand for performance optimization
 */
export function updateFlowAnimation(
  snapshot: TrafficSnapshot | null,
  elapsedTimeMs: number,
  cycleDurationMs: number = 2000 // How long for flow to move across segment
): GeoJSON.FeatureCollection {
  const frameNumber = Math.floor((elapsedTimeMs % cycleDurationMs) / (cycleDurationMs / 60))
  return createAnimationFrame(snapshot, frameNumber, 60)
}
