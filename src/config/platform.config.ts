import type { MapLayerId, ScenarioType, OrgPlan } from '@/types'

export const platformConfig = {
  map: {
    defaultCityId:   'paris',
    pitch:           45,
    bearing:         0,
    layers:          ['traffic', 'heatmap', 'transport', 'incidents', 'prediction'] as MapLayerId[],
    transition: {
      durationMs: 1200,
      easing:     'ease-in-out',
    },
  },

  traffic: {
    refreshIntervalMs:  30_000,
    wsReconnectMs:       5_000,
    maxSegmentsPerCity: 5_000,
    congestionThresholds: {
      free:      { min: 0,    max: 0.30 },
      slow:      { min: 0.30, max: 0.60 },
      congested: { min: 0.60, max: 0.85 },
      critical:  { min: 0.85, max: 1.01 },
    },
    colors: {
      free:      '#00E676',
      slow:      '#FFD600',
      congested: '#FF6D00',
      critical:  '#FF1744',
    },
    lineWidths: {
      free:      2,
      slow:      2.5,
      congested: 3,
      critical:  4,
    },
  },

  heatmap: {
    radiusPx:  28,
    opacityStart: 0.0,
    opacityEnd:   0.85,
    blurPx:    20,
    colorStops: [
      [0,   'rgba(0,230,118,0)'],
      [0.2, 'rgba(0,230,118,0.5)'],
      [0.4, 'rgba(255,214,0,0.7)'],
      [0.6, 'rgba(255,109,0,0.85)'],
      [0.8, 'rgba(255,23,68,0.95)'],
      [1.0, 'rgba(255,23,68,1)'],
    ] as [number, string][],
  },

  prediction: {
    horizonMinutes:    30,
    refreshIntervalMs: 60_000,
    confidenceThreshold: 0.70,
    alertCongestionAbove: 0.80,
  },

  simulation: {
    maxDurationHours: 8,
    engineDelayMs:    1_500, // simulated compute time
    scenarioTypes:    [
      'road_closure',
      'traffic_light',
      'bike_lane',
      'speed_limit',
      'public_transport',
      'event',
    ] as ScenarioType[],
    scenarioConfig: {
      road_closure: {
        label:       'Fermeture de voie',
        description: 'Bloquer un ou plusieurs axes routiers',
        icon:        'ban',
        impact:      { congestion: +0.18, travelTime: +0.22, pollution: +0.15 },
      },
      traffic_light: {
        label:       'Feux intelligents',
        description: 'Optimiser la durée des phases de signalisation',
        icon:        'traffic-cone',
        impact:      { congestion: -0.12, travelTime: -0.08, pollution: -0.06 },
      },
      bike_lane: {
        label:       'Piste cyclable',
        description: 'Convertir une voie en infrastructure vélo protégée',
        icon:        'bike',
        impact:      { congestion: +0.05, travelTime: +0.03, pollution: -0.12 },
      },
      speed_limit: {
        label:       'Limitation de vitesse',
        description: 'Abaisser ou relever la vitesse maximale autorisée',
        icon:        'gauge',
        impact:      { congestion: +0.04, travelTime: +0.08, pollution: -0.09 },
      },
      public_transport: {
        label:       'Nouvelle ligne TC',
        description: 'Ajouter ou prolonger une ligne de bus ou de métro',
        icon:        'train',
        impact:      { congestion: -0.20, travelTime: -0.15, pollution: -0.22 },
      },
      event: {
        label:       'Événement majeur',
        description: 'Simuler un concert, un match ou une manifestation',
        icon:        'calendar',
        impact:      { congestion: +0.25, travelTime: +0.30, pollution: +0.20 },
      },
    },
  },

  kpi: {
    snapshotIntervalMs:  60_000,
    dashboardRefreshMs:  30_000,
    chartHistoryPoints:  48, // 24h at 30min intervals
    targets: {
      congestion_rate:      { good: 0.40, warning: 0.65, critical: 0.80 },
      avg_travel_time_min:  { good: 20,   warning: 30,   critical: 45  },
      pollution_index:      { good: 3.0,  warning: 6.0,  critical: 8.0 },
    },
  },

  plans: {
    starter: {
      features:       ['live_traffic', 'heatmap', 'dashboard'],
      maxCities:       3,
      historyDays:    30,
      maxSimulations:  0,
    },
    pro: {
      features:       ['live_traffic', 'heatmap', 'dashboard', 'prediction', 'simulation'],
      maxCities:      10,
      historyDays:    90,
      maxSimulations: 10,
    },
    enterprise: {
      features:       ['all'],
      maxCities:      -1,
      historyDays:    365,
      maxSimulations: -1,
    },
  } as Record<OrgPlan, { features: string[]; maxCities: number; historyDays: number; maxSimulations: number }>,

  api: {
    tomtom: {
      baseUrl:  'https://api.tomtom.com',
      apiKey:   process.env.NEXT_PUBLIC_TOMTOM_API_KEY ?? '',
      flowZoom: 16,
      tileSize: 256,
    },
  },
} as const

export type PlatformConfig = typeof platformConfig
