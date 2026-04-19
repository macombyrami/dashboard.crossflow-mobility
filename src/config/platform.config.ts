import type { MapLayerId, ScenarioType, OrgPlan } from '@/types'
import platformData from '@/lib/data/platform.json'
import scenariosData from '@/lib/data/scenarios.json'

export const platformConfig = {
  map: {
    defaultCityId: platformData.map.defaultCityId,
    pitch:         platformData.map.pitch,
    bearing:       platformData.map.bearing,
    layers:        platformData.map.layers as MapLayerId[],
    transition:    platformData.map.transition,
  },

  traffic: {
    refreshIntervalMs:    platformData.traffic.refreshIntervalMs,
    wsReconnectMs:        platformData.traffic.wsReconnectMs,
    maxSegmentsPerCity:   platformData.traffic.maxSegmentsPerCity,
    congestionThresholds: platformData.traffic.congestionThresholds,
    colors:               platformData.traffic.colors,
    lineWidths:           platformData.traffic.lineWidths,
  },

  heatmap: {
    radiusPx:     platformData.heatmap.radiusPx,
    opacityStart: platformData.heatmap.opacityStart,
    opacityEnd:   platformData.heatmap.opacityEnd,
    blurPx:       platformData.heatmap.blurPx,
    colorStops:   platformData.heatmap.colorStops as [number, string][],
  },

  prediction: platformData.prediction,

  simulation: {
    maxDurationHours: platformData.simulation.maxDurationHours,
    engineDelayMs:    platformData.simulation.engineDelayMs,
    scenarioTypes:    scenariosData.types as ScenarioType[],
    scenarioConfig:   scenariosData.config,
  },

  kpi: platformData.kpi,

  plans: platformData.plans as Record<OrgPlan, { features: string[]; maxCities: number; historyDays: number; maxSimulations: number }>,

  api: {
    tomtom: {
      baseUrl:  platformData.api.tomtom.baseUrl,
      // apiKey removed — now server-side only via /api/tomtom/* proxies
      flowZoom: platformData.api.tomtom.flowZoom,
      tileSize: platformData.api.tomtom.tileSize,
    },
  },
} as const

export type PlatformConfig = typeof platformConfig
