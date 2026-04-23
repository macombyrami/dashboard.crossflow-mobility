/**
 * StreetMapper
 * 🌐 Bridges TomTom IDs with Real-World OSM street names and metadata
 */
import type { TrafficSegment } from '@/types'

// Partial Paris/Urban Area dictionary (would eventually be server-side / Neo4j)
const STREET_DICTIONARY: Record<string, { street: string; axis?: string; arrondissement?: string }> = {
  'A86': { street: 'Autoroute A86', axis: 'Périphérique Extérieur' },
  'BP':  { street: 'Boulevard Périphérique', axis: 'Périphérique' },
  'rivoli': { street: 'Rue de Rivoli', axis: 'Axe Historique', arrondissement: '1er arr.' },
  'opera':  { street: 'Avenue de l\'Opéra', axis: 'Centre-Ville', arrondissement: '2e arr.' },
  'stmichel': { street: 'Boulevard Saint-Michel', axis: 'Axe Nord-Sud', arrondissement: '5e arr.' },
  'sebastopol': { street: 'Boulevard de Sébastopol', axis: 'Axe Nord-Sud', arrondissement: '1er arr.' },
  'champs': { street: 'Avenue des Champs-Élysées', axis: 'Étoile-Concorde', arrondissement: '8e arr.' },
}

import { findArrondissement } from '@/lib/data/paris_districts'

/**
 * Enriches a segment with real-world metadata based on ID or spatial centroid logic.
 * V4: Adds administrative zone detection (Arrondissements).
 */
export function enrichSegmentWithStreetMetadata(segment: TrafficSegment): TrafficSegment {
  const s = { ...segment }
  const mid = s.coordinates[Math.floor(s.coordinates.length / 2)] || [0, 0]
  
  // 1. Try reverse-search by segment ID keywords
  const lowerId = (s.id || '').toLowerCase()
  for (const [key, meta] of Object.entries(STREET_DICTIONARY)) {
    if (lowerId.includes(key)) {
      s.streetName     = meta.street
      s.axisName       = meta.axis
      s.arrondissement = meta.arrondissement || s.arrondissement
      return s
    }
  }

  // 2. Spatial Admin Check (V4 GIS Requirement)
  if (!s.arrondissement && mid[0] !== 0) {
    const arr = findArrondissement(mid[0], mid[1])
    if (arr) s.arrondissement = arr.name
  }

  // 3. Generic heuristics if no match
  if (!s.streetName) {
    if (s.roadType === 'motorway') s.streetName = 'Autoroute / Voie Rapide'
    else if (s.roadType === 'trunk') s.streetName = 'Axe Majeur'
    else s.streetName = 'Axe Urbain'
  }

  return s
}

/**
 * Interpolation logic for gaps between segments (Turf-based)
 */
export function interpolateTrafficGaps(segments: TrafficSegment[]): TrafficSegment[] {
  // Logic to fill holes in TomTom data by copying nearby segment properties
  // Implementation in Phase 2 with full graph support
  return segments
}
