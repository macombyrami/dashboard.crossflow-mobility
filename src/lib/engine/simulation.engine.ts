/**
 * CrossFlow Simulation Engine
 * Uses real IDF road data from /api/idf-roads for affected segments.
 * Impact factors loaded from platformConfig.
 */
import type { SimulationScenario, SimulationResult, City } from '@/types'
import { platformConfig } from '@/config/platform.config'
import { generateCityKPIs } from './traffic.engine'

let simCounter = 0

// ── IDF road segment (from /api/idf-roads) ────────────────────────────────

interface IdfRoadFeature {
  properties: {
    id: string
    frc: number
    roadName: string
    roadNumber: string
    county: string
    miles: number
    lanes: number
  }
}

/**
 * Fetch real IDF road segments relevant to the scenario.
 * FRC selection depends on scenario type:
 *   road_closure / public_transport → highways (FRC 1-2)
 *   traffic_light / speed_limit     → arterials (FRC 2-3)
 *   bike_lane / event               → local (FRC 3-5)
 */
async function fetchIdfSegments(
  city: City,
  scenarioType: SimulationScenario['type'],
  magnitude: number,
): Promise<IdfRoadFeature[]> {
  const frcByType: Record<SimulationScenario['type'], string> = {
    road_closure:     '1,2',
    public_transport: '1,2',
    traffic_light:    '2,3',
    speed_limit:      '2,3',
    bike_lane:        '3,4,5',
    event:            '3,4',
  }

  const frc = frcByType[scenarioType] ?? '2,3'
  // Limit scales with magnitude: more intense → more roads affected
  const limit = Math.round(80 + magnitude * 120)

  // Build bbox from city center (±0.15° ≈ ±15 km)
  const d    = 0.15
  const bbox = [
    city.center.lng - d,
    city.center.lat - d,
    city.center.lng + d,
    city.center.lat + d,
  ].join(',')

  try {
    const res = await fetch(
      `/api/idf-roads?frc=${frc}&bbox=${bbox}&limit=${limit}&minMiles=0.02`,
      { cache: 'force-cache' },
    )
    if (!res.ok) return []
    const geojson = await res.json() as { features: IdfRoadFeature[] }
    return geojson.features ?? []
  } catch {
    return []
  }
}

/** Pick a deterministic-ish subset of segments as "directly affected". */
function selectAffected(
  segments: IdfRoadFeature[],
  magnitude: number,
  seed: number,
): IdfRoadFeature[] {
  if (!segments.length) return []
  const ratio   = Math.min(0.85, 0.2 + magnitude * 0.3)
  const count   = Math.max(5, Math.round(segments.length * ratio))
  // Pseudo-shuffle with seed
  const sorted  = [...segments].sort((a, b) =>
    ((parseInt(a.properties.id, 10) * seed) % 997) -
    ((parseInt(b.properties.id, 10) * seed) % 997),
  )
  return sorted.slice(0, count)
}

/** Build a human-readable summary of affected roads. */
function buildRoadSummary(segments: IdfRoadFeature[]): string {
  const named = segments
    .map(s => s.properties.roadName || s.properties.roadNumber)
    .filter(Boolean)
  const unique = [...new Set(named)].slice(0, 5)
  return unique.join(', ')
}

// ── Main export ───────────────────────────────────────────────────────────

export async function runSimulation(
  city:       City,
  scenario:   SimulationScenario,
  onProgress: (pct: number) => void,
): Promise<SimulationResult> {
  const id       = `sim-${Date.now()}-${++simCounter}`
  const baseline = generateCityKPIs(city)

  const magnitude: number =
    typeof scenario.params.magnitude === 'number'
      ? Math.max(0.3, Math.min(2.0, scenario.params.magnitude))
      : 1.0

  // Step 1 — fetch real IDF segments (30%)
  onProgress(10)
  const allSegments = await fetchIdfSegments(city, scenario.type, magnitude)
  onProgress(30)

  // Step 2 — select affected subset
  const affected = selectAffected(allSegments, magnitude, simCounter)
  onProgress(50)

  // Step 3 — compute metrics
  const cfg    = platformConfig.simulation.scenarioConfig[scenario.type]
  const impact = cfg?.impact ?? { congestion: 0, travelTime: 0, pollution: 0 }

  const durationFactor  = Math.log1p(scenario.durationHours) / Math.log1p(8)
  const effectiveCong   = impact.congestion  * magnitude * durationFactor
  const effectiveTravel = impact.travelTime  * magnitude * durationFactor
  const effectivePoll   = impact.pollution   * magnitude * durationFactor

  // Realistic km of affected network
  const affectedKm = affected.reduce(
    (s, seg) => s + seg.properties.miles * 1.60934, 0,
  )

  onProgress(75)
  await new Promise(r => setTimeout(r, platformConfig.simulation.engineDelayMs * 0.25))
  onProgress(90)

  const afterCongestion = Math.max(0.02, Math.min(1, baseline.congestionRate + effectiveCong))
  const afterTravel     = Math.max(5, baseline.avgTravelMin * (1 + effectiveTravel))
  const afterPollution  = Math.max(0, Math.min(10, baseline.pollutionIndex + effectivePoll * 8))

  // Alt paths: fewer when roads are blocked, more when rerouted
  const altPaths = scenario.type === 'road_closure' || scenario.type === 'public_transport'
    ? Math.max(1, Math.round(3 + magnitude * 2))
    : Math.round(2 + magnitude * 3)

  onProgress(100)
  await new Promise(r => setTimeout(r, 150))

  const roadSummary = buildRoadSummary(affected)
  const affectedIds = affected.slice(0, 8).map(seg => seg.properties.id)
  const normalDistance = Math.max(1800, Math.round(affectedKm * 800 + 3500))
  const normalTime = Math.max(240, Math.round(normalDistance / 11.5))
  const simulatedDistance = Math.round(normalDistance * (1 + Math.min(0.35, magnitude * 0.04)))
  const simulatedTime = Math.round(normalTime * (1 + Math.min(0.65, Math.abs(effectiveTravel) * 1.6)))

  return {
    id,
    scenarioName: scenario.name,
    status:       'completed',
    progress:     100,
    before: {
      congestionRate:   baseline.congestionRate,
      avgTravelMin:     baseline.avgTravelMin,
      pollutionIndex:   baseline.pollutionIndex,
      affectedSegments: allSegments.length || Math.round(30 + magnitude * 20),
    },
    after: {
      congestionRate:   Math.round(afterCongestion * 100) / 100,
      avgTravelMin:     Math.round(afterTravel * 10) / 10,
      pollutionIndex:   Math.round(afterPollution * 10) / 10,
      affectedSegments: affected.length || Math.round(15 + magnitude * 30),
    },
    delta: {
      congestionPct:  Math.round(effectiveCong   * 100),
      travelTimePct:  Math.round(effectiveTravel * 100),
      pollutionPct:   Math.round(effectivePoll   * 100),
    },
    alternativePaths: altPaths,
    completedAt:      new Date().toISOString(),
    predictive: {
      normal: {
        total_distance_m: normalDistance,
        total_time_s: normalTime,
      },
      simulated: {
        total_distance_m: simulatedDistance,
        total_time_s: simulatedTime,
      },
      delta: {
        distance_m: simulatedDistance - normalDistance,
        time_s: simulatedTime - normalTime,
        avoided_edges: affectedIds.slice(0, 4),
        added_edges: affectedIds.slice(4, 8),
      },
    },
    // Extra IDF-specific metadata (stored in result for display)
    meta: {
      affectedKm:   Math.round(affectedKm * 10) / 10,
      roadSummary,
      dataSource:   allSegments.length > 0 ? 'IDF GeoJSON (réel)' : 'Synthétique',
      segmentCount: allSegments.length,
    },
  } as SimulationResult & { meta: Record<string, unknown> }
}

export function buildScenarioTemplates() {
  return Object.entries(platformConfig.simulation.scenarioConfig).map(([type, cfg]) => ({
    type:        type as keyof typeof platformConfig.simulation.scenarioConfig,
    label:       cfg.label,
    description: cfg.description,
    icon:        cfg.icon,
  }))
}
