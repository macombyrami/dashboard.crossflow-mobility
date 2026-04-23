'use client'
import { useEffect, useRef, useCallback, useState, useMemo, memo } from 'react'
import { usePathname } from 'next/navigation'

import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { useThemeStore } from '@/store/themeStore'
import { useSimulationStore } from '@/store/simulationStore'
import { SIMULATION_INTERACTION_MODE } from '@/store/simulationStore'
import { simulationService } from '@/lib/services/SimulationService'
import { predictiveApi } from '@/lib/api/predictive'
import { platformConfig } from '@/config/platform.config'
import { congestionColor, scoreToCongestionLevel } from '@/lib/utils/congestion'
import { cn } from '@/lib/utils/cn'
import { AlertTriangle, Minus, Plus } from 'lucide-react'
import { VehicleInfoCard } from '@/components/map/VehicleInfoCard'
import { VehicleFilterPanel } from '@/components/map/VehicleFilterPanel'
import { MapSplitSlider } from '@/components/map/MapSplitSlider'
import { LiveSyncBadge } from '@/components/dashboard/LiveSyncBadge'
import { LayerControls } from '@/components/map/controls/LayerControls'
import { MapLegend } from '@/components/map/MapLegend'
import { getSnapshots, saveSnapshot } from '@/lib/api/snapshots'
import { toast } from 'sonner'
import { GeolocationControl } from '@/components/map/controls/GeolocationControl'
import type { UserPosition } from '@/hooks/useGeolocation'

import {
  generateTrafficSnapshot,
  generateIncidents,
  generateCityKPIs,
} from '@/lib/engine/traffic.engine'
import {
  fetchTrafficPOIs,
  fetchRouteGeometries,
  fetchMetroStations,
} from '@/lib/api/overpass'
import {
  fetchSytadinKPIs,
  generateSytadinKPIs,
  generateSytadinTravelTimes,
  fetchAndInjectSytadinIncidents,
} from '@/lib/engine/sytadin.engine'
import type { OSMPOIPoint, OSMRouteGeometry, MetroStation } from '@/lib/api/overpass'
import { fetchAllTrafficStatus, LINE_COLORS } from '@/lib/api/ratp'
import { simulateTransitVehicles, type TransitVehicle } from '@/lib/engine/transit.engine'
import {
  getTrafficFlowTileUrl,
  getTrafficIncidentTileUrl,
  fetchFlowSegment,
  fetchIncidents as fetchTomTomIncidents,
  tomtomSeverityToLocal,
} from '@/lib/api/tomtom'
import { fetchHereFlow, hasKey as hereHasKey, jamFactorToCongestion, type HereFlowSegment } from '@/lib/api/here'
import { fetchWeather as fetchOpenMeteoWeather, fetchAirQuality } from '@/lib/api/openmeteo'
import { fetchCityBoundary, fetchCityDistricts } from '@/lib/api/geocoding'
import type { AggregatedHeatFeatureCollection } from '@/lib/map/trafficHeatmap'
import { decompressJSON } from '@/lib/utils/compression'
import { useSocialStore } from '@/store/socialStore'
import type { Incident, HeatmapMode, CongestionLevel, TrafficSnapshot, TrafficSegment, MapLayerId, QuickFilterId, City } from '@/types'

const TRAFFIC_SOURCE          = 'cf-traffic'
const TRAFFIC_PREDICTION_SOURCE = 'cf-traffic-prediction'
const TRAFFIC_ZONE_SOURCE     = 'cf-traffic-zones'
const TRAFFIC_FLOW_SOURCE     = 'cf-traffic-flow'
const TRAFFIC_SELECTION_SOURCE = 'cf-traffic-selection'
const TRAFFIC_HOVER_SOURCE    = 'cf-traffic-hover'
const TRAFFIC_FOCUS_SOURCE    = 'cf-traffic-focus'
const HEATMAP_SOURCE          = 'cf-heatmap'
const HEATMAP_FADE_SOURCE     = 'cf-heatmap-fade'
const HEATMAP_PASSAGES_SOURCE = 'cf-heatmap-passages'
const HEATMAP_CO2_SOURCE      = 'cf-heatmap-co2'
const INCIDENT_SOURCE         = 'cf-incidents'
const INCIDENT_CRITICAL_SOURCE = 'cf-incidents-critical'
const TOMTOM_FLOW             = 'tomtom-flow'
const TOMTOM_INC              = 'tomtom-incidents'
const BOUNDARY_SOURCE         = 'city-boundary'
const DISTRICTS_SOURCE        = 'city-districts'
const ENTRY_EXIT_SOURCE       = 'city-entry-exit'
const ZONE_SOURCE             = 'cf-zone'
const ZONE_DRAFT_SOURCE       = 'cf-zone-draft'
const POI_SOURCE              = 'cf-pois'
const VEHICLES_SOURCE         = 'cf-vehicles'
const VEHICLE_TRAILS_SOURCE   = 'cf-vehicle-trails'
const METRO_STATIONS_SOURCE   = 'cf-metro-stations'
const TRANSIT_ROUTES_SOURCE   = 'cf-transit-routes'
const PREDICTIVE_AFFECTED_SOURCE = 'cf-pred-affected'
const PREDICTIVE_EVENTS_SOURCE   = 'cf-pred-events'
const SIM_LOCATION_SOURCE        = 'cf-sim-location'
const SOCIAL_SOURCE              = 'cf-social'
const WORLD_MASK_SOURCE           = 'cf-world-mask'
const BASE_NETWORK_SOURCE         = 'mapbox-streets'
const BASE_WATER_LAYER            = 'base-water'
const BASE_LANDUSE_LAYER          = 'base-landuse'
const BASE_BUILDINGS_LAYER        = 'base-buildings'
const FULL_ROAD_LAYER             = 'road-full'
const ROAD_LABELS_LAYER           = 'road-labels'
const DEBUG_ROAD_COLOR = '#22C55E'
const ROAD_MAIN_CLASSES = ['motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary'] as const
const FULL_ROAD_CLASSES = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'street', 'street_limited', 'service', 'residential', 'living_street'] as const


// ─── Popup helpers ────────────────────────────────────────────────────────

/** Return black or white text depending on background luminance */
function textOnBg(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length < 6) return '#000'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#000' : '#fff'
}

/** Cardinal direction label from bearing in degrees */
function bearingLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  return dirs[Math.round(deg / 45) % 8]
}

const TYPE_LABEL: Record<string, string> = {
  subway:   'Métro',
  tram:     'Tramway',
  bus:      'Bus',
  train:    'RER / Train',
  ferry:    'Ferry',
  monorail: 'Monorail',
}

const METRO_HUBS = [
  'Châtelet', 'Gare du Nord', 'Gare de Lyon', 'Montparnasse', 'Saint-Lazare',
  'La Défense', 'Auber', 'Les Halles', 'Charles de Gaulle', 'Nation', 'République',
]


// Lightweight vector-first base style. The actual theme is applied dynamically.
const BASE_MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-light': {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'],
      tileSize: 256,
      attribution: '',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id:    'background-pure',
      type:  'background',
      paint: { 'background-color': '#F8F9FA' }
    },
    {
      id:     'carto-base',
      type:   'raster',
      source: 'carto-light',
      paint:  { 'raster-opacity': 1 },
    },
  ],
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
}

// ─── Map Helpers (Race Condition Protection) ───────────────────────

/** Wrap map properties to avoid 'undefined' crashes if layer/source not ready */
const safeSetPaintProperty = (map: maplibregl.Map | null, id: string, prop: string, val: any) => {
  if (map && map.getLayer(id)) map.setPaintProperty(id, prop, val)
}
const safeSetLayoutProperty = (map: maplibregl.Map | null, id: string, prop: string, val: any) => {
  if (map && map.getLayer(id)) map.setLayoutProperty(id, prop, val)
}
const safeGetSource = (map: maplibregl.Map | null, id: string) => {
  return (map && map.getSource(id)) ? map.getSource(id) : null
}
const safeSetFilter = (map: maplibregl.Map | null, id: string, filter: any) => {
  if (map && map.getLayer(id)) map.setFilter(id, filter)
}
const safeSetFeatureState = (map: maplibregl.Map | null, feat: { source: string, id: string | number }, state: any) => {
  if (map && map.getSource(feat.source)) map.setFeatureState(feat, state)
}

function roadClassExpression(): any {
  return ['coalesce', ['get', 'class'], ['get', 'type'], ['get', 'highway']]
}

function trafficRoadClassExpression(): any {
  return ['coalesce', ['get', 'roadType'], ['get', 'highway'], ['get', 'class']]
}

function isParisCity(city: City) {
  return city.id === 'paris' || city.name.toLowerCase() === 'paris'
}

function isCompactCity(city: City) {
  return !isParisCity(city) && city.population > 0 && city.population < 300000
}

function pointInRing(point: [number, number], ring: [number, number][]) {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

function pointInBoundary(point: [number, number], geometry: GeoJSON.Geometry | null | undefined) {
  if (!geometry) return false
  if (geometry.type === 'Polygon') {
    const [outerRing, ...holes] = geometry.coordinates as [number, number][][]
    return pointInRing(point, outerRing) && !holes.some(hole => pointInRing(point, hole))
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as [number, number][][][]).some(([outerRing, ...holes]) =>
      pointInRing(point, outerRing) && !holes.some(hole => pointInRing(point, hole))
    )
  }
  return false
}

const safeMoveLayerToTop = (map: maplibregl.Map | null, id: string) => {
  if (!map || !map.getLayer(id)) return
  try {
    map.moveLayer(id)
  } catch {
    // Ignore transient style ordering races during init.
  }
}

function applyTrafficRenderingHierarchy(map: maplibregl.Map | null) {
  if (!map) return

  const orderedLayers = [
    BASE_WATER_LAYER,
    BASE_LANDUSE_LAYER,
    BASE_BUILDINGS_LAYER,
    heatmapStackLayerId(HEATMAP_SOURCE, 'clusters'),
    heatmapStackLayerId(HEATMAP_SOURCE, 'cluster-count'),
    heatmapStackLayerId(HEATMAP_SOURCE, 'layer'),
    heatmapStackLayerId(HEATMAP_SOURCE, 'hotspots-glow'),
    heatmapStackLayerId(HEATMAP_SOURCE, 'hotspots'),
    heatmapStackLayerId(HEATMAP_SOURCE, 'labels'),
    heatmapStackLayerId(HEATMAP_SOURCE, 'circles'),
    heatmapStackLayerId(HEATMAP_FADE_SOURCE, 'clusters'),
    heatmapStackLayerId(HEATMAP_FADE_SOURCE, 'cluster-count'),
    heatmapStackLayerId(HEATMAP_FADE_SOURCE, 'layer'),
    heatmapStackLayerId(HEATMAP_FADE_SOURCE, 'hotspots-glow'),
    heatmapStackLayerId(HEATMAP_FADE_SOURCE, 'hotspots'),
    heatmapStackLayerId(HEATMAP_FADE_SOURCE, 'labels'),
    heatmapStackLayerId(HEATMAP_FADE_SOURCE, 'circles'),
    HEATMAP_PASSAGES_SOURCE + '-layer',
    HEATMAP_PASSAGES_SOURCE + '-circles',
    HEATMAP_CO2_SOURCE + '-layer',
    HEATMAP_CO2_SOURCE + '-circles',
    FULL_ROAD_LAYER,
    'cf-idf-roads-lines',
    ROAD_LABELS_LAYER,
    TRAFFIC_SOURCE + '-halo',
    TRAFFIC_SOURCE + '-lines',
    TRAFFIC_PREDICTION_SOURCE + '-lines',
    TRAFFIC_HOVER_SOURCE + '-glow',
    TRAFFIC_HOVER_SOURCE + '-line',
    TRAFFIC_FOCUS_SOURCE + '-glow',
    TRAFFIC_FOCUS_SOURCE + '-line',
    TRAFFIC_SELECTION_SOURCE + '-glow',
    TRAFFIC_SELECTION_SOURCE + '-line',
    TRAFFIC_SELECTION_SOURCE + '-label',
    TRAFFIC_FLOW_SOURCE + '-layer',
    DISTRICTS_SOURCE + '-fill',
    DISTRICTS_SOURCE + '-line',
    BOUNDARY_SOURCE + '-glow-outer',
    BOUNDARY_SOURCE + '-glow',
    BOUNDARY_SOURCE + '-fill',
    BOUNDARY_SOURCE + '-line',
    ENTRY_EXIT_SOURCE + '-halo',
    ENTRY_EXIT_SOURCE + '-circle',
    ENTRY_EXIT_SOURCE + '-label',
    INCIDENT_SOURCE + '-cluster-glow',
    INCIDENT_SOURCE + '-cluster',
    INCIDENT_SOURCE + '-count',
    INCIDENT_SOURCE + '-unclustered',
    DISTRICTS_SOURCE + '-label',
    BOUNDARY_SOURCE + '-label',
    INCIDENT_SOURCE + '-label',
    INCIDENT_CRITICAL_SOURCE + '-glow',
    INCIDENT_CRITICAL_SOURCE + '-dot',
    INCIDENT_CRITICAL_SOURCE + '-label',
  ]

  orderedLayers.forEach((layerId) => safeMoveLayerToTop(map, layerId))
}

function applyMapTheme(map: maplibregl.Map | null, theme: 'light' | 'dark') {
  if (!map) return
  const isLight = theme === 'light'

  safeSetPaintProperty(map, 'background-pure', 'background-color', isLight ? '#F4F6F8' : '#071018')
  safeSetPaintProperty(map, BASE_WATER_LAYER, 'fill-color', isLight ? '#D9EBFF' : '#10273B')
  safeSetPaintProperty(map, BASE_LANDUSE_LAYER, 'fill-color', isLight ? '#EEF3E6' : '#0D1C16')
  safeSetPaintProperty(map, BASE_BUILDINGS_LAYER, 'fill-color', isLight ? '#E6EAEE' : '#111C26')
  safeSetPaintProperty(map, BASE_BUILDINGS_LAYER, 'fill-opacity', isLight ? 0.72 : 0.42)
  safeSetPaintProperty(map, FULL_ROAD_LAYER, 'line-color', DEBUG_ROAD_COLOR)
  safeSetPaintProperty(map, FULL_ROAD_LAYER, 'line-opacity', 1)
  safeSetPaintProperty(map, ROAD_LABELS_LAYER, 'text-color', isLight ? '#4B5563' : '#C7D2DA')
  safeSetPaintProperty(map, ROAD_LABELS_LAYER, 'text-halo-color', isLight ? 'rgba(255,255,255,0.95)' : 'rgba(7,16,24,0.94)')

  safeSetPaintProperty(map, TRAFFIC_SOURCE + '-halo', 'line-color', isLight ? 'rgba(255,255,255,0.92)' : 'rgba(4,6,10,0.96)')
  safeSetPaintProperty(map, TRAFFIC_SOURCE + '-halo', 'line-opacity', isLight ? 0.42 : 0.56)
  safeSetPaintProperty(map, TRAFFIC_SELECTION_SOURCE + '-label', 'text-halo-color', isLight ? 'rgba(255,255,255,0.98)' : 'rgba(8,9,11,0.98)')
  safeSetPaintProperty(map, TRAFFIC_HOVER_SOURCE + '-line', 'line-color', isLight ? '#0F172A' : '#F8FAFC')
  safeSetPaintProperty(map, TRAFFIC_HOVER_SOURCE + '-glow', 'line-color', isLight ? '#38BDF8' : '#FFFFFF')
  safeSetPaintProperty(map, TRAFFIC_SOURCE + '-corridor-labels', 'text-color', isLight ? 'rgba(17,24,39,0.88)' : 'rgba(255,245,247,0.92)')
  safeSetPaintProperty(map, TRAFFIC_SOURCE + '-corridor-labels', 'text-halo-color', isLight ? 'rgba(255,255,255,0.96)' : 'rgba(8,9,11,0.96)')
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

const buildCongestionHeatmapOpacity = (alpha: number) => {
  const safeAlpha = clampUnit(alpha)
  return ([
  'interpolate', ['linear'], ['zoom'],
  7, 0,
  8, 0.1 * safeAlpha,
  11, 0.18 * safeAlpha,
  14, 0.24 * safeAlpha,
] as any)
}

const heatmapStackLayerId = (sourceId: string, suffix: string) => `${sourceId}-${suffix}`

const isQuickFilterSetNeutral = (filters: Set<QuickFilterId>) =>
  filters.size === 0 || filters.has('all')

function buildTrafficQuickFilter(filters: Set<QuickFilterId>) {
  if (isQuickFilterSetNeutral(filters) || filters.has('flux')) return null
  if (filters.has('congestion')) {
    return ['<=', ['coalesce', ['get', 'speedRatio'], 1], 0.84] as any
  }
  return ['==', ['get', 'id'], '__none__'] as any
}

function buildIncidentQuickFilter(filters: Set<QuickFilterId>) {
  if (isQuickFilterSetNeutral(filters)) return null
  const hasIncidents = filters.has('incidents')
  const hasTravaux = filters.has('travaux')
  if (hasIncidents && hasTravaux) return null
  if (hasTravaux) return ['==', ['get', 'type'], 'roadwork'] as any
  if (hasIncidents) return ['!=', ['get', 'type'], 'roadwork'] as any
  return ['==', ['get', 'id'], '__none__'] as any
}

const setCongestionHeatmapStackOpacity = (map: maplibregl.Map | null, sourceId: string, alpha: number) => {
  if (!map) return
  const safeAlpha = clampUnit(alpha)
  safeSetPaintProperty(map, heatmapStackLayerId(sourceId, 'clusters'), 'circle-opacity', clampUnit(0.42 * safeAlpha))
  safeSetPaintProperty(map, heatmapStackLayerId(sourceId, 'cluster-count'), 'text-opacity', clampUnit(0.56 * safeAlpha))
  safeSetPaintProperty(map, heatmapStackLayerId(sourceId, 'layer'), 'heatmap-opacity', buildCongestionHeatmapOpacity(safeAlpha))
  safeSetPaintProperty(map, heatmapStackLayerId(sourceId, 'hotspots-glow'), 'circle-opacity', clampUnit(0.08 * safeAlpha))
  safeSetPaintProperty(map, heatmapStackLayerId(sourceId, 'hotspots'), 'circle-opacity', clampUnit(0.38 * safeAlpha))
  safeSetPaintProperty(map, heatmapStackLayerId(sourceId, 'labels'), 'text-opacity', clampUnit(0.44 * safeAlpha))
}

const setCongestionHeatmapStackVisibility = (
  map: maplibregl.Map | null,
  sourceId: string,
  visibility: 'visible' | 'none',
  interactionVisibility: 'visible' | 'none',
) => {
  if (!map) return
  safeSetLayoutProperty(map, heatmapStackLayerId(sourceId, 'clusters'), 'visibility', visibility)
  safeSetLayoutProperty(map, heatmapStackLayerId(sourceId, 'cluster-count'), 'visibility', visibility)
  safeSetLayoutProperty(map, heatmapStackLayerId(sourceId, 'layer'), 'visibility', visibility)
  safeSetLayoutProperty(map, heatmapStackLayerId(sourceId, 'hotspots-glow'), 'visibility', visibility)
  safeSetLayoutProperty(map, heatmapStackLayerId(sourceId, 'hotspots'), 'visibility', visibility)
  safeSetLayoutProperty(map, heatmapStackLayerId(sourceId, 'labels'), 'visibility', visibility)
  safeSetLayoutProperty(map, heatmapStackLayerId(sourceId, 'circles'), 'visibility', interactionVisibility)
}

function computeRoadWidth(roadType: string | undefined, level: CongestionLevel, zoom: number, isMobile: boolean = false): number {
  const base: Record<string, number> = {
    motorway: 3.5, motorway_link: 2.8, 
    trunk: 3.2, trunk_link: 2.4,
    primary: 2.8, primary_link: 2.0, 
    secondary: 2.2, secondary_link: 1.8,
    tertiary: 1.8, tertiary_link: 1.4,
    residential: 1.2, service: 1.0,
    unclassified: 1.0
  }
  const mult: Record<CongestionLevel, number> = {
    free: 1.0, slow: 1.15, congested: 1.3, critical: 1.5,
  }
  let baseWidth = base[roadType ?? ''] ?? 1.8
  
  // Mobile Optimization: Force thinner lines for spatial density
  if (isMobile) {
    baseWidth *= 0.7 
  }

  const multiplier = mult[level] ?? 1.1
  
  // Exponential scaling with zoom
  const zoomFactor = Math.pow(1.5, Math.max(0, zoom - 11))
  return Math.round(baseWidth * multiplier * zoomFactor * 10) / 10
}

function hasObservedTraffic(segment: TrafficSegment): boolean {
  return segment.observedTraffic === true
}

function buildTrafficFeatureCollection(
  segments: TrafficSegment[],
  zoom: number,
  isMobile: boolean,
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: segments.map((segment) => {
      const credibleSpeed = getCredibleSpeedKmh(segment.speedKmh, segment.freeFlowSpeedKmh, segment.congestionScore)
      const speedRatio = clamp01(credibleSpeed / Math.max(segment.freeFlowSpeedKmh, 1))
      const hasObserved = hasObservedTraffic(segment)
      const predictedRatio = hasObserved
        ? clamp01(
            speedRatio +
              (segment.flowTrend === 'improving' ? 0.08 : segment.flowTrend === 'worsening' ? -0.08 : -0.03),
          )
        : speedRatio
      const importance = clamp01(
        segment.priorityAxis ??
          (segment.roadType === 'motorway'
            ? 1
            : segment.roadType === 'trunk'
              ? 0.85
              : segment.roadType === 'primary'
                ? 0.7
                : segment.roadType === 'secondary'
                  ? 0.55
                  : 0.35),
      )

      return {
        type: 'Feature' as const,
        id: segment.id,
        geometry: { type: 'LineString' as const, coordinates: segment.coordinates },
        properties: {
          id: segment.id,
          roadType: segment.roadType,
          highway: segment.roadType,
          streetName: segment.streetName,
          axisName: segment.axisName,
          direction: segment.direction,
          speedKmh: credibleSpeed,
          freeFlowSpeedKmh: segment.freeFlowSpeedKmh,
          speedRatio,
          predictedSpeedRatio: predictedRatio,
          congestion: segment.congestionScore,
          importance,
          width: computeRoadWidth(segment.roadType, segment.level, zoom, isMobile),
          color: hasObserved ? getTrafficColor(speedRatio) : '#D1D5DB',
          level: segment.level,
          hasObservedTraffic: hasObserved,
          isEstimatedTraffic: segment.estimatedTraffic === true,
          midpoint_lng: segment.coordinates[Math.floor(segment.coordinates.length / 2)]?.[0] ?? 0,
          corridorLabel: hasObserved
            ? `${segment.streetName || segment.axisName || 'Urban corridor'}${predictedRatio < speedRatio - 0.04 ? ' · spike risk' : speedRatio < 0.55 ? ' · slowdown' : ''}`
            : '',
        },
      }
    }),
  }
}

function countRenderedRoadFeatures(map: maplibregl.Map | null) {
  if (!map || !map.getLayer(FULL_ROAD_LAYER)) return 0
  try {
    return map.queryRenderedFeatures(undefined, { layers: [FULL_ROAD_LAYER] }).length
  } catch {
    return 0
  }
}

function byteaLikeToBase64(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Uint8Array) {
    let binary = ''
    value.forEach(byte => { binary += String.fromCharCode(byte) })
    return btoa(binary)
  }
  if (Array.isArray(value)) {
    let binary = ''
    value.forEach((item) => {
      if (typeof item === 'number') binary += String.fromCharCode(item)
    })
    return binary ? btoa(binary) : null
  }
  if (typeof value === 'object' && value && 'data' in (value as any) && Array.isArray((value as any).data)) {
    return byteaLikeToBase64((value as any).data)
  }
  return null
}

async function loadCachedSnapshot(cityId: string): Promise<TrafficSnapshot | null> {
  try {
    const snapshots = await getSnapshots(cityId, 30)
    const latest = Array.isArray(snapshots) ? snapshots[0] : null
    if (!latest?.segments_gz) return null
    const base64 = byteaLikeToBase64(latest.segments_gz)
    if (!base64) return null
    const decoded = await decompressJSON(base64)
    if (!decoded || !Array.isArray(decoded.segments)) return null
    return decoded as TrafficSnapshot
  } catch (error) {
    console.warn('[CrossFlow] Failed to load cached snapshot', error)
    return null
  }
}

function buildSnapshotFromHereFlow(city: City, hereFlow: HereFlowSegment[]): TrafficSnapshot {
  const fetchedAt = new Date().toISOString()
  const segments: TrafficSegment[] = hereFlow
    .filter(segment => segment.coords.length >= 2)
    .map((segment, index) => {
      const congestionScore = jamFactorToCongestion(segment.jamFactor)
      const freeFlowSpeedKmh = Math.max(25, Math.round(segment.freeFlow || segment.speedUncapped || segment.speed || 35))
      const speedKmh = getCredibleSpeedKmh(segment.speed || freeFlowSpeedKmh, freeFlowSpeedKmh, congestionScore)
      const roadType =
        freeFlowSpeedKmh >= 100 ? 'motorway' :
        freeFlowSpeedKmh >= 80 ? 'trunk' :
        freeFlowSpeedKmh >= 60 ? 'primary' :
        freeFlowSpeedKmh >= 40 ? 'secondary' :
        'tertiary'
      const length = estimateSegmentLength(segment.coords)
      return {
        id: `here-${city.id}-${segment.id || index}`,
        roadType,
        coordinates: segment.coords,
        speedKmh,
        freeFlowSpeedKmh,
        congestionScore,
        level: scoreToCongestionLevel(congestionScore),
        flowVehiclesPerHour: Math.round((1 - congestionScore) * 1800 + 180),
        travelTimeSeconds: Math.max(10, Math.round((length / 1000) / Math.max(speedKmh, 1) * 3600)),
        length,
        mode: 'car',
        lastUpdated: fetchedAt,
        observedTraffic: true,
        estimatedTraffic: false,
        priorityAxis: segment.confidence,
      }
    })

  return {
    cityId: city.id,
    segments,
    heatmap: segments.map(seg => ({
      lng: seg.coordinates[Math.floor(seg.coordinates.length / 2)]?.[0] ?? city.center.lng,
      lat: seg.coordinates[Math.floor(seg.coordinates.length / 2)]?.[1] ?? city.center.lat,
      intensity: seg.congestionScore,
    })),
    heatmapPassages: [],
    heatmapCo2: [],
    fetchedAt,
  }
}

function fuseTrafficSnapshots(base: TrafficSnapshot, incoming: TrafficSnapshot): TrafficSnapshot {
  if (base.segments.length === 0) return incoming
  if (incoming.segments.length === 0) return base

  const merged = new Map<string, TrafficSegment>()
  for (const segment of base.segments) merged.set(segment.id, segment)

  for (const segment of incoming.segments) {
    const key = `${Math.round((segment.coordinates[0]?.[0] ?? 0) * 1000)}:${Math.round((segment.coordinates[0]?.[1] ?? 0) * 1000)}:${segment.roadType ?? 'road'}`
    const existingEntry = Array.from(merged.entries()).find(([, value]) => {
      const coord = value.coordinates[0]
      if (!coord || !segment.coordinates[0]) return false
      return Math.abs(coord[0] - segment.coordinates[0][0]) < 0.0025 &&
        Math.abs(coord[1] - segment.coordinates[0][1]) < 0.0025 &&
        (value.roadType ?? 'road') === (segment.roadType ?? 'road')
    })

    if (existingEntry) {
      const [existingId, existing] = existingEntry
      const mergedCongestion = clamp01((existing.congestionScore + segment.congestionScore) / 2)
      const mergedSpeed = Math.round(((existing.speedKmh + segment.speedKmh) / 2) * 10) / 10
      merged.set(existingId, {
        ...existing,
        speedKmh: mergedSpeed,
        freeFlowSpeedKmh: Math.max(existing.freeFlowSpeedKmh, segment.freeFlowSpeedKmh),
        congestionScore: mergedCongestion,
        level: scoreToCongestionLevel(mergedCongestion),
        observedTraffic: existing.observedTraffic || segment.observedTraffic,
        estimatedTraffic: existing.estimatedTraffic && segment.estimatedTraffic,
      })
    } else {
      merged.set(`${segment.id}-${key}`, segment)
    }
  }

  const segments = Array.from(merged.values())
  return {
    cityId: incoming.cityId || base.cityId,
    segments,
    heatmap: segments.map(seg => ({
      lng: seg.coordinates[Math.floor(seg.coordinates.length / 2)]?.[0] ?? 0,
      lat: seg.coordinates[Math.floor(seg.coordinates.length / 2)]?.[1] ?? 0,
      intensity: seg.congestionScore,
    })),
    heatmapPassages: [],
    heatmapCo2: [],
    fetchedAt: incoming.fetchedAt,
  }
}

export const CrossFlowMap = memo(function CrossFlowMap({ debugMode = false }: { debugMode?: boolean }) {
  const pathname        = usePathname()
  const mapRef          = useRef<maplibregl.Map | null>(null)
  const containerRef    = useRef<HTMLDivElement>(null)
  const popupRef        = useRef<maplibregl.Popup | null>(null)
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null)
  const osmPoisRef      = useRef<Map<string, OSMPOIPoint[]>>(new Map())
  const osmRoutesRef    = useRef<Map<string, OSMRouteGeometry[]>>(new Map())
  const osmMetroRef       = useRef<Map<string, MetroStation[]>>(new Map())
  const ratpStatusRef     = useRef<Map<string, string>>(new Map())
  const ratpDisruptedRef  = useRef<Set<string>>(new Set())
  const refreshDataRef  = useRef<() => void>(() => {})
  const lastVehicleUpdateRef = useRef<number>(0)
  const previousSnapshotRef  = useRef<TrafficSnapshot | null>(null)
  const lastRefreshRef       = useRef<number>(0)
  const refreshRequestRef    = useRef(0)
  const liveVehiclesRef      = useRef<TransitVehicle[]>([])
  const pulseRef             = useRef<number>(0)
  const scanRef              = useRef<number>(0) // Phase 5: Radial Scan
  const rafRef               = useRef<number>(0)
  const socialIntervalRef    = useRef<NodeJS.Timeout | null>(null)
  const heatmapWorkerRef     = useRef<Worker | null>(null)
  const heatmapJobRef        = useRef(0)
  const heatmapFadeRef       = useRef<number>(0)
  const activeHeatSourceRef  = useRef<typeof HEATMAP_SOURCE | typeof HEATMAP_FADE_SOURCE>(HEATMAP_SOURCE)

  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError]   = useState<string | null>(null)
  const [selectedVehicle, setSelectedVehicleState] = useState<TransitVehicle | null>(null)
  const [vehicleCount, setVehicleCount] = useState(0)
  const [countdown, setCountdown] = useState(600) // 10 minutes in seconds
  const [provider, setProvider] = useState<'tomtom' | 'here' | 'synthetic'>('tomtom')
  const [lastSnapshot, setLastSnapshot] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)

  // ─── Geolocation State ────────────────────────────────────────────────
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null)
  const userMarkerRef  = useRef<maplibregl.Marker | null>(null)
  const userSourceReady = useRef(false)
  const USER_LOCATION_SOURCE = 'cf-user-location'


  const city            = useMapStore(s => s.city)
  const cityBoundary    = useMapStore(s => s.cityBoundary)
  const searchFocus     = useMapStore(s => s.searchFocus)
  const setCityBoundary = useMapStore(s => s.setCityBoundary)
  const activeLayers    = useMapStore(s => s.activeLayers)
  const activeQuickFilters = useMapStore(s => s.activeQuickFilters)
  const setMapReady     = useMapStore(s => s.setMapReady)
  const mode            = useMapStore(s => s.mode)
  const selectSegment   = useMapStore(s => s.selectSegment)
  const selectedSegmentId = useMapStore(s => s.selectedSegmentId)
  const highlightedZoneLabel = useMapStore(s => s.highlightedZoneLabel)
  const heatmapMode     = useMapStore(s => s.heatmapMode)
  const zoneActive      = useMapStore(s => s.zoneActive)
  const zoneDraft       = useMapStore(s => s.zoneDraft)
  const zonePolygon     = useMapStore(s => s.zonePolygon)
  const addZonePoint    = useMapStore(s => s.addZonePoint)
  // Vehicle selection / tracking
  const selectedVehicleId  = useMapStore(s => s.selectedVehicleId)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const theme = useThemeStore(s => s.theme)
  const setSelectedVehicle = useMapStore(s => s.setSelectedVehicle)
  const isTrackingVehicle  = useMapStore(s => s.isTrackingVehicle)
  const setTrackingVehicle = useMapStore(s => s.setTrackingVehicle)
  const vehicleTypeFilter  = useMapStore(s => s.vehicleTypeFilter)
  const vehicleSearchQuery = useMapStore(s => s.vehicleSearchQuery)
  const splitRatio         = useMapStore(s => s.splitRatio)
  const [splitLng, setSplitLng] = useState<number>(0)


  const snapshot              = useTrafficStore(s => s.snapshot)
  const setSnapshot           = useTrafficStore(s => s.setSnapshot)
  const timeOffsetMinutes     = useMapStore(s => s.timeOffsetMinutes)
  const incidents             = useTrafficStore(s => s.incidents)
  const setIncidents          = useTrafficStore(s => s.setIncidents)
  const setIsSyncing          = useTrafficStore(s => s.setIsSyncing)
  const setLastSync           = useTrafficStore(s => s.setLastSync)
  const setWeather            = useTrafficStore(s => s.setWeather)
  const setOpenMeteoWeather   = useTrafficStore(s => s.setOpenMeteoWeather)
  const setAirQuality         = useTrafficStore(s => s.setAirQuality)
  const setDataSource         = useTrafficStore(s => s.setDataSource)
  const dataSource            = useTrafficStore(s => s.dataSource)

  const currentResult           = useSimulationStore(s => s.currentResult)
  const simulationRevision      = useSimulationStore(s => s.revision)
  const simulationInteractionMode = useSimulationStore(s => s.interactionMode)
  const setInteractionMode      = useSimulationStore(s => s.setInteractionMode)
  const locationPickerActive    = useSimulationStore(s => s.locationPickerActive)
  const eventLocation           = useSimulationStore(s => s.eventLocation)
  const setEventLocation        = useSimulationStore(s => s.setEventLocation)
  const setLocationPickerActive = useSimulationStore(s => s.setLocationPickerActive)

  const useLiveData = process.env.NEXT_PUBLIC_TOMTOM_ENABLED !== 'false'
  const isDecisionMap = pathname.startsWith('/map')

  const mapLoadedRef         = useRef(false)
  const cityRef              = useRef(city)
  const activeLayersRef      = useRef(activeLayers)
  const modeRef              = useRef(mode)
  const dataSourceRef        = useRef(dataSource)
  const snapshotRef          = useRef(snapshot)
  const incidentsRef         = useRef(incidents)
  const countdownRef         = useRef(countdown)
  const splitLngRef          = useRef(splitLng)

  // Refs to avoid stale closures in map click handler
  const zoneActiveRef              = useRef(zoneActive)
  const addZonePointRef            = useRef(addZonePoint)
  const setSelectedVehicleRef      = useRef(setSelectedVehicle)
  const locationPickerRef          = useRef(locationPickerActive)
  const setEventLocationRef        = useRef(setEventLocation)
  const setLocationPickerActiveRef = useRef(setLocationPickerActive)
  const vehicleTypeFilterRef  = useRef(vehicleTypeFilter)
  const vehicleSearchRef      = useRef(vehicleSearchQuery)
  const isTrackingRef         = useRef(isTrackingVehicle)
  useEffect(() => { zoneActiveRef.current = zoneActive }, [zoneActive])
  useEffect(() => { addZonePointRef.current = addZonePoint }, [addZonePoint])
  useEffect(() => { setSelectedVehicleRef.current = setSelectedVehicle }, [setSelectedVehicle])
  useEffect(() => { locationPickerRef.current = locationPickerActive }, [locationPickerActive])
  useEffect(() => { setEventLocationRef.current = setEventLocation }, [setEventLocation])
  useEffect(() => { setLocationPickerActiveRef.current = setLocationPickerActive }, [setLocationPickerActive])
  useEffect(() => { vehicleTypeFilterRef.current = vehicleTypeFilter }, [vehicleTypeFilter])
  useEffect(() => { vehicleSearchRef.current = vehicleSearchQuery }, [vehicleSearchQuery])
  useEffect(() => { isTrackingRef.current = isTrackingVehicle }, [isTrackingVehicle])
  useEffect(() => { mapLoadedRef.current = mapLoaded }, [mapLoaded])
  useEffect(() => { cityRef.current = city }, [city])
  useEffect(() => { activeLayersRef.current = activeLayers }, [activeLayers])
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { dataSourceRef.current = dataSource }, [dataSource])
  useEffect(() => { snapshotRef.current = snapshot }, [snapshot])
  useEffect(() => { incidentsRef.current = incidents }, [incidents])

  useEffect(() => {
    const map = mapRef.current
    if (!mapLoaded || !map) return

    const focusSrc = safeGetSource(map, TRAFFIC_FOCUS_SOURCE) as maplibregl.GeoJSONSource | null
    if (!focusSrc) return

    if (!highlightedZoneLabel || !snapshot) {
      focusSrc.setData({ type: 'FeatureCollection', features: [] })
      return
    }

    const features = snapshot.segments
      .filter(segment => {
        const key = segment.arrondissement || segment.axisName || segment.streetName || 'Network core'
        return key === highlightedZoneLabel
      })
      .map(segment => ({
        type: 'Feature' as const,
        id: segment.id,
        geometry: { type: 'LineString' as const, coordinates: segment.coordinates },
        properties: {
          id: segment.id,
          focusLabel: highlightedZoneLabel,
          speedRatio: getSpeedRatio(segment),
        },
      }))

    focusSrc.setData({ type: 'FeatureCollection', features })
  }, [highlightedZoneLabel, mapLoaded, snapshot])

  useEffect(() => {
    const map = mapRef.current
    if (!mapLoaded || !map) return

    const selectedSrc = safeGetSource(map, TRAFFIC_SELECTION_SOURCE) as maplibregl.GeoJSONSource | null
    if (!selectedSrc) return

    const selectedSegment = snapshot?.segments.find(segment => segment.id === selectedSegmentId)
    if (!selectedSegment) {
      selectedSrc.setData({ type: 'FeatureCollection', features: [] })
      return
    }

    const speedRatio = getSpeedRatio(selectedSegment)
    const statusLabel =
      speedRatio >= 0.78 ? 'Relief corridor' :
      speedRatio >= 0.56 ? 'Under pressure' :
      'Critical corridor'

    selectedSrc.setData({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        id: selectedSegment.id,
        geometry: { type: 'LineString', coordinates: selectedSegment.coordinates },
        properties: {
          id: selectedSegment.id,
          corridorLabel: selectedSegment.streetName || selectedSegment.axisName || 'Selected corridor',
          statusLabel,
          speedRatio,
        },
      }],
    })
  }, [mapLoaded, selectedSegmentId, snapshot])
  useEffect(() => { countdownRef.current = countdown }, [countdown])
  useEffect(() => { splitLngRef.current = splitLng }, [splitLng])

  const applyCongestionHeatmapCrossfade = useCallback((featureCollection: AggregatedHeatFeatureCollection) => {
    const map = mapRef.current
    if (!map) return

    const currentSourceId = activeHeatSourceRef.current
    const nextSourceId = currentSourceId === HEATMAP_SOURCE ? HEATMAP_FADE_SOURCE : HEATMAP_SOURCE
    const nextSource = safeGetSource(map, nextSourceId) as maplibregl.GeoJSONSource | null
    if (!nextSource) return

    nextSource.setData(featureCollection)

    if (heatmapFadeRef.current) cancelAnimationFrame(heatmapFadeRef.current)

    const start = performance.now()
    const duration = 320

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCongestionHeatmapStackOpacity(map, currentSourceId, 1 - eased)
      setCongestionHeatmapStackOpacity(map, nextSourceId, eased)

      if (progress < 1) {
        heatmapFadeRef.current = requestAnimationFrame(tick)
        return
      }

      activeHeatSourceRef.current = nextSourceId
      setCongestionHeatmapStackVisibility(map, currentSourceId, 'visible', 'none')
      setCongestionHeatmapStackVisibility(map, nextSourceId, 'visible', 'visible')
      setCongestionHeatmapStackOpacity(map, currentSourceId, 0)
      setCongestionHeatmapStackOpacity(map, nextSourceId, 1)
    }

    heatmapFadeRef.current = requestAnimationFrame(tick)
  }, [])

  const scheduleCongestionHeatmapUpdate = useCallback((points: { lng: number, lat: number, intensity: number }[], zoom: number) => {
    const worker = heatmapWorkerRef.current
    if (!worker) return

    const zoomBucket = Math.max(0, Math.round(zoom))
    const jobId = ++heatmapJobRef.current
    worker.postMessage({ jobId, points, zoomBucket })
  }, [])

  useEffect(() => {
    const worker = new Worker(new URL('./workers/trafficHeatmap.worker.ts', import.meta.url))
    heatmapWorkerRef.current = worker

    worker.onmessage = (event: MessageEvent<{ jobId: number, featureCollection: AggregatedHeatFeatureCollection }>) => {
      if (event.data.jobId !== heatmapJobRef.current) return
      applyCongestionHeatmapCrossfade(event.data.featureCollection)
    }

    return () => {
      if (heatmapFadeRef.current) cancelAnimationFrame(heatmapFadeRef.current)
      worker.terminate()
      heatmapWorkerRef.current = null
    }
  }, [applyCongestionHeatmapCrossfade])



  // ─── Vehicle position update & smooth animation (RAF loop) ───────────

  const updateVehicles = useCallback((nowMs: number) => {
    const map    = mapRef.current
    const routes = osmRoutesRef.current.get(city.id)
    if (!map || !routes?.length) return

    // 1. Simulate all vehicles at current time
    const allVehicles = simulateTransitVehicles(routes, nowMs)
    liveVehiclesRef.current = allVehicles

    // 2. Apply Filters (Type + Search)
    const filtered = allVehicles.filter(v => {
      // Type filter
      if (vehicleTypeFilterRef.current.size > 0 && !vehicleTypeFilterRef.current.has(v.routeType)) {
        return false
      }
      // Search filter
      if (vehicleSearchRef.current) {
        const q = vehicleSearchRef.current.toLowerCase()
          .replace(/ligne\s+/g, '')
          .replace(/bus\s+/g, '')
          .replace(/metro\s+/g, '')
          .replace(/m\d/g, m => m.slice(1)) // "M14" -> "14"
          .trim()
        const match = v.routeRef.toLowerCase().includes(q) || v.routeName.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })

    // 3. Update Map Source
    const src = safeGetSource(map, VEHICLES_SOURCE) as maplibregl.GeoJSONSource | null
    const trailsSrc = safeGetSource(map, VEHICLE_TRAILS_SOURCE) as maplibregl.GeoJSONSource | null
    if (src) {
      src.setData({
        type: 'FeatureCollection',
        features: filtered.map(v => ({
          type:       'Feature' as const,
          geometry:   { type: 'Point' as const, coordinates: [v.lng, v.lat] },
          properties: {
            id:        v.id,
            routeType: v.routeType,
            routeRef:  v.routeRef,
            routeName: v.routeName,
            color:     v.color,
            bearing:   v.bearing,
            speedKmh:  v.speedKmh,
          },
        })),
      })
    }
    if (trailsSrc) {
      trailsSrc.setData({
        type: 'FeatureCollection',
        features: filtered
          .filter(v => v.trailCoords.length >= 2)
          .map(v => ({
            type: 'Feature' as const,
            id: `${v.id}-trail`,
            geometry: { type: 'LineString' as const, coordinates: v.trailCoords },
            properties: {
              id: v.id,
              routeType: v.routeType,
              routeRef: v.routeRef,
              color: v.color,
              speedKmh: v.speedKmh,
            },
          })),
      })
    }

    // 4. Handle Selected Vehicle & Tracking
    const selId = useMapStore.getState().selectedVehicleId
    if (selId) {
      const active = allVehicles.find(v => v.id === selId)
      if (active) {
        // Update selection highlight source
        const hSrc = safeGetSource(map, VEHICLES_SOURCE + '-selected') as maplibregl.GeoJSONSource | null
        if (hSrc) {
          hSrc.setData({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [active.lng, active.lat] },
            properties: active,
          })
        }
        // Sync React state for InfoCard (throttled)
        if (nowMs - lastVehicleUpdateRef.current > 100) {
          setSelectedVehicleState(active)
          lastVehicleUpdateRef.current = nowMs
        }
        // Camera follow
        if (isTrackingRef.current) {
          map.easeTo({ center: [active.lng, active.lat], duration: 100, easing: (t) => t })
        }
      } else {
        // Vehicle likely disappeared (off routes)
        setSelectedVehicleState(null)
      }
    } else {
      // Clear highlight if nothing selected
      const hSrc = map.getSource(VEHICLES_SOURCE + '-selected') as maplibregl.GeoJSONSource | undefined
      if (hSrc) hSrc.setData({ type: 'FeatureCollection', features: [] })
      setSelectedVehicleState(null)
    }

    setVehicleCount(allVehicles.length)

    // 5. Global Animations (Pulse for disrupted stations + selected vehicles)
    pulseRef.current = (nowMs % 1500) / 1500 // 1.5s cycle
    const p = pulseRef.current
    const pulseOpacity = 0.7 * (1 - p)

    safeSetPaintProperty(map, METRO_STATIONS_SOURCE + '-alert', 'circle-opacity', pulseOpacity)
    
    if (map && map.getLayer(VEHICLES_SOURCE + '-selected-ring')) {
      safeSetPaintProperty(map, VEHICLES_SOURCE + '-selected-ring', 'circle-opacity', pulseOpacity * 0.6)
      safeSetPaintProperty(map, VEHICLES_SOURCE + '-selected-ring', 'circle-radius', [
        'interpolate', ['linear'], ['zoom'],
        10, 12 + (p * 8),
        15, 24 + (p * 12)
      ])
    }
  }, [city.id])

  // ─── Unified Animation Loop (Flow + Pulse) ──────────────────────────────────

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current

    const animate = () => {
      if (document.hidden) {
        rafRef.current = requestAnimationFrame(animate)
        return
      }

      const now = Date.now()

      // 1b. Phase 5: Radial Scan & Critical Pulse
      // Scan starts at 0 and grows to 1 then stays there
      if (scanRef.current < 1) {
        scanRef.current += 0.005
        safeSetPaintProperty(map, 'cf-traffic-glow', 'line-opacity', [
          'interpolate', ['linear'], ['line-progress'],
          scanRef.current - 0.15, 0,
          scanRef.current, 0.4,
          scanRef.current + 0.15, 0
        ])
      }

      const selectionPulse = (Math.sin(now / 280) + 1) / 2
      safeSetPaintProperty(map, TRAFFIC_SELECTION_SOURCE + '-glow', 'line-opacity', 0.12 + selectionPulse * 0.16)
      safeSetPaintProperty(map, TRAFFIC_SELECTION_SOURCE + '-glow', 'line-width', [
        'interpolate', ['linear'], ['zoom'],
        11, 10 + selectionPulse * 4,
        16, 24 + selectionPulse * 8,
      ])

      const hotspotPulse = (Math.sin(now / 520) + 1) / 2
      safeSetPaintProperty(map, heatmapStackLayerId(HEATMAP_SOURCE, 'hotspots-glow'), 'circle-opacity', 0.1 + hotspotPulse * 0.14)
      safeSetPaintProperty(map, heatmapStackLayerId(HEATMAP_SOURCE, 'hotspots-glow'), 'circle-radius', [
        'interpolate', ['linear'], ['zoom'],
        12, 14 + hotspotPulse * 4,
        16, 30 + hotspotPulse * 8,
      ])
      safeSetPaintProperty(map, heatmapStackLayerId(HEATMAP_FADE_SOURCE, 'hotspots-glow'), 'circle-opacity', 0.08 + hotspotPulse * 0.1)
      safeSetPaintProperty(map, heatmapStackLayerId(HEATMAP_FADE_SOURCE, 'hotspots-glow'), 'circle-radius', [
        'interpolate', ['linear'], ['zoom'],
        12, 14 + hotspotPulse * 4,
        16, 30 + hotspotPulse * 8,
      ])
      safeSetPaintProperty(map, TRAFFIC_FOCUS_SOURCE + '-glow', 'line-opacity', 0.1 + hotspotPulse * 0.12)
      safeSetPaintProperty(map, TRAFFIC_FOCUS_SOURCE + '-glow', 'line-width', [
        'interpolate', ['linear'], ['zoom'],
        11, 8 + hotspotPulse * 3,
        16, 20 + hotspotPulse * 7,
      ])

      // 2. Pulse Animation (Vehicles + Station Alerts)
      updateVehicles(now)

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [mapLoaded, updateVehicles])

  // ─── Split View Lng Calculation ─────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mode !== 'predict') return
    const map = mapRef.current

    const updateSplitLine = () => {
      const container = map.getContainer()
      const width = container.clientWidth
      const splitX = (splitRatio / 100) * width
      const lngLat = map.unproject([splitX, container.clientHeight / 2])
      setSplitLng(lngLat.lng)
    }

    updateSplitLine()
    map.on('move', updateSplitLine)
    return () => { map.off('move', updateSplitLine) }
  }, [mapLoaded, splitRatio, mode])

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current

    const onZoomEnd = () => {
      const currentSnapshot = snapshotRef.current
      if (!currentSnapshot) return
      if (!activeLayersRef.current.has('heatmap') && !isDecisionMap) return
      scheduleCongestionHeatmapUpdate(currentSnapshot.heatmap, map.getZoom())
    }

    map.on('zoomend', onZoomEnd)
    return () => {
      map.off('zoomend', onZoomEnd)
    }
  }, [isDecisionMap, mapLoaded, scheduleCongestionHeatmapUpdate])

  // ─── Cursor change when zone tool is active ──────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.getCanvas().style.cursor = (zoneActive || locationPickerActive) ? 'crosshair' : ''
  }, [zoneActive, locationPickerActive])

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    applyMapTheme(mapRef.current, theme)
  }, [mapLoaded, theme])

  // ─── Init map ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:     BASE_MAP_STYLE,
      center:    [city.center.lng, city.center.lat],
      zoom:      Math.max(city.zoom, 12),
      pitch:     0,
      bearing:   0,
      minZoom:   8,
      attributionControl: false,
    })

    let roadVisualCheckTimer: ReturnType<typeof setTimeout> | null = null

    map.on('load', () => {
      console.log('[CrossFlow] Map loaded successfully')
      initStaticSources(map)
      applyMapTheme(map, theme)
      initBoundaryLayers(map)
      initDistrictsLayers(map)
      initHeatmapPassagesLayers(map)
      initZoneLayers(map)
      initSocialLayers(map)
      applyTrafficRenderingHierarchy(map)

      console.log('[CrossFlow] Base road layers initialized', {
        source: BASE_NETWORK_SOURCE,
        roadLayer: Boolean(map.getLayer(FULL_ROAD_LAYER)),
      })

      roadVisualCheckTimer = setTimeout(() => {
        const visibleRoadFeatures = countRenderedRoadFeatures(map)
        console.log('VISIBLE ROAD FEATURES:', visibleRoadFeatures)
        console.log('MAP LAYERS:', map.getStyle()?.layers?.length ?? 0)
        if (visibleRoadFeatures < 10000) {
          console.error('MAP VISUALLY EMPTY - vector road density below expected threshold')
        }
      }, 2500)

      setMapLoaded(true)
      setMapReady(true)
    })

    map.on('error', (e) => {
      const status = (e as any)?.error?.status
      if (status === 503 || status === 429) {
        console.warn('[CrossFlow] TomTom/Upstream transient error → dashboard enters resilience mode')
        return // handled by source-specific watchers
      }

      console.error('[CrossFlow] MapLibre error:', e.error?.message || e)
      // Check if it's a critical style or tile loading error
      const msg = e.error?.message || ''
      if (msg.includes('Failed to fetch') || msg.includes('Style is not done loading')) {
        setMapError('Impossible de charger les données cartographiques. Vérifiez votre connexion.')
      }
    })

    // Click on synthetic segments
    map.on('click', TRAFFIC_SOURCE + '-lines', async (e) => {
      // Don't handle segment click when zone tool is active
      if (zoneActiveRef.current) return
      const feat = e.features?.[0]
      if (!feat) return
      const segmentId = feat.properties?.id as string
      selectSegment(segmentId)

      if (simulationInteractionMode === SIMULATION_INTERACTION_MODE.BLOCK_ROAD) {
        try {
          await predictiveApi.blockRoad(segmentId)
          simulationService.getAffectedEdges().then(geojson => {
            const src = safeGetSource(map, PREDICTIVE_AFFECTED_SOURCE) as maplibregl.GeoJSONSource | null
            if (src && geojson) src.setData(geojson)
          })
          useSimulationStore.getState().bumpRevision()
          setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
        } catch (err) {
          console.error('[CrossFlow] blockRoad failed:', err)
        }
        return
      }

      if (simulationInteractionMode === SIMULATION_INTERACTION_MODE.ADD_TRAFFIC) {
        try {
          await predictiveApi.addTraffic(segmentId, 'medium')
          simulationService.getAffectedEdges().then(geojson => {
            const src = safeGetSource(map, PREDICTIVE_AFFECTED_SOURCE) as maplibregl.GeoJSONSource | null
            if (src && geojson) src.setData(geojson)
          })
          useSimulationStore.getState().bumpRevision()
          setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
        } catch (err) {
          console.error('[CrossFlow] addTraffic failed:', err)
        }
        return
      }

      // Fetch real TomTom data for this point if key available
      if (useLiveData) {
        const coords = e.lngLat
        const flow   = await fetchFlowSegment(coords.lat, coords.lng, Math.round(map.getZoom()))
        if (flow) {
          showFlowPopup(map, coords, flow)
        }
      }
    })

    // General map click — sim location picker + zone drawing + TomTom point query
    map.on('click', async (e) => {
      // Simulation location picker — place event marker on click
      if (locationPickerRef.current) {
        setEventLocationRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng })
        setLocationPickerActiveRef.current(false)
        return
      }

      // Zone drawing mode
      if (zoneActiveRef.current) {
        addZonePointRef.current([e.lngLat.lng, e.lngLat.lat])
        return
      }

      if (!useLiveData) return
      // Only if not clicking a feature
      const features = map.queryRenderedFeatures(e.point)
      if (features.some(f => f.source === TRAFFIC_SOURCE)) return

      const flow = await fetchFlowSegment(e.lngLat.lat, e.lngLat.lng, Math.round(map.getZoom()))
      if (flow && !flow.roadClosure) {
        showFlowPopup(map, e.lngLat, flow)
      }
    })

    map.on('mouseenter', TRAFFIC_SOURCE + '-lines', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', TRAFFIC_SOURCE + '-lines', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = ''
      popupRef.current?.remove()
      const hoverSrc = safeGetSource(map, TRAFFIC_HOVER_SOURCE) as maplibregl.GeoJSONSource | null
      if (hoverSrc) hoverSrc.setData({ type: 'FeatureCollection', features: [] })
    })

    map.on('mousemove', TRAFFIC_SOURCE + '-lines', (e) => {
      if (zoneActiveRef.current) return
      const feat = e.features?.[0]
      if (!feat) return
      const hoverSrc = safeGetSource(map, TRAFFIC_HOVER_SOURCE) as maplibregl.GeoJSONSource | null
      if (hoverSrc) {
        hoverSrc.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            id: feat.id,
            geometry: {
              type: (feat.geometry as GeoJSON.LineString).type,
              coordinates: (feat.geometry as GeoJSON.LineString).coordinates,
            },
            properties: { ...(feat.properties as Record<string, unknown>) },
          }],
        })
      }
      const p = feat.properties as any
      const speedRatio = typeof p.speedRatio === 'number' ? p.speedRatio : 1
      const speed = Math.max(0, Math.round(p.speedKmh ?? 0))
      const freeFlow = Math.round(p.freeFlowSpeedKmh ?? 0)
      const delta = freeFlow > 0 ? Math.round(((speed - freeFlow) / freeFlow) * 100) : 0
      const color = getTrafficColor(speedRatio)
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, maxWidth: '260px', className: 'apple-popup' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="glass" style="padding:14px;border-radius:18px;color:white;border:1px solid ${color}40;font-family:Inter,sans-serif;">
            <p style="margin:0 0 4px 0;font-size:9px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.08em;">${p.axisName || 'Trafic Paris'}</p>
            <h3 style="margin:0 0 8px 0;font-size:16px;font-weight:700;">${p.streetName || 'Axe routier'}</h3>
            <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px;">
              <span style="font-size:22px;font-weight:800;color:${color};">${speed} km/h</span>
              <span style="font-size:11px;color:var(--popup-secondary);">${delta >= 0 ? '+' : ''}${delta}% vs normal</span>
            </div>
            <p style="margin:0;font-size:11px;color:var(--popup-secondary);line-height:1.4;">Lecture validée par CrossFlow Intelligence Engine: ${(speedRatio * 100).toFixed(0)}% du flux libre.</p>
          </div>
        `)
        .addTo(map)
    })

    // Click on traffic segments → Urban Insight Popup
    map.on('click', TRAFFIC_SOURCE + '-lines', (e) => {
      if (zoneActiveRef.current) return
      const feat = e.features?.[0]
      if (!feat) return
      
      const p = feat.properties as any
      const speedRatio = typeof p.speedRatio === 'number' ? p.speedRatio : 1
      const color = getTrafficColor(speedRatio)
      const score = Math.round(speedRatio * 100)
      
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, maxWidth: '300px', className: 'apple-popup' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="glass" style="padding:16px; border-radius:20px; color:white; border:1px solid ${color}40; font-family:Inter,sans-serif;">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px;">
              <div>
                <p style="margin:0; font-size:10px; font-weight:700; color:${color}; text-transform:uppercase; letter-spacing:0.08em;">${p.axisName || 'Axe Urbain'}</p>
                <h3 style="margin:4px 0 0 0; font-size:18px; font-weight:700;">${p.streetName || 'Rue de Paris'}</h3>
              </div>
              <div style="background:${color}20; padding:6px 10px; border-radius:10px; border:1px solid ${color}40;">
                <span style="font-size:14px; font-weight:800; color:${color};">${score}%</span>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px;">
              <div style="background:var(--popup-surface); padding:10px; border-radius:14px;">
                <p style="margin:0; font-size:9px; color:var(--popup-secondary); text-transform:uppercase;">Vitesse</p>
                <p style="margin:2px 0 0 0; font-size:15px; font-weight:700;">${Math.round(p.speedKmh ?? 0)} <span style="font-size:10px; font-weight:400; color:#424245;">km/h</span></p>
              </div>
              <div style="background:var(--popup-surface); padding:10px; border-radius:14px;">
                <p style="margin:0; font-size:9px; color:var(--popup-secondary); text-transform:uppercase;">Tendance</p>
                <p style="margin:2px 0 0 0; font-size:15px; font-weight:700; color:${color};">${speedRatio >= 0.75 ? 'Fluide' : speedRatio >= 0.5 ? 'Modéré' : 'Congestion'}</p>
              </div>
            </div>

            <div style="padding-top:12px; border-top:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; gap:8px;">
              <div style="width:6px; height:6px; border-radius:50%; background:#22C55E; box-shadow:0 0 8px #22C55E;"></div>
              <p style="margin:0; font-size:10px; color:var(--popup-secondary);">Source: Live synchronized data</p>
            </div>
          </div>
        `)
        .addTo(map)
    })

    // Click on transit vehicles → update store selection (drives VehicleInfoCard)
    map.on('click', VEHICLES_SOURCE + '-layer', (e) => {
      if (zoneActiveRef.current) return
      const feat = e.features?.[0]
      if (!feat) return
      const vehicleId = String(feat.properties?.id ?? '')
      setSelectedVehicleRef.current(vehicleId)
      // Update the highlight source immediately
      const selSrc = map.getSource(VEHICLES_SOURCE + '-selected') as maplibregl.GeoJSONSource | undefined
      if (selSrc) {
        selSrc.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: (feat.geometry as GeoJSON.Point).coordinates },
            properties: feat.properties,
          }],
        })
      }
    })

    map.on('mouseenter', VEHICLES_SOURCE + '-layer', (e) => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = 'pointer'
      const feat = e.features?.[0]
      if (feat) {
        const hSrc = map.getSource(VEHICLES_SOURCE + '-hover') as maplibregl.GeoJSONSource | undefined
        if (hSrc) {
          // Explicitly construct a plain object to avoid serialization errors with internal MapLibre classes (hL)
          hSrc.setData({
            type: 'Feature',
            geometry: {
              type: (feat.geometry as any).type,
              coordinates: (feat.geometry as any).coordinates
            } as any,
            properties: { ...feat.properties }
          })
          map.setLayoutProperty(VEHICLES_SOURCE + '-hover-ring', 'visibility', 'visible')
        }
      }
    })
    map.on('mouseleave', VEHICLES_SOURCE + '-layer', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = ''
      const m = mapRef.current
      if (m && m.getLayer(VEHICLES_SOURCE + '-hover-ring')) {
        m.setLayoutProperty(VEHICLES_SOURCE + '-hover-ring', 'visibility', 'none')
      }
    })

    // Click on metro stations
    map.on('click', METRO_STATIONS_SOURCE + '-dot', (e) => {
      if (zoneActiveRef.current) return
      const feat = e.features?.[0]
      if (!feat) return
      const p       = feat.properties as Record<string, unknown>
      const name    = String(p.name ?? 'Station')
      const lines   = String(p.lines ?? '').split('·').filter(Boolean)
      const disrupted  = ratpDisruptedRef.current
      const ratpStatus = ratpStatusRef.current

      const linesBadges = lines.map(line => {
        const color       = String(ratpStatus.get(line) ?? LINE_COLORS[line] ?? '#8B5CF6')
        const isDisrupted = disrupted.has(line.toUpperCase())
        const tc          = textOnBg(color)
        return `
          <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:8px;background:var(--popup-surface);border:1px solid rgba(255,255,255,0.07)">
            <div style="width:20px;height:20px;border-radius:5px;background:${color};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:${tc};flex-shrink:0">${line}</div>
            <span style="font-size:10px;color:${isDisrupted ? '#EF4444' : '#22C55E'};font-weight:600">${isDisrupted ? '⚠ Perturbé' : '● Normal'}</span>
          </div>`
      }).join('')

      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, maxWidth: '260px', className: 'cf-station-popup' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="font-family:Inter,sans-serif;padding:14px;min-width:180px">
            <p style="margin:0 0 3px 0;font-size:9px;font-weight:700;color:var(--popup-secondary);text-transform:uppercase;letter-spacing:0.12em">Station</p>
            <h3 style="margin:0 0 10px 0;font-size:15px;font-weight:700;color:var(--popup-text)">${name}</h3>
            ${lines.length ? `<div style="display:flex;flex-direction:column;gap:4px">${linesBadges}</div>` : `<p style="margin:0;font-size:11px;color:var(--popup-secondary)">Aucune ligne associée</p>`}
          </div>
        `)
        .addTo(map)
    })

    map.on('mouseenter', METRO_STATIONS_SOURCE + '-dot', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', METRO_STATIONS_SOURCE + '-dot', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = ''
    })

    // Click on City Boundary
    map.on('click', BOUNDARY_SOURCE + '-fill', (e) => {
      if (zoneActiveRef.current) return
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, maxWidth: '240px', className: 'apple-popup' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="glass" style="padding: 16px; border-radius: 20px; color:var(--popup-text); border: 1px solid rgba(34,197,94,0.2);">
            <p style="margin:0 0 4px 0; font-size:10px; font-weight:700; color:#22C55E; text-transform:uppercase; tracking:0.1em;">Périmètre Urbain</p>
            <h3 style="margin:0 0 12px 0; font-size:18px;">${city.name}</h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <div style="background:var(--popup-surface); padding:8px; border-radius:12px;">
                <p style="margin:0; font-size:9px; color:var(--popup-secondary);">POPULATION</p>
                <p style="margin:0; font-size:13px; font-weight:600;">${city.population.toLocaleString()}</p>
              </div>
              <div style="background:var(--popup-surface); padding:8px; border-radius:12px;">
                <p style="margin:0; font-size:9px; color:var(--popup-secondary);">PAYS</p>
                <p style="margin:0; font-size:13px; font-weight:600;">${city.country} ${city.flag}</p>
              </div>
            </div>
            <p style="margin:12px 0 0 0; font-size:10px; color:var(--popup-secondary); line-height:1.4;">
              Analyse en temps réel du flux de mobilité sur l'ensemble de la zone métropolitaine.
            </p>
          </div>
        `)
        .addTo(map)
    })

    // Click on District choropleth
    map.on('click', DISTRICTS_SOURCE + '-fill', (e) => {
      if (zoneActiveRef.current) return
      const feat = e.features?.[0]
      if (!feat) return
      const name    = feat.properties?.name ?? 'Zone'
      const density = feat.properties?.density ?? 0.5
      const pct     = Math.round(density * 100)
      const color   = density < 0.25 ? '#22C55E' : density < 0.5 ? '#FFD600' : density < 0.75 ? '#FF9F0A' : '#FF3B30'
      const label   = density < 0.25 ? 'Fluide' : density < 0.5 ? 'Modéré' : density < 0.75 ? 'Dense' : 'Saturé'
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, maxWidth: '260px', className: 'apple-popup' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="glass" style="padding:16px;border-radius:20px;color:white;border:1px solid ${color}30;font-family:Inter,-apple-system,sans-serif;">
            <p style="margin:0 0 2px 0;font-size:9px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.1em;">Secteur Opérationnel</p>
            <h3 style="margin:0 0 14px 0;font-size:17px;font-weight:700;">${name}</h3>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
              <div style="flex:1;height:6px;border-radius:3px;background:linear-gradient(to right,#22C55E,#FFD600,#FF9F0A,#FF3B30);overflow:hidden;position:relative;">
                <div style="position:absolute;top:-3px;width:2px;height:12px;background:white;border-radius:1px;left:${pct}%;box-shadow:0 0 6px white;"></div>
              </div>
              <span style="font-size:13px;font-weight:700;color:${color};min-width:36px;">${pct}%</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
              <div style="background:var(--popup-surface);padding:8px;border-radius:10px;">
                <p style="margin:0;font-size:9px;color:var(--popup-secondary);text-transform:uppercase;">Score Predictif</p>
                <p style="margin:3px 0 0 0;font-size:13px;font-weight:600;color:${color};">${label}</p>
              </div>
              <div style="background:var(--popup-surface);padding:8px;border-radius:10px;">
                <p style="margin:0;font-size:9px;color:var(--popup-secondary);text-transform:uppercase;">Multiplier</p>
                <p style="margin:3px 0 0 0;font-size:13px;font-weight:600;">×1.24</p>
              </div>
            </div>
            <div style="padding-top:10px; border-top:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; gap:6px;">
              <div style="width:6px; height:6px; border-radius:50%; background:#22C55E; box-shadow:0 0 6px #22C55E;"></div>
              <p style="margin:0;font-size:9px;color:var(--popup-secondary);font-weight:500;">Intelligence Engine: Validated Scoring</p>
            </div>
          </div>
        `)
        .addTo(map)
    })
    map.on('mouseenter', DISTRICTS_SOURCE + '-fill', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', DISTRICTS_SOURCE + '-fill', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = ''
    })

    // Click on Incidents
    map.on('click', INCIDENT_SOURCE + '-circles', (e) => {
      if (zoneActiveRef.current) return
      const feat = e.features?.[0]
      if (!feat) return
      const p = feat.properties as any
      const color = p.color || '#FFD600'
      const severity = (p.severity || 'medium').toUpperCase()
      
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, maxWidth: '240px', className: 'apple-popup' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="glass" style="padding:16px; border-radius:18px; color:white; border:1px solid ${color}40;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <div style="width:8px; height:8px; border-radius:50%; background:${color}; box-shadow:0 0 8px ${color};"></div>
              <span style="font-size:10px; font-weight:700; color:${color}; text-transform:uppercase; tracking:0.1em;">${severity}</span>
            </div>
            <h3 style="margin:0 0 6px 0; font-size:15px; font-weight:700;">${p.title}</h3>
            <p style="margin:0; font-size:11px; color:var(--popup-secondary); line-height:1.4;">Signalé à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            <div style="margin-top:12px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between;">
               <span style="font-size:9px; color:#424245;">ID: ${p.id.slice(0,8)}</span>
               <span style="font-size:10px; font-weight:600; color:#22C55E;">Détails &rarr;</span>
            </div>
          </div>
        `)
        .addTo(map)
    })

    map.on('mouseenter', INCIDENT_SOURCE + '-circles', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', INCIDENT_SOURCE + '-circles', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = ''
    })

    map.on('click', INCIDENT_SOURCE + '-cluster', async (e) => {
      if (zoneActiveRef.current) return
      const feat = e.features?.[0]
      if (!feat) return
      const clusterId = feat.properties?.cluster_id
      const source = map.getSource(INCIDENT_SOURCE) as maplibregl.GeoJSONSource | undefined
      if (clusterId === undefined || !source || typeof source.getClusterExpansionZoom !== 'function') return
      const zoom = await source.getClusterExpansionZoom(clusterId as number)
      map.easeTo({ center: (feat.geometry as GeoJSON.Point).coordinates as [number, number], zoom, duration: 650 })
    })

    map.on('click', INCIDENT_SOURCE + '-unclustered', (e) => {
      if (zoneActiveRef.current) return
      const feat = e.features?.[0]
      if (!feat) return
      const p = feat.properties as any
      const color = p.color || '#FFD600'
      const severity = (p.severity || 'medium').toUpperCase()
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, maxWidth: '240px', className: 'apple-popup' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="glass" style="padding:16px; border-radius:18px; color:white; border:1px solid ${color}40;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <div style="width:8px; height:8px; border-radius:50%; background:${color}; box-shadow:0 0 8px ${color};"></div>
              <span style="font-size:10px; font-weight:700; color:${color}; text-transform:uppercase; tracking:0.1em;">${severity}</span>
            </div>
            <h3 style="margin:0 0 6px 0; font-size:15px; font-weight:700;">${p.title}</h3>
            <p style="margin:0; font-size:11px; color:var(--popup-secondary); line-height:1.4;">Signalé à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        `)
        .addTo(map)
    })

    map.on('click', INCIDENT_CRITICAL_SOURCE + '-dot', (e) => {
      if (zoneActiveRef.current) return
      const feat = e.features?.[0]
      if (!feat) return
      const p = feat.properties as any
      const color = p.color || '#FF3B30'
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, maxWidth: '240px', className: 'apple-popup' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="glass" style="padding:16px; border-radius:18px; color:white; border:1px solid ${color}40;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <div style="width:8px; height:8px; border-radius:50%; background:${color}; box-shadow:0 0 8px ${color};"></div>
              <span style="font-size:10px; font-weight:700; color:${color}; text-transform:uppercase; tracking:0.1em;">CRITICAL</span>
            </div>
            <h3 style="margin:0 0 6px 0; font-size:15px; font-weight:700;">${p.title}</h3>
            <p style="margin:0; font-size:11px; color:var(--popup-secondary); line-height:1.4;">Détection prioritaire visible en permanence.</p>
          </div>
        `)
        .addTo(map)
    })

    map.on('mouseenter', INCIDENT_SOURCE + '-cluster', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', INCIDENT_SOURCE + '-cluster', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = ''
    })
    map.on('mouseenter', INCIDENT_SOURCE + '-unclustered', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', INCIDENT_SOURCE + '-unclustered', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = ''
    })
    map.on('mouseenter', INCIDENT_CRITICAL_SOURCE + '-dot', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', INCIDENT_CRITICAL_SOURCE + '-dot', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = ''
    })

    // Click on Heatmap Points (using the points rendered as transparent circles for interaction)
    const handleHeatmapClick = (mode: HeatmapMode, color: string, unit: string) => (e: any) => {
      const feat = e.features?.[0]
      if (!feat) return
      const intensity = feat.properties?.intensity
      const count = Number(feat.properties?.count ?? 1)
      const contextLabel = String(feat.properties?.contextLabel ?? 'High congestion area')
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, className: 'apple-popup' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="glass" style="padding:12px; border-radius:16px; min-width:140px; border:1px solid ${color}40;">
            <p style="margin:0; font-size:9px; font-weight:700; color:${color}; text-transform:uppercase;">Intensité ${mode}</p>
            <p style="margin:4px 0 0 0; font-size:22px; font-weight:700; color:white;">
              ${Math.round(intensity * 100)}<span style="font-size:12px; font-weight:500; color:var(--popup-secondary); margin-left:4px;">${unit}</span>
            </p>
            <p style="margin:8px 0 0 0; font-size:11px; color:#D1D5DB;">${contextLabel}</p>
            <p style="margin:4px 0 0 0; font-size:10px; color:#9CA3AF;">${count} aggregated cells contributing</p>
          </div>
        `)
        .addTo(map)
    }

    map.on('click', heatmapStackLayerId(HEATMAP_SOURCE, 'circles'), handleHeatmapClick('congestion', '#FF6B57', '%'))
    map.on('click', heatmapStackLayerId(HEATMAP_FADE_SOURCE, 'circles'), handleHeatmapClick('congestion', '#FF6B57', '%'))
    map.on('click', HEATMAP_PASSAGES_SOURCE + '-circles', handleHeatmapClick('passages', '#FFD600', 'pts'))
    map.on('click', HEATMAP_CO2_SOURCE + '-circles', handleHeatmapClick('co2', '#A855F7', 'g'))

    mapRef.current = map
    return () => {
      if (roadVisualCheckTimer) clearTimeout(roadVisualCheckTimer)
      popupRef.current?.remove()
      searchMarkerRef.current?.remove()
      map.remove()
      mapRef.current = null
      setMapLoaded(false)
    }
  }, []) // eslint-disable-line

  // Helper: show live synchronized flow popup
  function showFlowPopup(map: maplibregl.Map, lngLat: maplibregl.LngLat, flow: Awaited<ReturnType<typeof fetchFlowSegment>>) {
    if (!flow) return
    popupRef.current?.remove()
    const ratio   = flow.currentSpeed / flow.freeFlowSpeed
    const color   = ratio > 0.75 ? '#22C55E' : ratio > 0.5 ? '#FFD600' : ratio > 0.25 ? '#FF9F0A' : '#FF3B30'
    const delay   = Math.max(0, flow.currentTravelTime - flow.freeFlowTravelTime)

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: true, maxWidth: '280px', className: 'apple-popup' })
      .setLngLat(lngLat)
      .setHTML(`
        <div class="glass" style="padding: 16px; border-radius: 20px; font-family: Inter, -apple-system, sans-serif; color:var(--popup-text); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 8px 32px rgba(0,0,0,0.15);">
          <!-- Header row: title + speed dot + close button -->
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; gap: 8px;">
            <div style="flex: 1;">
              <p style="font-size: 10px; font-weight: 700; color:var(--popup-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 4px 0;">Vitesse Actuelle</p>
              <p style="font-size: 24px; font-weight: 700; color:var(--popup-text); margin: 0; line-height: 1;">${flow.currentSpeed} <span style="font-size: 14px; font-weight: 500; color:var(--popup-secondary);">km/h</span></p>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: ${color}15; border: 1px solid ${color}30; display: flex; align-items: center; justify-content: center;">
                <div style="width: 10px; height: 10px; border-radius: 50%; background: ${color}; box-shadow: 0 0 10px ${color};"></div>
              </div>
              <button
                onclick="this.closest('.maplibregl-popup').remove()"
                title="Fermer"
                style="width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(128,128,128,0.2); background: var(--popup-surface); color: var(--popup-secondary); font-size: 14px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; flex-shrink: 0;"
                onmouseover="this.style.background='rgba(255,59,48,0.12)';this.style.color='#FF3B30';this.style.borderColor='rgba(255,59,48,0.25)'"
                onmouseout="this.style.background='var(--popup-surface)';this.style.color='var(--popup-secondary)';this.style.borderColor='rgba(128,128,128,0.2)'"
              >✕</button>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div style="background:var(--popup-surface); border-radius: 14px; padding: 10px; border: 1px solid rgba(128,128,128,0.1);">
              <p style="color:var(--popup-secondary); font-size: 9px; font-weight: 600; text-transform: uppercase; margin: 0 0 4px 0;">Trajet</p>
              <p style="font-size: 15px; font-weight: 700; color:var(--popup-text); margin: 0;">${Math.round(flow.currentTravelTime / 60)} <span style="font-size: 11px; color:var(--popup-secondary);">min</span></p>
            </div>
            <div style="background:var(--popup-surface); border-radius: 14px; padding: 10px; border: 1px solid rgba(128,128,128,0.1);">
              <p style="color:var(--popup-secondary); font-size: 9px; font-weight: 600; text-transform: uppercase; margin: 0 0 4px 0;">Retard</p>
              <p style="font-size: 15px; font-weight: 700; color: ${delay > 0 ? '#FF9F0A' : '#22C55E'}; margin: 0;">
                ${delay > 0 ? '+' : ''}${Math.round(delay / 60)} <span style="font-size: 11px;">min</span>
              </p>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(128,128,128,0.1); padding-top: 10px;">
            <span style="font-size: 10px; font-weight: 500; color: var(--popup-secondary);">Fiabilité: ${Math.round(flow.confidence * 100)}%</span>
            <span style="font-size: 10px; font-weight: 600; color: #22C55E;">Live synchronized data</span>
          </div>
        </div>
      `)
      .addTo(map)
    popupRef.current = popup
  }

  // ─── Load boundary for initial city ──────────────────────────────────

  useEffect(() => {
    if (!mapLoaded || cityBoundary) return
    fetchCityBoundary(city.name, city.country).then((b: any) => {
      if (b) {
        setCityBoundary({
          type: 'Feature',
          geometry: b,
          properties: {}
        } as GeoJSON.Feature)
      }
    })
  }, [mapLoaded]) // eslint-disable-line

  // ─── Load POIs (traffic signals, bus stops, subway entrances) ───────

  useEffect(() => {
    if (!mapLoaded) return
    const cityId = city.id

    if (!osmPoisRef.current.has(cityId)) {
      fetchTrafficPOIs(city.bbox).then(pois => {
        if (cityRef.current.id !== cityId) return
        if (!pois.length) return
        osmPoisRef.current.set(cityId, pois)
        const map = mapRef.current
        if (!map) return
        const src = map.getSource(POI_SOURCE) as maplibregl.GeoJSONSource | undefined
        if (!src) return
        src.setData({
          type: 'FeatureCollection',
          features: pois.map(poi => ({
            type:       'Feature' as const,
            geometry:   { type: 'Point' as const, coordinates: [poi.lng, poi.lat] },
            properties: { id: poi.id, type: poi.type, name: poi.name },
          })),
        })
      })
    }
  }, [city.id, mapLoaded]) // eslint-disable-line

  // ─── Detect Paris (enables RATP real-time status) ────────────────────

  const isParis = city.countryCode === 'FR' &&
    Math.abs(city.center.lat - 48.8566) < 0.6 &&
    Math.abs(city.center.lng - 2.3522) < 0.8

  // ─── Load transit route geometries + render as polylines ─────────────

  useEffect(() => {
    if (!mapLoaded) return
    if (osmRoutesRef.current.has(city.id)) return

    // Fetch metro/tram first (always), then supplement with bus routes.
    // Two separate calls ensures metro lines are never cut off by bus-route count.
    // loadRoutes() // Removed as it was orphansed after the snapshot engine refactor
  }, [city.id, mapLoaded]) // eslint-disable-line

  // ─── 10-Minute Snapshot Engine (Staff Engineer) ─────────────────────

  const performSnapshot = useCallback(async (isInitial = false) => {
    const cityNow = cityRef.current
    const dataSourceNow = dataSourceRef.current
    if (dataSourceNow !== 'live' || !mapRef.current) return
    setIsFetching(true)
    
    try {
      console.log('🔄 [Snapshot Engine] Fetching urban state for', cityNow.name)
      const snapshot = await generateTrafficSnapshot(cityNow)
      const map = mapRef.current

      // Update Feature State (High Performance) - V4 Extended Metadata
      snapshot.segments.forEach(seg => {
        map.setFeatureState(
          { source: TRAFFIC_SOURCE, id: seg.id },
          { 
            hasData: true, 
            levelCode: seg.level === 'free' ? 0 : seg.level === 'slow' ? 1 : seg.level === 'congested' ? 2 : 3,
            congestion: seg.congestionScore,
            speed: seg.speedKmh,
            anomaly: seg.anomalyScore || 0,
            arrondissement: seg.arrondissement || ''
          }
        )
      })

      // Sync KPIs to store
      const kpis = generateCityKPIs(cityNow)
      useTrafficStore.getState().setKPIs(kpis)
      
      // Persist to Supabase
      if (!isInitial) {
        await useTrafficStore.getState().persistSnapshot({
          city_id: cityNow.id,
          provider: provider,
          fetched_at: new Date().toISOString(),
          stats: {
            avg_congestion: kpis.congestionRate,
            incident_count: kpis.activeIncidents,
            active_segments: snapshot.segments.length
          },
          bbox: cityNow.bbox,
          raw_segments: snapshot,
        })
        toast.success(`Snapshot ${cityNow.name} synchronisé avec succès.`)
      }

      setLastSnapshot(new Date().toLocaleTimeString())
      setCountdown(600)
    } catch (err) {
      console.error('[Snapshot Engine] Error:', err)
      toast.error('Erreur lors de la synchronisation du snapshot.')
    } finally {
      setIsFetching(false)
    }
  }, [provider])

  // Scheduler with Visibility Guard
  useEffect(() => {
    if (!mapLoadedRef.current) return

    // Initial sync
    performSnapshot(true)

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (document.visibilityState === 'visible') {
            performSnapshot()
            return 600
          }
          return 1 // Stay at 1 if hidden until visible
        }
        return prev - 1
      })
    }, 1000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // If we were hidden and missed a sync, sync now
        if (countdownRef.current <= 1) performSnapshot()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [performSnapshot])

  // ─── Social Scheduler ──────────────────────────────────────────────
  
  const performSocialCollection = useCallback(async () => {
    const cityNow = cityRef.current
    const dataSourceNow = dataSourceRef.current
    if (dataSourceNow !== 'live' || document.visibilityState !== 'visible') return
    console.log('📡 [Social Engine] Triggering 10min collection for', cityNow.name)
    try {
      const { collectSocialSignals } = await import('@/lib/api/social')
      await collectSocialSignals(cityNow.id)
      // Optional: force refresh timeline state if needed
    } catch (err) {
      console.warn('[Social Engine] Collection failed:', err)
    }
  }, [])

  useEffect(() => {
    if (!mapLoadedRef.current) return

    // Initial collect
    performSocialCollection()

    // 10 minute interval
    socialIntervalRef.current = setInterval(performSocialCollection, 600000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        performSocialCollection()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      if (socialIntervalRef.current) clearInterval(socialIntervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [performSocialCollection])

  // ─── Social Pins Sync ──────────────────────────────────────────────
  const socialEvents = useSocialStore((s: any) => s.events)
  const socialRange  = useSocialStore((s: any) => s.timeRange)
  
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    const src = map.getSource(SOCIAL_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!src) return

    const now = Date.now()
    const filtered = socialEvents.filter((e: any) => {
      const diffMin = (now - new Date(e.captured_at).getTime()) / 60000
      return diffMin <= socialRange
    })

    src.setData({
      type: 'FeatureCollection',
      features: filtered.map((e: any) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: e.geo ? [extractCoordsFromPoint(e.geo).lng, extractCoordsFromPoint(e.geo).lat] : [city.center.lng + (Math.random()-0.5)*0.01, city.center.lat + (Math.random()-0.5)*0.01]
        },
        properties: {
          id: e.id,
          severity: e.severity,
          text: e.text,
          captured_at: e.captured_at,
          color: e.severity === 'critical' ? '#FF1744' : e.severity === 'high' ? '#FFD600' : '#22C55E'
        }
      }))
    })
  }, [mapLoaded, socialEvents, socialRange, city.center.lng, city.center.lat])

  // ─── Metro stations with line labels ─────────────────────────────────

  useEffect(() => {
    if (!mapLoaded) return
    if (osmMetroRef.current.has(city.id)) return

    fetchMetroStations(city.bbox).then(stations => {
      if (!stations.length) return
      osmMetroRef.current.set(city.id, stations)
      updateMetroStationsSource()
    })
  }, [city.id, mapLoaded]) // eslint-disable-line

  // ─── RATP real-time status → bus + metro route colors (Paris only) ───

  useEffect(() => {
    if (!mapLoaded || !isParis) return

    const applyRatp = async () => {
      const { lines } = await fetchAllTrafficStatus()
      const statusColors  = new Map<string, string>()
      const disrupted     = new Set<string>()

      for (const line of lines) {
        let color: string
        switch (line.status) {
          case 'interrompu': color = '#EF4444'; disrupted.add(line.slug); break
          case 'perturbé':   color = '#F59E0B'; disrupted.add(line.slug); break
          case 'travaux':    color = '#F97316'; disrupted.add(line.slug); break
          default:           color = line.color ?? LINE_COLORS[line.slug] ?? '#3B82F6'
        }
        statusColors.set(line.slug, color)
      }
      ratpStatusRef.current    = statusColors
      ratpDisruptedRef.current = disrupted
      updateTransitRoutesSource(statusColors)
      updateMetroStationsSource()   // re-render station markers with disruption flags
    }

    applyRatp()
    const iv = setInterval(applyRatp, 60_000)
    return () => clearInterval(iv)
  }, [mapLoaded, isParis, city.id]) // eslint-disable-line

  // ─── Vehicle position update (every 10 seconds) ───────────────────────





  // ─── Transit route polylines (bus + metro as colored lines) ──────────

  function updateTransitRoutesSource(ratpStatus: Map<string, string>) {
    const map    = mapRef.current
    const routes = osmRoutesRef.current.get(city.id)
    if (!map || !routes?.length) return
    const src = map.getSource(TRANSIT_ROUTES_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!src) return

    src.setData({
      type: 'FeatureCollection',
      features: routes.map(r => {
        // For Paris: override color from RATP status if available
        let color = r.colour
        const slug = r.ref.toUpperCase()
        const statusColor = ratpStatus.get(slug)
        if (statusColor) color = statusColor
        return {
          type:       'Feature' as const,
          geometry:   { type: 'LineString' as const, coordinates: r.coords },
          properties: { id: r.id, routeType: r.route, ref: r.ref, color, name: r.name },
        }
      }),
    })
  }

  // ─── Metro station markers with line numbers ──────────────────────────

  function updateMetroStationsSource() {
    const map      = mapRef.current
    const stations = osmMetroRef.current.get(city.id)
    if (!map || !stations?.length) return
    const src = map.getSource(METRO_STATIONS_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!src) return

    const disrupted   = ratpDisruptedRef.current
    const ratpStatus  = ratpStatusRef.current

    src.setData({
      type: 'FeatureCollection',
      features: stations.map(s => {
        const firstLine  = s.lines[0] ?? ''
        // RER lines are uppercase letters A-E; metro lines are numbers
        const isRer      = /^[A-E]$/.test(firstLine)
        // Use exact RATP status color (red=interrompu, amber=perturbé) or official line color
        const statusColor = ratpStatus.get(firstLine) ?? null
        const lineColor  = LINE_COLORS[firstLine] ?? (isRer ? '#E2231A' : '#8B5CF6')
        const color      = statusColor ?? lineColor

        // Disruption: any of the station's lines is disrupted
        const isDisrupted = s.lines.some(l => disrupted.has(l.toUpperCase()))

        // Importance: based on line count + major hubs
        let importance = 1.0 + (s.lines.length * 0.35)
        const isHub = METRO_HUBS.some((hub: string) => s.name.includes(hub))
        if (isHub) importance += 1.8
        if (s.lines.length >= 3) importance += 0.5


        // Label: show all lines separated by · (e.g. "1·4·7·14")

        const label = firstLine
          ? s.lines.length > 1
            ? s.lines.join('·')
            : firstLine
          : isRer ? 'RER' : 'M'

        return {
          type:       'Feature' as const,
          geometry:   { type: 'Point' as const, coordinates: [s.lng, s.lat] },
          properties: {
            id:         s.id,
            name:       s.name,
            lines:      s.lines.join('·'),
            lineCount:  s.lines.length,
            color,
            label,
            disrupted:  isDisrupted ? 1 : 0,
            importance,
            isRer:      isRer ? 1 : 0,
          },
        }
      }),
    })
  }


  // ─── Fly to city ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    popupRef.current?.remove()
    const west = city.bbox?.[0] ?? city.center.lng - 0.05
    const south = city.bbox?.[1] ?? city.center.lat - 0.05
    const east = city.bbox?.[2] ?? city.center.lng + 0.05
    const north = city.bbox?.[3] ?? city.center.lat + 0.05
    const padLng = Math.max((east - west) * 0.12, 0.01)
    const padLat = Math.max((north - south) * 0.12, 0.01)
    const maxBounds = new maplibregl.LngLatBounds(
      [west - padLng, south - padLat],
      [east + padLng, north + padLat],
    )
    const cityBounds = new maplibregl.LngLatBounds(
      [west, south],
      [east, north],
    )

    mapRef.current.setMaxBounds(maxBounds)
    mapRef.current.fitBounds(cityBounds, {
      padding: 28,
      duration: 1400,
      essential: true,
    })
  }, [city.id, mapLoaded]) // eslint-disable-line

  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !searchFocus) return

    const map = mapRef.current
    popupRef.current?.remove()

    if (!searchMarkerRef.current) {
      const el = document.createElement('div')
      el.className = 'cf-search-marker'
      el.innerHTML = '<div style="width:18px;height:18px;border-radius:999px;background:#0F172A;border:4px solid #22C55E;box-shadow:0 8px 24px rgba(34,197,94,0.28)"></div>'
      searchMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
    }

    searchMarkerRef.current
      .setLngLat([searchFocus.longitude, searchFocus.latitude])
      .addTo(map)

    if (searchFocus.bbox) {
      map.fitBounds(
        [
          [searchFocus.bbox[0], searchFocus.bbox[1]],
          [searchFocus.bbox[2], searchFocus.bbox[3]],
        ],
        {
          padding: 72,
          duration: 1400,
          maxZoom: 16,
          essential: true,
        },
      )
    } else {
      map.easeTo({
        center: [searchFocus.longitude, searchFocus.latitude],
        zoom: Math.max(map.getZoom(), 15),
        duration: 1200,
        essential: true,
      })
    }
  }, [mapLoaded, searchFocus])
 
  // ─── Predictive Simulation Results — Visual Sync ─────────────────────
  const simulationResult = useSimulationStore(s => s.currentResult)

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return

    const updatePredictiveLayers = async () => {
      const map = mapRef.current!
      const affectedSrc = map.getSource(PREDICTIVE_AFFECTED_SOURCE) as maplibregl.GeoJSONSource | undefined
      const eventsSrc   = map.getSource(PREDICTIVE_EVENTS_SOURCE) as maplibregl.GeoJSONSource | undefined

      if (!simulationResult && simulationRevision === 0) {
        // Clear when no simulation workflow is active yet
        affectedSrc?.setData({ type: 'FeatureCollection', features: [] })
        eventsSrc?.setData({ type: 'FeatureCollection', features: [] })
        return
      }

      try {
        const { predictiveApi } = await import('@/lib/api/predictive')

        // 1. Fetch geojson for all affected edges (slow OR blocked)
        const affectedGeoJSON = await predictiveApi.getAffectedEdges()
        if (affectedSrc) affectedSrc.setData(affectedGeoJSON)


        // 2. Clear events if not specifically handled
        eventsSrc?.setData({ type: 'FeatureCollection', features: [] })

      } catch (err) {
        console.error('Failed to refresh predictive layers:', err)
      }
    }

    updatePredictiveLayers()

  }, [simulationResult, simulationRevision, mapLoaded, simulationInteractionMode])


  // ─── Sim Event Location Marker ───────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const src = mapRef.current.getSource(SIM_LOCATION_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!src) return
    if (!eventLocation) {
      src.setData({ type: 'FeatureCollection', features: [] })
      return
    }
    src.setData({
      type: 'FeatureCollection',
      features: [{
        type:       'Feature',
        geometry:   { type: 'Point', coordinates: [eventLocation.lng, eventLocation.lat] },
        properties: {},
      }],
    })
  }, [eventLocation, mapLoaded])

  // ─── City boundary ────────────────────────────────────────────────────



  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const src = map.getSource(BOUNDARY_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!src) return

    if (!cityBoundary) {
      // Clear boundary and mask
      src.setData({ type: 'FeatureCollection', features: [] })
      const maskSrc = map.getSource(WORLD_MASK_SOURCE) as maplibregl.GeoJSONSource | undefined
      if (maskSrc) maskSrc.setData({ type: 'FeatureCollection', features: [] })
      return
    }

    src.setData({ type: 'FeatureCollection', features: [cityBoundary] })

    // ─── World Mask Update ───────────────────
    const maskSrc = map.getSource(WORLD_MASK_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (maskSrc) {
      const world = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]
      let coordinates: number[][][] = [world]

      if (cityBoundary.geometry.type === 'Polygon') {
        // Add current polygon as hole
        coordinates.push(...(cityBoundary.geometry.coordinates as number[][][]))
      } else if (cityBoundary.geometry.type === 'MultiPolygon') {
        // Add all polygons of MultiPolygon as holes
        (cityBoundary.geometry.coordinates as number[][][][]).forEach(poly => {
          coordinates.push(...poly)
        })
      }

      maskSrc.setData({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates },
        properties: {}
      })
    }

    // Compute bounds from polygon and fitBounds
    const coords = extractCoords(cityBoundary.geometry as any)
    if (coords.length === 0) return
    const lngs = coords.map(c => c[0])
    const lats = coords.map(c => c[1])
    const bounds = new maplibregl.LngLatBounds(
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    )
    map.fitBounds(bounds, { padding: 48, duration: 1600, essential: true })
  }, [cityBoundary, mapLoaded])

  // ─── City districts choropleth ────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const src = map.getSource(DISTRICTS_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!src) return

    src.setData({ type: 'FeatureCollection', features: [] }) // clear while loading
    if (!city.bbox || !isParisCity(city)) return
    const cityId = city.id

    fetchCityDistricts(city.center.lat, city.center.lng).then((districts: any[]) => {
      if (cityRef.current.id !== cityId) return
      const s = map.getSource(DISTRICTS_SOURCE) as maplibregl.GeoJSONSource | undefined
      if (s) {
        const fc: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: districts.map((d: any) => ({
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [d.bbox[0], d.bbox[1]],
                [d.bbox[2], d.bbox[1]],
                [d.bbox[2], d.bbox[3]],
                [d.bbox[0], d.bbox[3]],
                [d.bbox[0], d.bbox[1]]
              ]]
            },
            properties: {
              name: d.name,
              // Deterministic density from district name hash (avoids flickering)
              density: ((d.name.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) * 2654435761) >>> 0) / 4294967296 * 0.8 + 0.1,
              admin_level: 9
            }
          }))
        }
        s.setData(fc)
      }
    })
  }, [city, mapLoaded]) // eslint-disable-line

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const src = map.getSource(ENTRY_EXIT_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!src) return

    const shouldShowGateways = !!cityBoundary && isCompactCity(city)
    if (!shouldShowGateways || !snapshot?.segments?.length) {
      src.setData({ type: 'FeatureCollection', features: [] })
      return
    }

    const seen = new Set<string>()
    const features: GeoJSON.Feature[] = []

    snapshot.segments.forEach((segment) => {
      if (!['motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link'].includes(segment.roadType ?? '')) {
        return
      }

      for (let index = 1; index < segment.coordinates.length; index += 1) {
        const previous = segment.coordinates[index - 1]
        const current = segment.coordinates[index]
        const previousInside = pointInBoundary(previous, cityBoundary?.geometry)
        const currentInside = pointInBoundary(current, cityBoundary?.geometry)

        if (previousInside === currentInside) continue

        const gateway: [number, number] = [
          Number(((previous[0] + current[0]) / 2).toFixed(5)),
          Number(((previous[1] + current[1]) / 2).toFixed(5)),
        ]
        const key = gateway.join(':')
        if (seen.has(key)) continue
        seen.add(key)

        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: gateway },
          properties: {
            id: `${segment.id}-${index}`,
            label: segment.streetName || segment.axisName || 'Gateway',
            direction: previousInside ? 'Outbound' : 'Inbound',
          },
        })
        break
      }
    })

    src.setData({ type: 'FeatureCollection', features: features.slice(0, 12) })
  }, [city, cityBoundary, mapLoaded, snapshot])
 
  // ─── Data refresh ─────────────────────────────────────────────────────

  const refreshData = useCallback(async () => {
    if (!mapRef.current || !mapLoadedRef.current) return

    // CRITICAL: Stop background work if tab is inactive
    if (document.visibilityState === 'hidden') return

    // Throttle: prevent multiple rapid refreshes (min 5s interval)
    const nowTs = Date.now()
    if (nowTs - lastRefreshRef.current < 5000) return
    lastRefreshRef.current = nowTs
    const requestId = ++refreshRequestRef.current

    const map = mapRef.current
    const bounds = map.getBounds()
    const viewportBbox: [number, number, number, number] = [
      bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()
    ]

    const cityNow = cityRef.current
    const activeLayersNow = activeLayersRef.current
    const useHere = hereHasKey()
    const useTomTom  = useLiveData
    const isRequestCurrent = () =>
      refreshRequestRef.current === requestId &&
      cityRef.current.id === cityNow.id &&
      mapRef.current === map

    // ── 1. Determine base snapshot (never required for road rendering) ──
    let snapshot = (await loadCachedSnapshot(cityNow.id)) ?? generateTrafficSnapshot(cityNow)
    if (!isRequestCurrent()) return
    if (snapshot.segments.length > 0) {
      setSnapshot(snapshot)
      setDataSource('live')
      console.log('[CrossFlow] Loaded cached snapshot', {
        city: cityNow.id,
        segments: snapshot.segments.length,
      })
    }

    if (useHere) {
      try {
        const hereFlow = await fetchHereFlow(viewportBbox)
        if (!isRequestCurrent()) return
        if (hereFlow.length > 0) {
          const hereSnapshot = buildSnapshotFromHereFlow(cityNow, hereFlow)
          snapshot = fuseTrafficSnapshots(snapshot, hereSnapshot)
          setDataSource('live')
          console.log('[CrossFlow] HERE flow fused', {
            sourceSegments: hereFlow.length,
            fusedSegments: snapshot.segments.length,
          })
        }
      } catch (error) {
        console.warn('[CrossFlow] HERE flow fusion failed', error)
      }
    }

    console.log('[CrossFlow] Base snapshot generated', {
      city: cityNow.id,
      segments: snapshot.segments.length,
      dataSource: dataSourceRef.current,
    })

    const synthetic = generateIncidents(cityNow)
    if (!isRequestCurrent()) return
    setSnapshot(snapshot)

    let incidents: Incident[] = synthetic

    // ── 2. Fetch incidents only. Road geometry is now always local/synchronous. ──
    if (useTomTom) {
      // Fetch real TomTom incidents for current viewport
      console.log('[DataSource] TomTom Incidents request started for bbox:', viewportBbox)
      try {
        const tomtomIncs = await fetchTomTomIncidents(viewportBbox)
        console.log('[DataSource] TomTom Incidents response:', tomtomIncs.length, 'incidents')
        if (!isRequestCurrent()) return
        if (tomtomIncs.length > 0) {
          incidents = tomtomIncs.map(inc => ({
          id:          inc.id,
          type:        mapIncidentType(inc.iconCategory),
          severity:    tomtomSeverityToLocal(inc.magnitudeOfDelay),
          title:       inc.description || `Incident sur ${inc.from || 'route'}`,
          description: `${inc.from ? 'De ' + inc.from : ''}${inc.to ? ' vers ' + inc.to : ''}. Délai: ${Math.round(inc.delay / 60)} min.`,
          location:    { lat: inc.point.latitude, lng: inc.point.longitude },
          address:     inc.roadNumbers.join(', ') || `${cityNow.name}`,
          startedAt:   inc.startTime,
          resolvedAt:  inc.endTime,
          source:      'CrossFlow Intelligence Engine',
          iconColor:   getSeverityColor(tomtomSeverityToLocal(inc.magnitudeOfDelay)),
        }))
            console.log('[DataSource] TomTom Incidents applied, setting to live mode')
            setDataSource('live')
          }
        } catch (err) {
          console.error('[DataSource] TomTom Incidents request failed:', err instanceof Error ? err.message : String(err))
          console.log('[DataSource] Using synthetic incidents')
          setDataSource('synthetic')
        }
      } else {
        console.log('[DataSource] No incident provider enabled, using synthetic incidents')
        setDataSource('synthetic')
      }

    if (!snapshot) return
    if (!isRequestCurrent()) return

    const snappedSnapshot = snapshot
    if (!isRequestCurrent()) return

    setSnapshot(snappedSnapshot)
    const incidentSplit = splitIncidents(incidents)
    setIncidents(incidents)

    // --- High Performance: UCTN Property Updates ---
    if (safeGetSource(map, TRAFFIC_SOURCE)) {
      // Update state for current live data
      snappedSnapshot.segments.forEach(seg => {
        safeSetFeatureState(map,
          { source: TRAFFIC_SOURCE, id: seg.id },
          { 
            hasData: hasObservedTraffic(seg),
            levelCode: scoreToCongestionLevel(seg.congestionScore) === 'free' ? 0 : 
                      scoreToCongestionLevel(seg.congestionScore) === 'slow' ? 1 :
                      scoreToCongestionLevel(seg.congestionScore) === 'congested' ? 2 : 3,
            anomaly: seg.anomalyScore || 0,
            arrondissement: seg.arrondissement || ''
          }
        )
      })

      // Update state for prediction
      snappedSnapshot.segments.forEach(seg => {
        // Simulated +30m delta
        const currentScore = seg.congestionScore
        const predictedScore = Math.min(1, currentScore + 0.15)
        safeSetFeatureState(map,
          { source: TRAFFIC_PREDICTION_SOURCE, id: seg.id },
          { hasData: hasObservedTraffic(seg),
            levelCode: scoreToCongestionLevel(predictedScore) === 'free' ? 0 : 
                       scoreToCongestionLevel(predictedScore) === 'slow' ? 1 :
                       scoreToCongestionLevel(predictedScore) === 'congested' ? 2 : 3 }
        )
      })

      const trafficGeo = buildTrafficFeatureCollection(snappedSnapshot.segments, map.getZoom(), isMobile)
      const s1 = safeGetSource(map, TRAFFIC_SOURCE) as maplibregl.GeoJSONSource | null
      const s2 = safeGetSource(map, TRAFFIC_PREDICTION_SOURCE) as maplibregl.GeoJSONSource | null
      if (s1) s1.setData(trafficGeo)
      if (s2) s2.setData(trafficGeo)
      console.log('[CrossFlow] Traffic layer state', {
        segments: snappedSnapshot.segments.length,
        observed: snappedSnapshot.segments.filter(hasObservedTraffic).length,
        estimated: snappedSnapshot.segments.filter(seg => seg.estimatedTraffic === true).length,
        trafficVisible: activeLayersNow.has('traffic'),
      })
      // ─── A/B Split View Filtering ───
      if (modeRef.current === 'predict') {
        const filters: any = ['<', ['get', 'midpoint_lng'], splitLngRef.current]
        safeSetFilter(map, TRAFFIC_SOURCE + '-lines', filters)
        safeSetFilter(map, TRAFFIC_SOURCE + '-glow',  filters)
        safeSetFilter(map, TRAFFIC_SOURCE + '-halo',  filters)
        safeSetFilter(map, TRAFFIC_PREDICTION_SOURCE + '-lines', ['>', ['get', 'midpoint_lng'], splitLngRef.current] as any)
      } else {
        // Reset filters in other modes
        safeSetFilter(map, TRAFFIC_SOURCE + '-lines', null)
        safeSetFilter(map, TRAFFIC_SOURCE + '-glow',  null)
        safeSetFilter(map, TRAFFIC_SOURCE + '-halo',  null)
        safeSetFilter(map, TRAFFIC_PREDICTION_SOURCE + '-lines', null)
      }
    }

    // --- Heatmaps & Incidents ---
    if (activeLayersNow.has('heatmap') || isDecisionMap) {
      scheduleCongestionHeatmapUpdate(snapshot.heatmap, map.getZoom())
    }

    const incGeo: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: incidents.map(inc => ({
        type:     'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [inc.location.lng, inc.location.lat] },
        properties: { id: inc.id, title: inc.title, severity: inc.severity, color: inc.iconColor },
      })),
    }
    const iSrc = safeGetSource(map, INCIDENT_SOURCE) as maplibregl.GeoJSONSource | null
    if (iSrc) iSrc.setData(incGeo)
    console.log('[CrossFlow] Incident layer state', {
      incidents: incidents.length,
      active: activeLayersNow.has('incidents'),
      tomtomEnabled: useTomTom,
    })

    // Boundary
    const bSrc = safeGetSource(map, BOUNDARY_SOURCE) as maplibregl.GeoJSONSource | null
    if (bSrc && cityBoundary) bSrc.setData(cityBoundary)

    if (isDecisionMap) {
      const trafficGeo = buildTrafficFeatureCollection(snappedSnapshot.segments, map.getZoom(), isMobile)

      const flowGeo = {
        type: 'FeatureCollection' as const,
        features: buildFlowMarkers(snappedSnapshot.segments) as GeoJSON.Feature[],
      }
      const criticalGeo = {
        type: 'FeatureCollection' as const,
        features: incidentSplit.critical.map(inc => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [inc.location.lng, inc.location.lat] },
          properties: { id: inc.id, title: inc.title, severity: inc.severity, color: inc.iconColor, type: inc.type },
        })),
      }
      const clusterGeo = {
        type: 'FeatureCollection' as const,
        features: incidentSplit.clusterable.map(inc => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [inc.location.lng, inc.location.lat] },
          properties: { id: inc.id, title: inc.title, severity: inc.severity, color: inc.iconColor, type: inc.type },
        })),
      }

      const trafficSrc = safeGetSource(map, TRAFFIC_SOURCE) as maplibregl.GeoJSONSource | null
      const predSrc = safeGetSource(map, TRAFFIC_PREDICTION_SOURCE) as maplibregl.GeoJSONSource | null
      const flowSrc = safeGetSource(map, TRAFFIC_FLOW_SOURCE) as maplibregl.GeoJSONSource | null
      const clusterSrc = safeGetSource(map, INCIDENT_SOURCE) as maplibregl.GeoJSONSource | null
      const criticalSrc = safeGetSource(map, INCIDENT_CRITICAL_SOURCE) as maplibregl.GeoJSONSource | null
      if (trafficSrc) trafficSrc.setData(trafficGeo)
      if (predSrc) predSrc.setData(trafficGeo)
      if (flowSrc) flowSrc.setData(flowGeo)
      if (clusterSrc) clusterSrc.setData(clusterGeo)
      if (criticalSrc) criticalSrc.setData(criticalGeo)
    }

    if (!isRequestCurrent()) return
    previousSnapshotRef.current = snapshot
  }, [scheduleCongestionHeatmapUpdate, setSnapshot, setIncidents, setDataSource])

  useEffect(() => { refreshDataRef.current = refreshData }, [refreshData])

  useEffect(() => {
    if (!mapLoaded) return
    refreshData()
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    // Viewport-aware refresh: update when user stops moving/zooming
    const onMoveEnd = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        refreshData()
      }, 180)
    }
    mapRef.current?.on('moveend', onMoveEnd)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      mapRef.current?.off('moveend', onMoveEnd)
    }
  }, [mapLoaded, refreshData])

  // ─── 10-Minute Persistence Sampler (Staff Engineer Architecture) ───────
  useEffect(() => {
    if (!mapLoadedRef.current || mode !== 'live') return

    let lastSnapshotTime = 0
    let interval: NodeJS.Timeout | null = null

    const capture = async () => {
      const snapshotNow = snapshotRef.current
      const incidentsNow = incidentsRef.current
      const cityNow = cityRef.current
      const dataSourceNow = dataSourceRef.current
      if (document.hidden || !snapshotNow) return
      
      const now = Date.now()
      if (now - lastSnapshotTime < 550000) return // Throttle to ~10 min

      console.log('[Snapshot Sampler] Capturing state for city:', cityNow.id)
      setIsSyncing(true)
      
      try {
        const { saveSnapshot } = await import('@/lib/api/snapshots')
        await saveSnapshot({
          city_id:  cityNow.id,
          provider: dataSourceNow,
          fetched_at: new Date().toISOString(),
          stats:    { 
            avg_congestion: snapshotNow.segments.length
              ? snapshotNow.segments.reduce((a, b) => a + b.congestionScore, 0) / snapshotNow.segments.length
              : 0,
            incident_count: incidentsNow.length,
            active_segments: snapshotNow.segments.length 
          },
          bbox: cityNow.bbox,
          raw_segments: snapshotNow,
        })
        setLastSync(new Date())
      } catch (err) {
        console.warn('[Snapshot Sampler] Persistence failed:', err)
      } finally {
        setIsSyncing(false)
        lastSnapshotTime = Date.now()
      }
    }

    // Capture immediately, then every 10 min
    capture()
    interval = setInterval(capture, 600000)

    // Visibility Guard: don't capture if tab is hidden
    const onVisibilityChange = () => {
      if (!document.hidden) capture()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [mode, setIsSyncing, setLastSync])

  // ─── Simulation overlay — tint segment colors by delta ────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const tSrc = map.getSource(TRAFFIC_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!tSrc) return

    if (!currentResult || !snapshot) return

    // Apply congestion delta proportionally to each segment
    const { congestionPct } = currentResult.delta
    const simFeatures: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: snapshot.segments.map(seg => {
        const simCongestion = Math.max(0, Math.min(1, seg.congestionScore + congestionPct))
        const level = scoreToCongestionLevel(simCongestion)
        const speedKmh = getCredibleSpeedKmh(seg.speedKmh, seg.freeFlowSpeedKmh, simCongestion)
        const speedRatio = clamp01(speedKmh / Math.max(seg.freeFlowSpeedKmh, 1))
        const hasObserved = hasObservedTraffic(seg)
        return {
          type:       'Feature' as const,
          id:         seg.id,
          geometry:   { type: 'LineString' as const, coordinates: seg.coordinates },
          properties: {
            id: seg.id,
            congestion: simCongestion,
            speed: speedKmh,
            speedKmh,
            freeFlowSpeedKmh: seg.freeFlowSpeedKmh,
            speedRatio,
            predictedSpeedRatio: speedRatio,
            level,
            color: hasObserved ? congestionColor(simCongestion) : '#D1D5DB',
            width: computeRoadWidth(seg.roadType, level, map.getZoom(), isMobile),
            roadType: seg.roadType,
            highway: seg.roadType,
            streetName: seg.streetName,
            axisName: seg.axisName,
            dist: seg.arrondissement,
            importance: clamp01(seg.priorityAxis ?? 0.35),
            hasObservedTraffic: hasObserved,
            isEstimatedTraffic: seg.estimatedTraffic === true,
            midpoint_lng: seg.coordinates[Math.floor(seg.coordinates.length / 2)]?.[0] ?? 0,
            corridorLabel: hasObserved ? (seg.streetName || seg.axisName || 'Urban corridor') : '',
          },
          }
      }),
    }
    tSrc.setData(simFeatures)

    // Restore normal data when result is cleared
    return () => {
      if (!mapRef.current) return
      const src = mapRef.current.getSource(TRAFFIC_SOURCE) as maplibregl.GeoJSONSource | undefined
      if (src && snapshot) {
        const geo = buildTrafficFeatureCollection(snapshot.segments, mapRef.current.getZoom(), isMobile)
        src.setData(geo)
      }
    }
  }, [currentResult, snapshot, mapLoaded]) // eslint-disable-line



  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const IDF_SOURCE = 'cf-idf-roads'

    const removeIdfLayer = () => {
      if (map.getLayer(IDF_SOURCE + '-lines')) map.removeLayer(IDF_SOURCE + '-lines')
      if (map.getLayer(IDF_SOURCE + '-labels')) map.removeLayer(IDF_SOURCE + '-labels')
      if (map.getSource(IDF_SOURCE)) map.removeSource(IDF_SOURCE)
    }

    if (!currentResult) {
      removeIdfLayer()
      return
    }

    // Compute bbox from current map bounds (or city center fallback)
    const bounds = map.getBounds()
    const bbox = [
      bounds.getWest(), bounds.getSouth(),
      bounds.getEast(), bounds.getNorth(),
    ].map(v => Math.round(v * 1000) / 1000).join(',')

    const url = `/api/idf-roads?frc=1,2,3&bbox=${bbox}&limit=400`

    fetch(url, { cache: 'force-cache' })
      .then(r => r.ok ? r.json() : null)
      .then((geojson: GeoJSON.FeatureCollection | null) => {
        if (!geojson || !map.isStyleLoaded()) return

        // Add or update source
        const existingSrc = map.getSource(IDF_SOURCE) as maplibregl.GeoJSONSource | undefined
        if (existingSrc) {
          existingSrc.setData(geojson)
        } else {
          map.addSource(IDF_SOURCE, { type: 'geojson', data: geojson })

          // Color by FRC
          map.addLayer({
            id:     IDF_SOURCE + '-lines',
            type:   'line',
            source: IDF_SOURCE,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint:  {
              'line-color': [
                'match', ['get', 'frc'],
                1, '#FF1744',   // autoroutes
                2, '#FF6D00',   // nationales
                3, '#FFB300',   // artères
                '#4CAF50',      // default
              ],
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                8,  ['match', ['get', 'frc'], 1, 2, 2, 1.5, 1],
                13, ['match', ['get', 'frc'], 1, 4, 2, 3, 2],
                17, ['match', ['get', 'frc'], 1, 6, 2, 5, 3],
              ],
              'line-opacity': 0.55,
            },
          }, TRAFFIC_SOURCE + '-lines') // insert below traffic layer

          map.addLayer({
            id:        IDF_SOURCE + '-labels',
            type:      'symbol',
            source:    IDF_SOURCE,
            minzoom:   13,
            layout:    {
              'symbol-placement': 'line',
              'text-field':       ['get', 'roadName'],
              'text-size':        10,
              'text-max-angle':   30,
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': '#000000',
              'text-halo-width': 1,
              'text-opacity': 0.7,
            },
          })
          applyTrafficRenderingHierarchy(map)
        }
      })
      .catch(() => {})

    return removeIdfLayer
  }, [currentResult, mapLoaded]) // eslint-disable-line

  // ─── Predictive Backend Sync (Affected roads + Events) ──────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current

    if (!currentResult || !currentResult.predictive) {
      const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
      const affSrc = safeGetSource(map, PREDICTIVE_AFFECTED_SOURCE) as maplibregl.GeoJSONSource | null
      const evtSrc = safeGetSource(map, PREDICTIVE_EVENTS_SOURCE) as maplibregl.GeoJSONSource | null
      if (affSrc) affSrc.setData(empty)
      if (evtSrc) evtSrc.setData(empty)
      return
    }

    // Fetch and sync affected edges (real OSM segments from backend)
    simulationService.getAffectedEdges().then(geojson => {
      const src = safeGetSource(map, PREDICTIVE_AFFECTED_SOURCE) as maplibregl.GeoJSONSource | null
      if (src && geojson) src.setData(geojson)
    })

    // Fetch and sync active events (labels + icons)
    simulationService.getEvents().then(geojson => {
      const src = safeGetSource(map, PREDICTIVE_EVENTS_SOURCE) as maplibregl.GeoJSONSource | null
      if (src && geojson) src.setData(geojson)
    })
  }, [currentResult, mapLoaded])

  // ─── Simulation Click Location ──────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const loc = useSimulationStore.getState().eventLocation

    const src = safeGetSource(map, SIM_LOCATION_SOURCE) as maplibregl.GeoJSONSource | null
    if (!src) return

    if (!loc) {
      src.setData({ type: 'FeatureCollection', features: [] })
      return
    }

    src.setData({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
      properties: {}
    })
  }, [useSimulationStore.getState().eventLocation, mapLoaded])

  // ─── Layer visibility ─────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const quickFiltersNeutral = isQuickFilterSetNeutral(activeQuickFilters)
    const trafficEnabledByQuickFilter =
      quickFiltersNeutral || activeQuickFilters.has('congestion') || activeQuickFilters.has('flux')
    const incidentsEnabledByQuickFilter =
      quickFiltersNeutral || activeQuickFilters.has('incidents') || activeQuickFilters.has('travaux')
    const flowEnabledByQuickFilter = quickFiltersNeutral || activeQuickFilters.has('flux')
    const trafficVis = !debugMode && activeLayers.has('traffic') && trafficEnabledByQuickFilter ? 'visible' : 'none'
    const incidentsVis = activeLayers.has('incidents') && incidentsEnabledByQuickFilter ? 'visible' : 'none'
    const flowVis = activeLayers.has('flow') && flowEnabledByQuickFilter && !activeLayers.has('traffic') ? 'visible' : 'none'
    const boundaryVis = activeLayers.has('boundary') ? 'visible' : 'none'
    const districtsVis = activeLayers.has('boundary') && isParisCity(city) ? 'visible' : 'none'
    const gatewaysVis = activeLayers.has('boundary') && isCompactCity(city) ? 'visible' : 'none'
    const heatVis = isDecisionMap ? 'visible' : (activeLayers.has('heatmap') ? 'visible' : 'none')
    const inactiveHeatSource = activeHeatSourceRef.current === HEATMAP_SOURCE ? HEATMAP_FADE_SOURCE : HEATMAP_SOURCE
    const trafficPaintOpacity = activeLayers.has('traffic')
      ? (activeLayers.has('heatmap') ? 0.72 : 0.9)
      : 0
    const trafficHaloOpacity = activeLayers.has('traffic')
      ? (activeLayers.has('heatmap') ? 0.22 : 0.34)
      : 0
    const heatmapAlpha = activeLayers.has('heatmap')
      ? (activeLayers.has('traffic') ? 0.72 : 1)
      : 0

    safeSetLayoutProperty(map, TRAFFIC_SOURCE + '-halo', 'visibility', trafficVis)
    safeSetLayoutProperty(map, TRAFFIC_SOURCE + '-lines', 'visibility', trafficVis)
    safeSetLayoutProperty(map, TRAFFIC_SOURCE + '-glow', 'visibility', 'none')
    safeSetLayoutProperty(map, TRAFFIC_SOURCE + '-corridor-labels', 'visibility', 'none')
    safeSetLayoutProperty(map, TRAFFIC_PREDICTION_SOURCE + '-lines', 'visibility', isDecisionMap ? 'none' : trafficVis)
    safeSetLayoutProperty(map, TRAFFIC_HOVER_SOURCE + '-glow', 'visibility', trafficVis)
    safeSetLayoutProperty(map, TRAFFIC_HOVER_SOURCE + '-line', 'visibility', trafficVis)
    safeSetLayoutProperty(map, TRAFFIC_FOCUS_SOURCE + '-glow', 'visibility', trafficVis)
    safeSetLayoutProperty(map, TRAFFIC_FOCUS_SOURCE + '-line', 'visibility', trafficVis)
    safeSetLayoutProperty(map, TRAFFIC_SELECTION_SOURCE + '-glow', 'visibility', trafficVis)
    safeSetLayoutProperty(map, TRAFFIC_SELECTION_SOURCE + '-line', 'visibility', trafficVis)
    safeSetLayoutProperty(map, TRAFFIC_SELECTION_SOURCE + '-label', 'visibility', trafficVis)
    safeSetLayoutProperty(map, TRAFFIC_ZONE_SOURCE + '-fill', 'visibility', 'none')
    safeSetLayoutProperty(map, TRAFFIC_ZONE_SOURCE + '-line', 'visibility', 'none')
    safeSetLayoutProperty(map, 'cf-idf-roads-lines', 'visibility', trafficVis)
    safeSetLayoutProperty(map, 'cf-idf-roads-labels', 'visibility', 'none')
    safeSetPaintProperty(map, TRAFFIC_SOURCE + '-lines', 'line-opacity', trafficPaintOpacity)
    safeSetPaintProperty(map, TRAFFIC_SOURCE + '-halo', 'line-opacity', trafficHaloOpacity)
    setCongestionHeatmapStackOpacity(map, activeHeatSourceRef.current, heatmapAlpha)
    setCongestionHeatmapStackOpacity(map, inactiveHeatSource, heatmapAlpha * 0.4)
    setCongestionHeatmapStackVisibility(map, activeHeatSourceRef.current, heatVis, heatVis)
    setCongestionHeatmapStackVisibility(map, inactiveHeatSource, heatVis, 'none')
    safeSetLayoutProperty(map, TRAFFIC_FLOW_SOURCE + '-layer', 'visibility', flowVis)

    safeSetLayoutProperty(map, INCIDENT_SOURCE + '-cluster-glow', 'visibility', incidentsVis)
    safeSetLayoutProperty(map, INCIDENT_SOURCE + '-cluster', 'visibility', incidentsVis)
    safeSetLayoutProperty(map, INCIDENT_SOURCE + '-count', 'visibility', incidentsVis)
    safeSetLayoutProperty(map, INCIDENT_SOURCE + '-unclustered', 'visibility', incidentsVis)
    safeSetLayoutProperty(map, INCIDENT_SOURCE + '-label', 'visibility', 'none')
    safeSetLayoutProperty(map, INCIDENT_CRITICAL_SOURCE + '-glow', 'visibility', incidentsVis)
    safeSetLayoutProperty(map, INCIDENT_CRITICAL_SOURCE + '-dot', 'visibility', incidentsVis)
    safeSetLayoutProperty(map, INCIDENT_CRITICAL_SOURCE + '-label', 'visibility', 'none')

    if (isDecisionMap) {
      safeSetLayoutProperty(map, TRAFFIC_SOURCE + '-lines', 'visibility', trafficVis)
      safeSetLayoutProperty(map, TRAFFIC_SOURCE + '-glow', 'visibility', 'none')
      safeSetLayoutProperty(map, TRAFFIC_SOURCE + '-corridor-labels', 'visibility', 'none')
      safeSetLayoutProperty(map, TRAFFIC_PREDICTION_SOURCE + '-lines', 'visibility', 'none')
      safeSetLayoutProperty(map, TRAFFIC_HOVER_SOURCE + '-glow', 'visibility', trafficVis)
      safeSetLayoutProperty(map, TRAFFIC_HOVER_SOURCE + '-line', 'visibility', trafficVis)
      safeSetLayoutProperty(map, TRAFFIC_FOCUS_SOURCE + '-glow', 'visibility', trafficVis)
      safeSetLayoutProperty(map, TRAFFIC_FOCUS_SOURCE + '-line', 'visibility', trafficVis)
      safeSetLayoutProperty(map, TRAFFIC_SELECTION_SOURCE + '-glow', 'visibility', trafficVis)
      safeSetLayoutProperty(map, TRAFFIC_SELECTION_SOURCE + '-line', 'visibility', trafficVis)
      safeSetLayoutProperty(map, TRAFFIC_SELECTION_SOURCE + '-label', 'visibility', trafficVis)
      safeSetLayoutProperty(map, TRAFFIC_ZONE_SOURCE + '-fill', 'visibility', trafficVis)
      safeSetLayoutProperty(map, TRAFFIC_ZONE_SOURCE + '-line', 'visibility', trafficVis)
      safeSetLayoutProperty(map, 'cf-idf-roads-lines', 'visibility', trafficVis)
      safeSetLayoutProperty(map, 'cf-idf-roads-labels', 'visibility', 'none')
      safeSetLayoutProperty(map, TRAFFIC_FLOW_SOURCE + '-layer', 'visibility', flowVis)
      safeSetLayoutProperty(map, INCIDENT_SOURCE + '-cluster-glow', 'visibility', incidentsVis)
      safeSetLayoutProperty(map, INCIDENT_SOURCE + '-cluster', 'visibility', incidentsVis)
      safeSetLayoutProperty(map, INCIDENT_SOURCE + '-count', 'visibility', incidentsVis)
      safeSetLayoutProperty(map, INCIDENT_SOURCE + '-unclustered', 'visibility', incidentsVis)
      safeSetLayoutProperty(map, INCIDENT_SOURCE + '-label', 'visibility', 'none')
      safeSetLayoutProperty(map, INCIDENT_CRITICAL_SOURCE + '-glow', 'visibility', incidentsVis)
      safeSetLayoutProperty(map, INCIDENT_CRITICAL_SOURCE + '-dot', 'visibility', incidentsVis)
      safeSetLayoutProperty(map, INCIDENT_CRITICAL_SOURCE + '-label', 'visibility', 'none')
    }

    // Boundary layers
    safeSetLayoutProperty(map, BOUNDARY_SOURCE + '-glow-outer', 'visibility', boundaryVis)
    safeSetLayoutProperty(map, BOUNDARY_SOURCE + '-glow',       'visibility', boundaryVis)
    safeSetLayoutProperty(map, BOUNDARY_SOURCE + '-fill',       'visibility', boundaryVis)
    safeSetLayoutProperty(map, BOUNDARY_SOURCE + '-line',       'visibility', boundaryVis)
    safeSetLayoutProperty(map, BOUNDARY_SOURCE + '-label',      'visibility', 'none')

    safeSetLayoutProperty(map, DISTRICTS_SOURCE + '-fill',  'visibility', districtsVis)
    safeSetLayoutProperty(map, DISTRICTS_SOURCE + '-line',  'visibility', districtsVis)
    safeSetLayoutProperty(map, DISTRICTS_SOURCE + '-label', 'visibility', 'none')
    safeSetLayoutProperty(map, ENTRY_EXIT_SOURCE + '-halo', 'visibility', gatewaysVis)
    safeSetLayoutProperty(map, ENTRY_EXIT_SOURCE + '-circle', 'visibility', gatewaysVis)
    safeSetLayoutProperty(map, ENTRY_EXIT_SOURCE + '-label', 'visibility', 'none')

    safeSetLayoutProperty(map, TOMTOM_FLOW + '-layer', 'visibility', 'none')
    safeSetLayoutProperty(map, TOMTOM_INC  + '-layer', 'visibility', 'none')

    const transportVis = activeLayers.has('transport') ? 'visible' : 'none'
    safeSetLayoutProperty(map, VEHICLES_SOURCE + '-glow',  'visibility', transportVis)
    safeSetLayoutProperty(map, VEHICLE_TRAILS_SOURCE + '-glow', 'visibility', transportVis)
    safeSetLayoutProperty(map, VEHICLE_TRAILS_SOURCE + '-line', 'visibility', transportVis)
    safeSetLayoutProperty(map, VEHICLES_SOURCE + '-layer', 'visibility', transportVis)
    safeSetLayoutProperty(map, VEHICLES_SOURCE + '-label', 'visibility', 'none')
    
    // Vehicle selection highlight visibility
    const selectedVehVis = (transportVis === 'visible' && selectedVehicleId !== null) ? 'visible' : 'none'
    safeSetLayoutProperty(map, VEHICLES_SOURCE + '-selected-ring', 'visibility', selectedVehVis)
    safeSetLayoutProperty(map, VEHICLES_SOURCE + '-selected-dot',  'visibility', selectedVehVis)
    
    // Transit route polylines

    safeSetLayoutProperty(map, TRANSIT_ROUTES_SOURCE + '-bus',    'visibility', transportVis)
    safeSetLayoutProperty(map, TRANSIT_ROUTES_SOURCE + '-metro',  'visibility', transportVis)
    // Metro station markers
    safeSetLayoutProperty(map, METRO_STATIONS_SOURCE + '-glow',   'visibility', transportVis)
    safeSetLayoutProperty(map, METRO_STATIONS_SOURCE + '-ring',   'visibility', transportVis)
    safeSetLayoutProperty(map, METRO_STATIONS_SOURCE + '-dot',    'visibility', transportVis)
    safeSetLayoutProperty(map, METRO_STATIONS_SOURCE + '-lineref','visibility', 'none')
    safeSetLayoutProperty(map, METRO_STATIONS_SOURCE + '-name',   'visibility', 'none')
    safeSetLayoutProperty(map, METRO_STATIONS_SOURCE + '-alert',  'visibility', transportVis)
    if (isDecisionMap) {
      safeSetLayoutProperty(map, BOUNDARY_SOURCE + '-glow-outer', 'visibility', 'none')
      safeSetLayoutProperty(map, BOUNDARY_SOURCE + '-glow', 'visibility', 'none')
      safeSetLayoutProperty(map, BOUNDARY_SOURCE + '-fill', 'visibility', 'none')
      safeSetLayoutProperty(map, BOUNDARY_SOURCE + '-line', 'visibility', 'none')
      safeSetLayoutProperty(map, BOUNDARY_SOURCE + '-label', 'visibility', 'none')
      safeSetLayoutProperty(map, DISTRICTS_SOURCE + '-fill', 'visibility', 'none')
      safeSetLayoutProperty(map, DISTRICTS_SOURCE + '-line', 'visibility', 'none')
      safeSetLayoutProperty(map, DISTRICTS_SOURCE + '-label', 'visibility', 'none')
      safeSetLayoutProperty(map, ENTRY_EXIT_SOURCE + '-halo', 'visibility', 'none')
      safeSetLayoutProperty(map, ENTRY_EXIT_SOURCE + '-circle', 'visibility', 'none')
      safeSetLayoutProperty(map, ENTRY_EXIT_SOURCE + '-label', 'visibility', 'none')
      safeSetLayoutProperty(map, VEHICLES_SOURCE + '-glow', 'visibility', 'none')
      safeSetLayoutProperty(map, VEHICLE_TRAILS_SOURCE + '-glow', 'visibility', 'none')
      safeSetLayoutProperty(map, VEHICLE_TRAILS_SOURCE + '-line', 'visibility', 'none')
      safeSetLayoutProperty(map, VEHICLES_SOURCE + '-layer', 'visibility', 'none')
      safeSetLayoutProperty(map, VEHICLES_SOURCE + '-label', 'visibility', 'none')
      safeSetLayoutProperty(map, TRANSIT_ROUTES_SOURCE + '-bus', 'visibility', 'none')
      safeSetLayoutProperty(map, TRANSIT_ROUTES_SOURCE + '-metro', 'visibility', 'none')
      safeSetLayoutProperty(map, METRO_STATIONS_SOURCE + '-glow', 'visibility', 'none')
      safeSetLayoutProperty(map, METRO_STATIONS_SOURCE + '-ring', 'visibility', 'none')
      safeSetLayoutProperty(map, METRO_STATIONS_SOURCE + '-dot', 'visibility', 'none')
      safeSetLayoutProperty(map, METRO_STATIONS_SOURCE + '-lineref', 'visibility', 'none')
      safeSetLayoutProperty(map, METRO_STATIONS_SOURCE + '-name', 'visibility', 'none')
      safeSetLayoutProperty(map, METRO_STATIONS_SOURCE + '-alert', 'visibility', 'none')
      setCongestionHeatmapStackVisibility(map, HEATMAP_SOURCE, 'none', 'none')
      setCongestionHeatmapStackVisibility(map, HEATMAP_FADE_SOURCE, 'none', 'none')
      safeSetLayoutProperty(map, HEATMAP_PASSAGES_SOURCE + '-layer', 'visibility', 'none')
      safeSetLayoutProperty(map, HEATMAP_PASSAGES_SOURCE + '-circles', 'visibility', 'none')
      safeSetLayoutProperty(map, HEATMAP_CO2_SOURCE + '-layer', 'visibility', 'none')
      safeSetLayoutProperty(map, HEATMAP_CO2_SOURCE + '-circles', 'visibility', 'none')
      safeSetLayoutProperty(map, PREDICTIVE_AFFECTED_SOURCE + '-glow', 'visibility', 'none')
      safeSetLayoutProperty(map, PREDICTIVE_AFFECTED_SOURCE + '-lines', 'visibility', 'none')
      safeSetLayoutProperty(map, PREDICTIVE_EVENTS_SOURCE + '-circles', 'visibility', 'none')
      safeSetLayoutProperty(map, PREDICTIVE_EVENTS_SOURCE + '-labels', 'visibility', 'none')
      safeSetLayoutProperty(map, POI_SOURCE + '-signals', 'visibility', 'none')
      safeSetLayoutProperty(map, POI_SOURCE + '-bus-stops', 'visibility', 'none')
      safeSetLayoutProperty(map, POI_SOURCE + '-subway', 'visibility', 'none')
      safeSetLayoutProperty(map, SOCIAL_SOURCE + '-glow', 'visibility', 'none')
      safeSetLayoutProperty(map, SOCIAL_SOURCE + '-circles', 'visibility', 'none')
      safeSetLayoutProperty(map, SIM_LOCATION_SOURCE + '-dot', 'visibility', 'none')
      safeSetLayoutProperty(map, TOMTOM_FLOW + '-layer', 'visibility', 'none')
      safeSetLayoutProperty(map, TOMTOM_INC + '-layer', 'visibility', 'none')
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[MapFilters] apply', {
        quickFilters: Array.from(activeQuickFilters),
        traffic: trafficVis,
        incidents: incidentsVis,
        flow: flowVis,
        isDecisionMap,
        trafficLayer: map.getLayoutProperty(TRAFFIC_SOURCE + '-lines', 'visibility'),
        incidentsLayer: map.getLayoutProperty(INCIDENT_SOURCE + '-cluster', 'visibility'),
        flowLayer: map.getLayoutProperty(TRAFFIC_FLOW_SOURCE + '-layer', 'visibility'),
      })
    }
    applyTrafficRenderingHierarchy(map)
  }, [activeLayers, activeQuickFilters, city, mapLoaded, useLiveData, isDecisionMap, debugMode])

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current

    const splitFilter = mode === 'predict'
      ? ['<', ['get', 'midpoint_lng'], splitLngRef.current]
      : null
    const trafficQuickFilter = buildTrafficQuickFilter(activeQuickFilters)
    const trafficFilter = splitFilter && trafficQuickFilter
      ? ['all', splitFilter, trafficQuickFilter]
      : splitFilter ?? trafficQuickFilter

    safeSetFilter(map, TRAFFIC_SOURCE + '-halo', trafficFilter)
    safeSetFilter(map, TRAFFIC_SOURCE + '-lines', trafficFilter)
    safeSetFilter(map, TRAFFIC_SOURCE + '-glow', trafficFilter ? ['all', trafficFilter, ['any', ['<=', ['coalesce', ['get', 'speedRatio'], 1], 0.52], ['>=', ['coalesce', ['get', 'importance'], 0], 0.76]]] : ['any', ['<=', ['coalesce', ['get', 'speedRatio'], 1], 0.52], ['>=', ['coalesce', ['get', 'importance'], 0], 0.76]])
    safeSetFilter(map, TRAFFIC_SOURCE + '-corridor-labels', trafficFilter ? ['all', ['boolean', ['get', 'hasObservedTraffic'], false], trafficFilter, ['>=', ['get', 'importance'], 0.55], ['<=', ['get', 'speedRatio'], 0.68]] : ['all', ['boolean', ['get', 'hasObservedTraffic'], false], ['>=', ['get', 'importance'], 0.55], ['<=', ['get', 'speedRatio'], 0.68]])

    if (mode === 'predict') {
      safeSetFilter(map, TRAFFIC_PREDICTION_SOURCE + '-lines', ['>', ['get', 'midpoint_lng'], splitLngRef.current] as any)
    } else {
      safeSetFilter(map, TRAFFIC_PREDICTION_SOURCE + '-lines', null)
    }

    const incidentQuickFilter = buildIncidentQuickFilter(activeQuickFilters)
    safeSetFilter(map, INCIDENT_SOURCE + '-cluster', incidentQuickFilter)
    safeSetFilter(map, INCIDENT_SOURCE + '-cluster-glow', incidentQuickFilter ? ['all', incidentQuickFilter, ['has', 'point_count']] : ['has', 'point_count'])
    safeSetFilter(map, INCIDENT_SOURCE + '-count', incidentQuickFilter ? ['all', incidentQuickFilter, ['has', 'point_count']] : ['has', 'point_count'])
    safeSetFilter(map, INCIDENT_SOURCE + '-unclustered', incidentQuickFilter ? ['all', incidentQuickFilter, ['!', ['has', 'point_count']]] : ['!', ['has', 'point_count']])
    safeSetFilter(map, INCIDENT_SOURCE + '-label', incidentQuickFilter ? ['all', incidentQuickFilter, ['!', ['has', 'point_count']]] : ['!', ['has', 'point_count']])
    safeSetFilter(map, INCIDENT_CRITICAL_SOURCE + '-glow', incidentQuickFilter)
    safeSetFilter(map, INCIDENT_CRITICAL_SOURCE + '-dot', incidentQuickFilter)
    safeSetFilter(map, INCIDENT_CRITICAL_SOURCE + '-label', incidentQuickFilter)
  }, [activeQuickFilters, mapLoaded, mode, splitLng])

  // ─── Heatmap mode (shows/hides correct heatmap layer) ────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const isHeatmapActive = activeLayers.has('heatmap')
    const congestionVisibility = isHeatmapActive && heatmapMode === 'congestion' ? 'visible' : 'none'
    const inactiveHeatSource = activeHeatSourceRef.current === HEATMAP_SOURCE ? HEATMAP_FADE_SOURCE : HEATMAP_SOURCE
    setCongestionHeatmapStackVisibility(map, activeHeatSourceRef.current, congestionVisibility, congestionVisibility)
    setCongestionHeatmapStackVisibility(map, inactiveHeatSource, congestionVisibility, 'none')
    
    safeSetLayoutProperty(map, HEATMAP_PASSAGES_SOURCE + '-layer',   'visibility', isHeatmapActive && heatmapMode === 'passages'   ? 'visible' : 'none')
    safeSetLayoutProperty(map, HEATMAP_PASSAGES_SOURCE + '-circles', 'visibility', isHeatmapActive && heatmapMode === 'passages'   ? 'visible' : 'none')
    
    safeSetLayoutProperty(map, HEATMAP_CO2_SOURCE      + '-layer',   'visibility', isHeatmapActive && heatmapMode === 'co2'        ? 'visible' : 'none')
    safeSetLayoutProperty(map, HEATMAP_CO2_SOURCE      + '-circles', 'visibility', isHeatmapActive && heatmapMode === 'co2'        ? 'visible' : 'none')
  }, [heatmapMode, activeLayers, mapLoaded])

  // ─── Zone drawing (draft line + finalized polygon) ─────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current

    // Draft polygon (in progress)
    const draftSrc = map.getSource(ZONE_DRAFT_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (draftSrc) {
      if (zoneDraft.length >= 2) {
        draftSrc.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: zoneDraft },
          properties: {},
        })
      } else {
        draftSrc.setData({ type: 'FeatureCollection', features: [] })
      }
    }

    // Finalized polygon
    const zoneSrc = map.getSource(ZONE_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (zoneSrc) {
      if (zonePolygon && zonePolygon.length >= 3) {
        const closed = [...zonePolygon, zonePolygon[0]]
        zoneSrc.setData({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [closed] },
          properties: {},
        })
      } else {
        zoneSrc.setData({ type: 'FeatureCollection', features: [] })
      }
    }
  }, [zoneDraft, zonePolygon, mapLoaded])

  // ─── User Location Marker (MapLibre custom animated element) ─────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    if (!userPosition) {
      // Remove marker if position cleared
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      return
    }

    const { lat, lng, accuracy, heading } = userPosition

    if (userMarkerRef.current) {
      // Update existing marker position
      userMarkerRef.current.setLngLat([lng, lat])
      return
    }

    // Build custom DOM element
    const el = document.createElement('div')
    el.className = 'user-location-marker'
    el.style.cssText = `
      position: relative;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
    `

    // Accuracy ring (translucent)
    const ring = document.createElement('div')
    ring.style.cssText = `
      position: absolute;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(0, 255, 157, 0.12);
      border: 1.5px solid rgba(0, 255, 157, 0.4);
      animation: user-location-pulse 2.5s ease-out infinite;
    `

    // Blue dot (main indicator) — matching Google Maps style
    const dot = document.createElement('div')
    dot.style.cssText = `
      position: absolute;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #00FF9D;
      border: 3px solid #ffffff;
      box-shadow: 0 0 0 2px rgba(0,255,157,0.3), 0 2px 8px rgba(0,0,0,0.5);
      z-index: 2;
    `

    // Heading arrow (only when heading is available)
    if (heading !== null && heading !== undefined) {
      const arrow = document.createElement('div')
      arrow.style.cssText = `
        position: absolute;
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-bottom: 10px solid rgba(0,255,157,0.8);
        transform: rotate(${heading}deg) translateY(-14px);
        z-index: 1;
        transform-origin: center bottom;
      `
      el.appendChild(arrow)
    }

    el.appendChild(ring)
    el.appendChild(dot)

    // Add CSS animation if not already injected
    if (!document.getElementById('user-location-style')) {
      const style = document.createElement('style')
      style.id = 'user-location-style'
      style.textContent = `
        @keyframes user-location-pulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          70%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(1);   opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }

    userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lng, lat])
      .addTo(map)

    return () => {
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
    }
  }, [mapLoaded, userPosition])

  // Track if first-fix toast was already shown
  const geoToastShownRef = useRef(false)

  // ─── Geolocation callbacks ───────────────────────────────────────────
  const handleUserPosition = useCallback((pos: UserPosition | null) => {
    setUserPosition(pos)
    // Only toast once on first fix (not on every continuous GPS update)
    if (pos && !geoToastShownRef.current) {
      geoToastShownRef.current = true
      toast.success(`📍 Position détectée`, {
        description: `Précision GPS : ±${Math.round(pos.accuracy)}m • Données locales actives`,
        duration: 4000,
      })
    }
    // Reset flag when position is cleared
    if (!pos) geoToastShownRef.current = false
  }, [])


  const handleGeoFlyTo = useCallback((lat: number, lng: number) => {
    mapRef.current?.flyTo({
      center:    [lng, lat],
      zoom:      15,
      duration:  1200,
      essential: true,
    })
  }, [])


  return (
    <div className="w-full h-full relative">
      {mapError && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 text-center">
          <div className="max-w-sm p-6 rounded-2xl bg-bg-elevated border border-traffic-critical/30 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-12 h-12 rounded-full bg-traffic-critical/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-traffic-critical" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Erreur de chargement</h3>
            <p className="text-sm text-text-muted mb-6 leading-relaxed">
              {mapError}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-2.5 rounded-xl bg-brand text-black font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      <div 
        ref={containerRef} 
        className={cn(
          "w-full h-full bg-[#08090B] transition-opacity duration-700",
          mapLoaded ? "opacity-100" : "opacity-0"
        )} 
      />
      
      {/* HUD elements are now managed by MapPage for better orchestration with AIPanel */}

      {/* ─── Geolocation + Zoom Controls ───────────────────────────── */}
      {mapLoaded && (
        <div className="absolute bottom-20 right-3 z-[400] flex flex-col items-end gap-2 sm:bottom-5 sm:right-4">
          <GeolocationControl onPositionChange={handleUserPosition} onFlyTo={handleGeoFlyTo} />
          <div className="overflow-hidden rounded-[22px] border border-stone-200 bg-white/96 shadow-[0_14px_34px_rgba(15,23,42,0.14)] backdrop-blur-xl">
            <button
              onClick={() => mapRef.current?.zoomIn({ duration: 250 })}
              className="flex h-10 w-10 items-center justify-center text-stone-700 transition-colors hover:bg-stone-50"
              aria-label="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="h-px bg-stone-200" />
            <button
              onClick={() => mapRef.current?.zoomOut({ duration: 250 })}
              className="flex h-10 w-10 items-center justify-center text-stone-700 transition-colors hover:bg-stone-50"
              aria-label="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Loading overlay — fades out once map tiles are ready */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4 pointer-events-none z-10 transition-opacity duration-500">
          <div className="w-10 h-10 border-[3px] border-brand-green border-t-transparent rounded-full animate-spin shadow-glow-sm" />
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest animate-pulse">Chargement de la carte…</p>
        </div>
      )}
    </div>
  )
})

// ─── Sources init ─────────────────────────────────────────────────────────────

function initStaticSources(map: maplibregl.Map) {
  if (!map.getSource(BASE_NETWORK_SOURCE)) {
    const stadiaKey = process.env.NEXT_PUBLIC_STADIA_API_KEY
    const vectorTiles = stadiaKey
      ? [`https://tiles.stadiamaps.com/data/openmaptiles/{z}/{x}/{y}.pbf?api_key=${stadiaKey}`]
      : ['https://tiles.openfreemap.org/planet/{z}/{x}/{y}.pbf']

    map.addSource(BASE_NETWORK_SOURCE, {
      type: 'vector',
      tiles: vectorTiles,
      maxzoom: 15,
      promoteId: 'id'
    })
  }

  if (!map.getLayer(BASE_WATER_LAYER)) {
    map.addLayer({
      id: BASE_WATER_LAYER,
      type: 'fill',
      source: BASE_NETWORK_SOURCE,
      'source-layer': 'water',
      paint: {
        'fill-color': '#D9EBFF',
        'fill-opacity': 0.92,
      },
    })
  }

  if (!map.getLayer(BASE_LANDUSE_LAYER)) {
    map.addLayer({
      id: BASE_LANDUSE_LAYER,
      type: 'fill',
      source: BASE_NETWORK_SOURCE,
      'source-layer': 'landuse',
      maxzoom: 16,
      paint: {
        'fill-color': '#EEF3E6',
        'fill-opacity': 0.62,
      },
    })
  }

  if (!map.getLayer(BASE_BUILDINGS_LAYER)) {
    map.addLayer({
      id: BASE_BUILDINGS_LAYER,
      type: 'fill',
      source: BASE_NETWORK_SOURCE,
      'source-layer': 'building',
      minzoom: 13,
      paint: {
        'fill-color': '#E6EAEE',
        'fill-opacity': 0.72,
      },
    })
  }

  if (!map.getLayer(FULL_ROAD_LAYER)) {
    map.addLayer({
      id: FULL_ROAD_LAYER,
      type: 'line',
      source: BASE_NETWORK_SOURCE,
      'source-layer': 'road',
      filter: ['in', ['coalesce', ['get', 'class'], ['get', 'type'], ['get', 'highway']], ['literal', [...FULL_ROAD_CLASSES]]] as any,
      paint: {
        'line-color': DEBUG_ROAD_COLOR,
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          10, 0.5,
          13, 1,
          16, 2,
          18, 4,
        ],
        'line-opacity': 1,
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' }
    })
  }

  if (!map.getLayer(ROAD_LABELS_LAYER)) {
    map.addLayer({
      id: ROAD_LABELS_LAYER,
      type: 'symbol',
      source: BASE_NETWORK_SOURCE,
      'source-layer': 'road',
      minzoom: 14,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
        'symbol-placement': 'line',
        'text-rotation-alignment': 'map'
      },
      paint: {
        'text-color': '#4B5563',
        'text-halo-color': 'rgba(255,255,255,0.95)',
        'text-halo-width': 1.4
      }
    })
  }

  // ─── Traffic Sources & Fundamental Layers ─────────────────────────────
  
  if (!map.getSource(TRAFFIC_SOURCE)) {
    map.addSource(TRAFFIC_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      lineMetrics: true,
      promoteId: 'id',
    })
  }

  if (!map.getSource(TRAFFIC_PREDICTION_SOURCE)) {
    map.addSource(TRAFFIC_PREDICTION_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'id',
    })
  }

  if (!map.getSource(TRAFFIC_SELECTION_SOURCE)) {
    map.addSource(TRAFFIC_SELECTION_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      lineMetrics: true,
      promoteId: 'id',
    })
  }

  if (!map.getSource(TRAFFIC_HOVER_SOURCE)) {
    map.addSource(TRAFFIC_HOVER_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      lineMetrics: true,
      promoteId: 'id',
    })
  }

  if (!map.getSource(TRAFFIC_FOCUS_SOURCE)) {
    map.addSource(TRAFFIC_FOCUS_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      lineMetrics: true,
      promoteId: 'id',
    })
  }

  // 0. Traffic Halo — white outline behind colored line for contrast on light map
  if (!map.getLayer(TRAFFIC_SOURCE + '-halo')) {
    map.addLayer({
      id:     TRAFFIC_SOURCE + '-halo',
      type:   'line',
      source: TRAFFIC_SOURCE,
      minzoom: 8,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': 'rgba(255,255,255,0.92)',
        'line-width': ['interpolate', ['linear'], ['zoom'],
          8,  ['match', trafficRoadClassExpression(), 'motorway', 4.2, 'motorway_link', 3.8, 'trunk', 3.4, 'trunk_link', 3.0, 'primary', 2.8, 'primary_link', 2.5, 'secondary', 2.2, 'secondary_link', 2.0, 'tertiary', 1.8, 1.4],
          12, ['match', trafficRoadClassExpression(), 'motorway', 5.6, 'motorway_link', 5.0, 'trunk', 4.6, 'trunk_link', 4.0, 'primary', 3.8, 'primary_link', 3.4, 'secondary', 3.0, 'secondary_link', 2.6, 'tertiary', 2.3, 1.9],
          15, ['match', trafficRoadClassExpression(), 'motorway', 8.6, 'motorway_link', 7.8, 'trunk', 7.2, 'trunk_link', 6.2, 'primary', 5.4, 'primary_link', 4.8, 'secondary', 4.2, 'secondary_link', 3.8, 'tertiary', 3.2, 2.8],
        ],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.2, 12, 0.3, 16, 0.42],
      }
    })
  }

  // 1. Primary Traffic Lines — Waze-like: warm (red/orange) → cold (green), visible from zoom 8
  if (!map.getLayer(TRAFFIC_SOURCE + '-lines')) {
    map.addLayer({
      id:     TRAFFIC_SOURCE + '-lines',
      type:   'line',
      source: TRAFFIC_SOURCE,
      minzoom: 8,   // visible from city overview level
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint:  {
        'line-color': [
          'case',
          ['boolean', ['get', 'hasObservedTraffic'], false],
          [
            'interpolate', ['linear'], ['coalesce', ['get', 'speedRatio'], 1],
            0.00, '#DC2626',
            0.25, '#EF4444',
            0.45, '#F97316',
            0.65, '#FACC15',
            0.85, '#22C55E',
            1.00, '#16A34A',
          ],
          '#D1D5DB',
        ],
        'line-width': ['interpolate', ['linear'], ['zoom'],
          8,  ['match', trafficRoadClassExpression(), 'motorway', 4.8, 'motorway_link', 4.1, 'trunk', 4.0, 'trunk_link', 3.6, 'primary', 3.4, 'primary_link', 3.0, 'secondary', 2.8, 'secondary_link', 2.4, 'tertiary', 2.0, 0.1],
          11, ['match', trafficRoadClassExpression(), 'motorway', 6.4, 'motorway_link', 5.8, 'trunk', 5.4, 'trunk_link', 4.9, 'primary', 4.4, 'primary_link', 4.0, 'secondary', 3.6, 'secondary_link', 3.1, 'tertiary', 2.6, 0.4],
          14, ['match', trafficRoadClassExpression(), 'motorway', 8.4, 'motorway_link', 7.4, 'trunk', 7.0, 'trunk_link', 6.2, 'primary', 5.4, 'primary_link', 4.8, 'secondary', 4.3, 'secondary_link', 3.8, 'tertiary', 3.2, 2.2],
          17, ['match', trafficRoadClassExpression(), 'motorway', 12.2, 'motorway_link', 10.8, 'trunk', 10.0, 'trunk_link', 8.8, 'primary', 7.4, 'primary_link', 6.6, 'secondary', 5.6, 'secondary_link', 5.0, 'tertiary', 4.2, 3.1],
        ],
        'line-opacity': [
          'interpolate', ['linear'], ['zoom'],
          8, ['case', ['match', trafficRoadClassExpression(), [...ROAD_MAIN_CLASSES], true, false], ['case', ['boolean', ['get', 'hasObservedTraffic'], false], 0.9, 0.72], 0],
          11, ['case', ['match', trafficRoadClassExpression(), [...ROAD_MAIN_CLASSES], true, false], ['case', ['boolean', ['get', 'hasObservedTraffic'], false], 0.9, 0.66], ['case', ['boolean', ['get', 'hasObservedTraffic'], false], 0.54, 0.48]],
          13, ['case', ['boolean', ['get', 'hasObservedTraffic'], false], 0.9, 0.62],
          16, ['case', ['boolean', ['get', 'hasObservedTraffic'], false], 0.94, 0.68],
        ],
      },
    })
  }

  if (!map.getLayer(TRAFFIC_SOURCE + '-corridor-labels')) {
    map.addLayer({
      id: TRAFFIC_SOURCE + '-corridor-labels',
      type: 'symbol',
      source: TRAFFIC_SOURCE,
      minzoom: 15,
      filter: ['all', ['boolean', ['get', 'hasObservedTraffic'], false], ['>=', ['get', 'importance'], 0.55], ['<=', ['get', 'speedRatio'], 0.68]],
      layout: {
        'symbol-placement': 'line-center',
        'text-field': ['get', 'corridorLabel'],
        'text-font': ['Open Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 16, 12],
        'text-letter-spacing': 0.02,
        'text-max-width': 14,
      },
      paint: {
        'text-color': 'rgba(17,24,39,0.88)',
        'text-halo-color': 'rgba(255,255,255,0.96)',
        'text-halo-width': 2,
      },
    })
  }

  if (!map.getLayer(TRAFFIC_HOVER_SOURCE + '-glow')) {
    map.addLayer({
      id: TRAFFIC_HOVER_SOURCE + '-glow',
      type: 'line',
      source: TRAFFIC_HOVER_SOURCE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#38BDF8',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 6, 16, 14],
        'line-opacity': 0.14,
        'line-blur': 4,
      },
    })
  }

  if (!map.getLayer(TRAFFIC_HOVER_SOURCE + '-line')) {
    map.addLayer({
      id: TRAFFIC_HOVER_SOURCE + '-line',
      type: 'line',
      source: TRAFFIC_HOVER_SOURCE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#0F172A',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2, 16, 4],
        'line-opacity': 0.72,
      },
    })
  }

  if (!map.getLayer(TRAFFIC_FOCUS_SOURCE + '-glow')) {
    map.addLayer({
      id: TRAFFIC_FOCUS_SOURCE + '-glow',
      type: 'line',
      source: TRAFFIC_FOCUS_SOURCE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#4ADE80',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 8, 16, 20],
        'line-opacity': 0.14,
        'line-blur': 6,
      },
    })
  }

  if (!map.getLayer(TRAFFIC_FOCUS_SOURCE + '-line')) {
    map.addLayer({
      id: TRAFFIC_FOCUS_SOURCE + '-line',
      type: 'line',
      source: TRAFFIC_FOCUS_SOURCE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#86EFAC',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 16, 5.5],
        'line-opacity': 0.94,
      },
    })
  }

  if (!map.getLayer(TRAFFIC_SELECTION_SOURCE + '-glow')) {
    map.addLayer({
      id: TRAFFIC_SELECTION_SOURCE + '-glow',
      type: 'line',
      source: TRAFFIC_SELECTION_SOURCE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#38BDF8',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 10, 16, 24],
        'line-opacity': 0.18,
        'line-blur': 7,
      },
    })
  }

  if (!map.getLayer(TRAFFIC_SELECTION_SOURCE + '-line')) {
    map.addLayer({
      id: TRAFFIC_SELECTION_SOURCE + '-line',
      type: 'line',
      source: TRAFFIC_SELECTION_SOURCE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#7DD3FC',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3, 16, 7],
        'line-opacity': 0.98,
      },
    })
  }

  if (!map.getLayer(TRAFFIC_SELECTION_SOURCE + '-label')) {
    map.addLayer({
      id: TRAFFIC_SELECTION_SOURCE + '-label',
      type: 'symbol',
      source: TRAFFIC_SELECTION_SOURCE,
      minzoom: 12,
      layout: {
        'symbol-placement': 'line-center',
        'text-field': ['concat', ['get', 'corridorLabel'], '\n', ['get', 'statusLabel']],
        'text-font': ['Open Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 12, 11, 16, 13],
        'text-justify': 'center',
      },
      paint: {
        'text-color': '#E0F2FE',
        'text-halo-color': 'rgba(255,255,255,0.98)',
        'text-halo-width': 2.5,
      },
    })
  }

  // 2. Prediction Overlays (Dashed)
  if (!map.getLayer(TRAFFIC_PREDICTION_SOURCE + '-lines')) {
    map.addLayer({
      id:     TRAFFIC_PREDICTION_SOURCE + '-lines',
      type:   'line',
      source: TRAFFIC_PREDICTION_SOURCE,
      minzoom: 13,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': [
          'case',
          ['boolean', ['get', 'hasObservedTraffic'], false],
          [
            'interpolate', ['linear'], ['coalesce', ['get', 'predictedSpeedRatio'], 1],
            0.25, '#EF4444',
            0.45, '#FF9F0A',
            0.70, '#FFD600',
            1.00, '#22C55E',
          ],
          '#D1D5DB',
        ],
        'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1, 16, 3],
        'line-dasharray': [1, 2],
        'line-opacity': ['case', ['boolean', ['get', 'hasObservedTraffic'], false], 0.35, 0.18],
        'line-offset': 0
      }
    }, TRAFFIC_SOURCE + '-lines')
  }

  // 3. Traffic Glow (Underlay)
  if (!map.getLayer(TRAFFIC_SOURCE + '-glow')) {
    map.addLayer({
      id:     TRAFFIC_SOURCE + '-glow',
      type:   'line',
      source: TRAFFIC_SOURCE,
      filter: ['any', ['<=', ['coalesce', ['get', 'speedRatio'], 1], 0.52], ['>=', ['coalesce', ['get', 'importance'], 0], 0.76]],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint:  {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hasData'], false],
          ['match', ['feature-state', 'levelCode'],
            0, '#00FF9D', 1, '#FACD15', 2, '#FF9F0A', 3, '#EF4444',
            '#00FF9D'
          ],
          'transparent' 
        ],
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 5, 16, 14],
        'line-opacity': [
          'interpolate', ['linear'], ['zoom'],
          10, 0.02,
          12, ['case', ['>=', ['feature-state', 'anomaly'], 0.6], 0.22, 0.08],
          17, ['case', ['>=', ['feature-state', 'anomaly'], 0.6], 0.3, 0.12]
        ],
        'line-blur': ['case', ['>=', ['feature-state', 'anomaly'], 0.6], 7, 4],
      },
    }, TRAFFIC_SOURCE + '-lines')
  }

  if (!map.getSource(TRAFFIC_ZONE_SOURCE)) {
    map.addSource(TRAFFIC_ZONE_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  }

  if (!map.getLayer(TRAFFIC_ZONE_SOURCE + '-fill')) {
    map.addLayer({
      id:     TRAFFIC_ZONE_SOURCE + '-fill',
      type:   'fill',
      source: TRAFFIC_ZONE_SOURCE,
      maxzoom: 12,
      paint:  {
        'fill-color': [
          'interpolate', ['linear'], ['get', 'speedRatio'],
          0.2, '#EF4444',
          0.45, '#FF9F0A',
          0.7, '#FFD600',
          1.0, '#22C55E',
        ],
      'fill-opacity': 0.16,
    },
  })
  }

  if (!map.getLayer(TRAFFIC_ZONE_SOURCE + '-line')) {
    map.addLayer({
      id:     TRAFFIC_ZONE_SOURCE + '-line',
      type:   'line',
      source: TRAFFIC_ZONE_SOURCE,
      maxzoom: 12,
      paint:  {
        'line-color': [
          'interpolate', ['linear'], ['get', 'speedRatio'],
          0.2, '#EF4444',
          0.45, '#FF9F0A',
          0.7, '#FFD600',
          1.0, '#22C55E',
        ],
        'line-width': 1,
        'line-opacity': 0.12,
      },
    })
  }

  if (!map.getSource(TRAFFIC_FLOW_SOURCE)) {
    map.addSource(TRAFFIC_FLOW_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  }

  if (!map.getLayer(TRAFFIC_FLOW_SOURCE + '-layer')) {
    map.addLayer({
      id:     TRAFFIC_FLOW_SOURCE + '-layer',
      type:   'symbol',
      source: TRAFFIC_FLOW_SOURCE,
      minzoom: 12,
      layout: {
        'symbol-placement': 'point',
        'text-field': '➤',
        'text-size': ['interpolate', ['linear'], ['zoom'], 12, 8, 15, 11, 18, 13],
        'text-rotate': ['get', 'bearing'],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': [
          'interpolate', ['linear'], ['coalesce', ['get', 'speedRatio'], 1],
          0.24, '#FF6B57',
          0.48, '#FFB547',
          0.72, '#FFE066',
          1, '#CFFFE1',
        ],
        'text-opacity': [
          'interpolate', ['linear'], ['get', 'speedRatio'],
          0.2, 0.92,
          0.6, 0.62,
          1.0, 0.22,
        ],
        'text-halo-color': 'rgba(8,9,11,0.95)',
        'text-halo-width': 1.8,
      },
    })
  }

  const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
  map.addSource(PREDICTIVE_AFFECTED_SOURCE, { type: 'geojson', data: emptyFC })
  map.addSource(PREDICTIVE_EVENTS_SOURCE,   { type: 'geojson', data: emptyFC })

  // ── PREDICTIVE AFFECTED ROADS ──────────────────
  map.addLayer({
    id:     PREDICTIVE_AFFECTED_SOURCE + '-glow',
    type:   'line',
    source: PREDICTIVE_AFFECTED_SOURCE,
    paint: {
      'line-color':   '#FF3B30',
      'line-width':   12,
      'line-opacity': 0.15,
      'line-blur':    8,
    }
  })
  map.addLayer({
    id:     PREDICTIVE_AFFECTED_SOURCE + '-lines',
    type:   'line',
    source: PREDICTIVE_AFFECTED_SOURCE,
    paint: {
      'line-color':   '#FF3B30',
      'line-width':   3.5,
      'line-opacity': 0.85,
    }
  })

  // ── PREDICTIVE EVENTS ─────────────────────────
  map.addLayer({
    id:     PREDICTIVE_EVENTS_SOURCE + '-circles',
    type:   'circle',
    source: PREDICTIVE_EVENTS_SOURCE,
    paint: {
      'circle-radius':       8,
      'circle-color':        '#FF3B30',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
      'circle-opacity':      0.9,
    }
  })
  map.addLayer({
    id:     PREDICTIVE_EVENTS_SOURCE + '-labels',
    type:   'symbol',
    source: PREDICTIVE_EVENTS_SOURCE,
    layout: {
      'text-field':    ['get', 'label'],
      'text-font':     ['Open Sans Bold'],
      'text-size':     11,
      'text-anchor':   'top',
      'text-offset':   [0, 1.2],
    },
    paint: {
      'text-color':      '#FFFFFF',
      'text-halo-color': 'rgba(0,0,0,0.8)',
      'text-halo-width': 2,
    }
  })


  // ── SIM LOCATION MARKER ────────────────────────
  map.addSource(SIM_LOCATION_SOURCE, { type: 'geojson', data: emptyFC })
  map.addLayer({
    id:     SIM_LOCATION_SOURCE + '-ring',
    type:   'circle',
    source: SIM_LOCATION_SOURCE,
    paint: {
      'circle-radius':       20,
      'circle-color':        'rgba(255,71,87,0.12)',
      'circle-stroke-color': '#FF4757',
      'circle-stroke-width': 2.5,
    },
  })
  map.addLayer({
    id:     SIM_LOCATION_SOURCE + '-dot',
    type:   'circle',
    source: SIM_LOCATION_SOURCE,
    paint: {
      'circle-radius':       5,
      'circle-color':        '#FF4757',
      'circle-stroke-color': '#FFFFFF',
      'circle-stroke-width': 1.5,
    },
  })

  addCongestionHeatmapStack(map, HEATMAP_SOURCE, emptyFC)
  addCongestionHeatmapStack(map, HEATMAP_FADE_SOURCE, emptyFC)
  setCongestionHeatmapStackOpacity(map, HEATMAP_SOURCE, 1)
  setCongestionHeatmapStackOpacity(map, HEATMAP_FADE_SOURCE, 0)
  setCongestionHeatmapStackVisibility(map, HEATMAP_SOURCE, 'none', 'none')
  setCongestionHeatmapStackVisibility(map, HEATMAP_FADE_SOURCE, 'none', 'none')

  // Incidents split into clusters + critical pins
  map.addSource(INCIDENT_SOURCE, {
    type: 'geojson',
    data: emptyFC,
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 54,
  })

  map.addLayer({
    id:     INCIDENT_SOURCE + '-cluster-glow',
    type:   'circle',
    source: INCIDENT_SOURCE,
    filter: ['has', 'point_count'],
    paint:  {
      'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 1, 12, 8, 20, 25, 30],
      'circle-color':  '#FFFFFF',
      'circle-opacity': 0.10,
      'circle-blur':    0.8,
    },
  })

  map.addLayer({
    id:     INCIDENT_SOURCE + '-cluster',
    type:   'circle',
    source: INCIDENT_SOURCE,
    filter: ['has', 'point_count'],
    paint:  {
      'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 1, 10, 8, 16, 25, 24],
      'circle-color':  '#111827',
      'circle-opacity': 0.90,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#FFFFFF',
    },
  })

  map.addLayer({
    id:     INCIDENT_SOURCE + '-count',
    type:   'symbol',
    source: INCIDENT_SOURCE,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['concat', ['to-string', ['get', 'point_count_abbreviated']], '\nincidents'],
      'text-font': ['Open Sans Bold'],
      'text-size': ['interpolate', ['linear'], ['get', 'point_count'], 1, 11, 10, 13, 25, 15],
      'text-justify': 'center',
      'text-anchor': 'center',
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#F5F5F7',
      'text-halo-color': 'rgba(8,9,11,0.9)',
      'text-halo-width': 2,
    },
  })

  map.addLayer({
    id:     INCIDENT_SOURCE + '-unclustered',
    type:   'circle',
    source: INCIDENT_SOURCE,
    filter: ['!', ['has', 'point_count']],
    minzoom: 14,
    paint:  {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 5, 17, 8],
      'circle-color':  ['get', 'color'],
      'circle-opacity': 0.95,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
    },
  })

  map.addLayer({
    id:     INCIDENT_SOURCE + '-label',
    type:   'symbol',
    source: INCIDENT_SOURCE,
    filter: ['!', ['has', 'point_count']],
    minzoom: 15,
    layout: {
      'text-field': ['get', 'title'],
      'text-font': ['Open Sans Regular'],
      'text-size': 10,
      'text-offset': [0, 1.7],
      'text-anchor': 'top',
      'text-letter-spacing': 0.01,
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': '#F5F5F7',
      'text-halo-color': 'rgba(8, 9, 11, 0.85)',
      'text-halo-width': 2,
    },
  })

  map.addSource(INCIDENT_CRITICAL_SOURCE, { type: 'geojson', data: emptyFC })
  map.addLayer({
    id:     INCIDENT_CRITICAL_SOURCE + '-glow',
    type:   'circle',
    source: INCIDENT_CRITICAL_SOURCE,
    minzoom: 11,
    paint:  {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 10, 15, 18],
      'circle-color':  ['get', 'color'],
      'circle-opacity': 0.18,
      'circle-blur':    1,
    },
  })
  map.addLayer({
    id:     INCIDENT_CRITICAL_SOURCE + '-dot',
    type:   'circle',
    source: INCIDENT_CRITICAL_SOURCE,
    minzoom: 11,
    paint:  {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 5, 15, 8],
      'circle-color':  ['get', 'color'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
    },
  })
  map.addLayer({
    id:     INCIDENT_CRITICAL_SOURCE + '-label',
    type:   'symbol',
    source: INCIDENT_CRITICAL_SOURCE,
    minzoom: 13,
    layout: {
      'text-field': '!',
      'text-font': ['Open Sans Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 13, 11, 16, 16],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      'text-anchor': 'center',
    },
    paint: {
      'text-color': '#111111',
      'text-halo-color': ['get', 'color'],
      'text-halo-width': 3,
    },
  })

  // ── POI Overlay (traffic signals, bus stops, subway) ──────────────────
  map.addSource(POI_SOURCE, { type: 'geojson', data: emptyFC })

  // Traffic signals — yellow dots
  map.addLayer({
    id:      POI_SOURCE + '-signals',
    type:    'circle',
    source:  POI_SOURCE,
    minzoom: 13,
    filter:  ['==', ['get', 'type'], 'traffic_signals'],
    paint:   {
      'circle-radius':        ['interpolate', ['linear'], ['zoom'], 13, 3, 16, 6, 18, 9],
      'circle-color':         '#FFD600',
      'circle-opacity':       0.95,
      'circle-stroke-width':  1.5,
      'circle-stroke-color':  '#08090B',
    },
  })

  // Bus stops — blue dots
  map.addLayer({
    id:      POI_SOURCE + '-bus-stops',
    type:    'circle',
    source:  POI_SOURCE,
    minzoom: 14,
    filter:  ['==', ['get', 'type'], 'bus_stop'],
    paint:   {
      'circle-radius':        ['interpolate', ['linear'], ['zoom'], 14, 3, 17, 6],
      'circle-color':         '#3B82F6',
      'circle-opacity':       0.85,
      'circle-stroke-width':  1,
      'circle-stroke-color':  '#08090B',
    },
  })

  // Subway entrances — purple rings
  map.addLayer({
    id:      POI_SOURCE + '-subway',
    type:    'circle',
    source:  POI_SOURCE,
    minzoom: 13,
    filter:  ['==', ['get', 'type'], 'subway_entrance'],
    paint:   {
      'circle-radius':        ['interpolate', ['linear'], ['zoom'], 13, 4, 17, 9],
      'circle-color':         '#A855F7',
      'circle-opacity':       1,
      'circle-stroke-width':  2,
      'circle-stroke-color':  '#08090B',
    },
  })

  // ── Transit Route Polylines (bus + metro lines on the map) ───────────
  map.addSource(TRANSIT_ROUTES_SOURCE, { type: 'geojson', data: emptyFC })

  // Metro / tram / train — thick colored lines
  map.addLayer({
    id:      TRANSIT_ROUTES_SOURCE + '-metro',
    type:    'line',
    source:  TRANSIT_ROUTES_SOURCE,
    minzoom: 10,
    filter:  ['in', ['get', 'routeType'], ['literal', ['subway', 'tram', 'train']]],
    layout:  { 'line-join': 'round', 'line-cap': 'round' },
    paint:   {
      'line-color':   ['get', 'color'],
      'line-width':   ['interpolate', ['linear'], ['zoom'], 10, 2.5, 13, 4, 15, 5.5, 17, 7],
      'line-opacity': 0.85,
    },
  })

  // Bus routes — thinner lines, visible from zoom 12
  map.addLayer({
    id:      TRANSIT_ROUTES_SOURCE + '-bus',
    type:    'line',
    source:  TRANSIT_ROUTES_SOURCE,
    minzoom: 12,
    filter:  ['==', ['get', 'routeType'], 'bus'],
    layout:  { 'line-join': 'round', 'line-cap': 'round' },
    paint:   {
      'line-color':   ['get', 'color'],
      'line-width':   ['interpolate', ['linear'], ['zoom'], 12, 1.5, 14, 2.5, 16, 3.5],
      'line-opacity': 0.7,
    },
  })

  // ── Metro Stations (proper markers with line numbers) ─────────────────
  map.addSource(METRO_STATIONS_SOURCE, { type: 'geojson', data: emptyFC })

  // Outer glow (atmospheric)
  map.addLayer({
    id:      METRO_STATIONS_SOURCE + '-glow',
    type:    'circle',
    source:  METRO_STATIONS_SOURCE,
    minzoom: 11,
    paint:   {
      'circle-radius':   ['interpolate', ['linear'], ['zoom'], 
        11, ['*', 8, ['get', 'importance']], 
        14, ['*', 16, ['get', 'importance']], 
        16, ['*', 22, ['get', 'importance']]
      ],
      'circle-color':    ['get', 'color'],
      'circle-opacity':  ['interpolate', ['linear'], ['zoom'], 11, 0.08, 14, 0.15],
      'circle-blur':     0.8,
    },

  })

  // White backing ring
  map.addLayer({
    id:      METRO_STATIONS_SOURCE + '-ring',
    type:    'circle',
    source:  METRO_STATIONS_SOURCE,
    minzoom: 11,
    paint:   {
      'circle-radius':       ['interpolate', ['linear'], ['zoom'], 
        11, ['*', 5, ['get', 'importance']], 
        14, ['*', 9, ['get', 'importance']], 
        16, ['*', 12, ['get', 'importance']]
      ],
      'circle-color':        '#FFFFFF',
      'circle-opacity':      1,
      'circle-stroke-width': 0,
    },

  })

  // Colored fill (line color)
  map.addLayer({
    id:      METRO_STATIONS_SOURCE + '-dot',
    type:    'circle',
    source:  METRO_STATIONS_SOURCE,
    minzoom: 11,
    paint:   {
      'circle-radius':        ['interpolate', ['linear'], ['zoom'], 
        11, ['*', 3.5, ['get', 'importance']], 
        14, ['*', 7.5, ['get', 'importance']], 
        16, ['*', 10.5, ['get', 'importance']]
      ],
      'circle-color':         ['get', 'color'],
      'circle-opacity':       1,
      'circle-stroke-width':  1.5,
      'circle-stroke-color':  '#1A1A2E',
    },

  })

  // Line ref label (e.g. "1", "4·9·14") — centered on the dot
  map.addLayer({
    id:      METRO_STATIONS_SOURCE + '-lineref',
    type:    'symbol',
    source:  METRO_STATIONS_SOURCE,
    minzoom: 13,
    layout:  {
      'text-field':            ['get', 'label'],
      'text-font':             ['Open Sans Bold'],
      'text-size':             ['interpolate', ['linear'], ['zoom'], 13, 7, 15, 10, 17, 12],
      'text-anchor':           'center',
      'text-allow-overlap':    true,
      'text-ignore-placement': true,
    },
    paint:   {
      'text-color':      '#FFFFFF',
      'text-halo-color': 'rgba(0,0,0,0)',
      'text-halo-width': 0,
    },
  })

  // Station name label below the dot (visible from zoom 14)
  map.addLayer({
    id:      METRO_STATIONS_SOURCE + '-name',
    type:    'symbol',
    source:  METRO_STATIONS_SOURCE,
    minzoom: 14,
    layout:  {
      'text-field':        ['get', 'name'],
      'text-font':         ['Open Sans Bold'],
      'text-size':         ['interpolate', ['linear'], ['zoom'], 14, 10, 16, 13],
      'text-anchor':       'top',
      'text-offset':       [0, 1.0],
      'text-max-width':    8,
      'text-allow-overlap': false,
    },
    paint:   {
      'text-color':      '#F5F5F7',
      'text-halo-color': 'rgba(8,9,11,0.95)',
      'text-halo-width': 2.5,
    },
  })

  // Disruption alert ring (red/orange halo around disrupted station dots)
  map.addLayer({
    id:      METRO_STATIONS_SOURCE + '-alert',
    type:    'circle',
    source:  METRO_STATIONS_SOURCE,
    minzoom: 11,
    filter:  ['==', ['get', 'disrupted'], 1],
    paint:   {
      'circle-radius':         ['interpolate', ['linear'], ['zoom'], 11, 10, 14, 18, 16, 24],
      'circle-color':          '#EF4444',
      'circle-opacity':        0, // Driven by animation
      'circle-stroke-width':   1.5,
      'circle-stroke-color':   '#EF4444',
      'circle-stroke-opacity': 0.8,
    },

  })

  // ── Transit Vehicles ──────────────────────────────────────────────────
  map.addSource(VEHICLES_SOURCE, { type: 'geojson', data: emptyFC })
  map.addSource(VEHICLE_TRAILS_SOURCE, { type: 'geojson', data: emptyFC })

  map.addLayer({
    id:     VEHICLE_TRAILS_SOURCE + '-glow',
    type:   'line',
    source: VEHICLE_TRAILS_SOURCE,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint:  {
      'line-color': ['get', 'color'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 15, 10],
      'line-opacity': 0.12,
      'line-blur': 4,
    },
  })

  map.addLayer({
    id:     VEHICLE_TRAILS_SOURCE + '-line',
    type:   'line',
    source: VEHICLE_TRAILS_SOURCE,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint:  {
      'line-color': ['get', 'color'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.2, 15, 3.2],
      'line-opacity': [
        'interpolate', ['linear'], ['get', 'speedKmh'],
        0, 0.34,
        20, 0.48,
        60, 0.62,
      ],
    },
  })

  // Outer glow ring (type-colored)
  map.addLayer({
    id:     VEHICLES_SOURCE + '-glow',
    type:   'circle',
    source: VEHICLES_SOURCE,
    layout: { visibility: 'visible' },
    paint:  {
      'circle-radius':    ['interpolate', ['linear'], ['zoom'], 10, 8, 15, 16],
      'circle-color':     ['get', 'color'],
      'circle-opacity':   0.18,
      'circle-blur':      0.6,
    },
  })

  // Main vehicle dot
  map.addLayer({
    id:     VEHICLES_SOURCE + '-layer',
    type:   'circle',
    source: VEHICLES_SOURCE,
    layout: { visibility: 'visible' },
    paint:  {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        9,  ['match', ['get', 'routeType'], 'subway', 4, 'train', 4, 'tram', 3.5, 3],
        14, ['match', ['get', 'routeType'], 'subway', 8, 'train', 8, 'tram', 7,   6],
        17, ['match', ['get', 'routeType'], 'subway', 11,'train', 11,'tram', 9,   8],
      ],
      'circle-color':        ['get', 'color'],
      'circle-opacity':      0.95,
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 9, 1, 14, 2],
      'circle-stroke-color': '#08090B',
    },
  })

  // Line ref label (show line number on the vehicle dot)
  map.addLayer({
    id:      VEHICLES_SOURCE + '-label',
    type:    'symbol',
    source:  VEHICLES_SOURCE,
    minzoom: 13,
    layout: {
      'text-field':   ['slice', ['get', 'routeRef'], 0, 3],
      'text-font':    ['Open Sans Regular'],
      'text-size':    ['interpolate', ['linear'], ['zoom'], 13, 8, 16, 11],
      'text-anchor':  'center',
      'text-allow-overlap': true,
    },
    paint: {
      'text-color':      '#000000',
      'text-halo-color': 'rgba(0,0,0,0)',
      'text-halo-width': 0,
    },
  })

  // ── Vehicle selection highlight ───────────────────────────────────
  map.addSource(VEHICLES_SOURCE + '-selected', { type: 'geojson', data: emptyFC })
  
  // Large pulsing selection ring
  map.addLayer({
    id:     VEHICLES_SOURCE + '-selected-ring',
    type:   'circle',
    source: VEHICLES_SOURCE + '-selected',
    paint:  {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 12, 15, 24],
      'circle-color':  ['get', 'color'],
      'circle-opacity': 0.15,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
    },
  })

  // Selected dot (on top)
  map.addLayer({
    id:     VEHICLES_SOURCE + '-selected-dot',
    type:   'circle',
    source: VEHICLES_SOURCE + '-selected',
    paint:  {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 15, 12],
      'circle-color':  ['get', 'color'],
      'circle-stroke-width': 3,
      'circle-stroke-color': '#FFFFFF',
    },
  })

  // Hover layer (simple ring, visible on mouseenter)
  map.addSource(VEHICLES_SOURCE + '-hover', { type: 'geojson', data: emptyFC })
  map.addLayer({
    id:     VEHICLES_SOURCE + '-hover-ring',
    type:   'circle',
    source: VEHICLES_SOURCE + '-hover',
    paint:  {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 9, 15, 18],
      'circle-color':  '#FFFFFF',
      'circle-opacity': 0.25,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#FFFFFF',
    },
    layout: { visibility: 'none' }
  })
}

function initDistrictsLayers(map: maplibregl.Map) {
  const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
  map.addSource(DISTRICTS_SOURCE, { type: 'geojson', data: emptyFC })

  map.addLayer({
    id:     DISTRICTS_SOURCE + '-fill',
    type:   'fill',
    source: DISTRICTS_SOURCE,
    paint:  {
      'fill-color': [
        'interpolate', ['linear'], ['get', 'density'],
        0,    'rgba(34, 197, 94, 0.03)',
        0.33, 'rgba(34, 197, 94, 0.05)',
        0.66, 'rgba(34, 197, 94, 0.07)',
        1,    'rgba(34, 197, 94, 0.09)',
      ],
      'fill-opacity': 1,
      'fill-outline-color': 'rgba(0,0,0,0)',
    },
  })

  map.addLayer({
    id:     DISTRICTS_SOURCE + '-line',
    type:   'line',
    source: DISTRICTS_SOURCE,
    paint:  {
      'line-color':   'rgba(15,23,42,0.16)',
      'line-width':   0.8,
      'line-dasharray': [2, 2],
    },
  })

  map.addLayer({
    id:     DISTRICTS_SOURCE + '-label',
    type:   'symbol',
    source: DISTRICTS_SOURCE,
    minzoom: 12,
    layout: {
      'text-field':    ['get', 'name'],
      'text-font':     ['Open Sans Bold'],
      'text-size':     11,
      'text-anchor':   'center',
      'symbol-placement': 'point',
      'text-allow-overlap': false,
    },
    paint: {
      'text-color':      'rgba(15,23,42,0.72)',
      'text-halo-color': 'rgba(255,255,255,0.9)',
      'text-halo-width': 1.6,
    },
  })
}

function initBoundaryLayers(map: maplibregl.Map) {
  const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

  map.addSource(BOUNDARY_SOURCE, { type: 'geojson', data: emptyFC })

  map.addLayer({
    id:     BOUNDARY_SOURCE + '-glow-outer',
    type:   'line',
    source: BOUNDARY_SOURCE,
    paint:  {
      'line-color':   '#16A34A',
      'line-width':   18,
      'line-opacity': 0.05,
      'line-blur':    10,
    },
  })

  map.addLayer({
    id:     BOUNDARY_SOURCE + '-glow',
    type:   'line',
    source: BOUNDARY_SOURCE,
    paint:  {
      'line-color':   '#16A34A',
      'line-width':   6,
      'line-opacity': 0.12,
      'line-blur':    3,
    },
  })

  map.addLayer({
    id:     BOUNDARY_SOURCE + '-fill',
    type:   'fill',
    source: BOUNDARY_SOURCE,
    paint:  {
      'fill-color':   '#16A34A',
      'fill-opacity': 0.02,
    },
  })

  map.addLayer({
    id:     BOUNDARY_SOURCE + '-line',
    type:   'line',
    source: BOUNDARY_SOURCE,
    paint:  {
      'line-color':        '#16A34A',
      'line-width':        2,
      'line-opacity':      0.8,
      'line-dasharray':    [3, 3],
    },
  })

  map.addLayer({
    id:     BOUNDARY_SOURCE + '-label',
    type:   'symbol',
    source: BOUNDARY_SOURCE,
    layout: {
      'text-field':    ['coalesce', ['get', 'name'], ''],
      'text-font':     ['Open Sans Bold'],
      'text-size':     13,
      'text-offset':   [0, 0],
      'text-anchor':   'center',
      'symbol-placement': 'point',
    },
    paint: {
      'text-color':      'rgba(15,23,42,0.72)',
      'text-halo-color': 'rgba(255,255,255,0.92)',
      'text-halo-width': 2,
    },
    minzoom: 8,
    maxzoom: 13,
  })

  map.addSource(WORLD_MASK_SOURCE, { type: 'geojson', data: emptyFC })
  map.addLayer({
    id:     WORLD_MASK_SOURCE + '-fill',
    type:   'fill',
    source: WORLD_MASK_SOURCE,
    paint:  {
      'fill-color':   '#F0EDE8',
      'fill-opacity': 0,  // invisible — city boundary line handles the visual
    },
  }, BOUNDARY_SOURCE + '-glow-outer')

  map.addSource(ENTRY_EXIT_SOURCE, { type: 'geojson', data: emptyFC })
  map.addLayer({
    id: ENTRY_EXIT_SOURCE + '-halo',
    type: 'circle',
    source: ENTRY_EXIT_SOURCE,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 8, 15, 16],
      'circle-color': 'rgba(22,163,74,0.14)',
      'circle-opacity': 1,
      'circle-stroke-width': 0,
    },
  })
  map.addLayer({
    id: ENTRY_EXIT_SOURCE + '-circle',
    type: 'circle',
    source: ENTRY_EXIT_SOURCE,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 15, 7],
      'circle-color': '#16A34A',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
    },
  })
  map.addLayer({
    id: ENTRY_EXIT_SOURCE + '-label',
    type: 'symbol',
    source: ENTRY_EXIT_SOURCE,
    minzoom: 12,
    layout: {
      'text-field': ['coalesce', ['get', 'direction'], 'Gateway'],
      'text-font': ['Open Sans Bold'],
      'text-size': 10,
      'text-offset': [0, 1.3],
      'text-anchor': 'top',
    },
    paint: {
      'text-color': 'rgba(15,23,42,0.72)',
      'text-halo-color': 'rgba(255,255,255,0.92)',
      'text-halo-width': 1.5,
    },
  })
}

function addCongestionHeatmapStack(
  map: maplibregl.Map,
  sourceId: string,
  emptyFC: GeoJSON.FeatureCollection,
) {
  map.addSource(sourceId, {
    type: 'geojson',
    data: emptyFC,
    cluster: true,
    clusterMaxZoom: 9,
    clusterRadius: 42,
  })

  map.addLayer({
    id: heatmapStackLayerId(sourceId, 'clusters'),
    type: 'circle',
    source: sourceId,
    maxzoom: 9,
    filter: ['has', 'point_count'],
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['get', 'point_count'],
        1, 14,
        20, 20,
        80, 30,
        250, 42,
      ],
      'circle-color': [
        'interpolate', ['linear'], ['get', 'point_count'],
        1, 'rgba(34, 197, 94, 0.12)',
        12, 'rgba(250, 204, 21, 0.14)',
        36, 'rgba(249, 115, 22, 0.18)',
        96, 'rgba(239, 68, 68, 0.22)',
      ],
      'circle-opacity': 0,
      'circle-blur': 0.42,
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(255,255,255,0.08)',
    },
  })

  map.addLayer({
    id: heatmapStackLayerId(sourceId, 'cluster-count'),
    type: 'symbol',
    source: sourceId,
    maxzoom: 9,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-size': 11,
      'text-font': ['Open Sans Bold'],
    },
    paint: {
      'text-color': '#F3F4F6',
      'text-opacity': 0,
    },
  })

  map.addLayer({
    id: heatmapStackLayerId(sourceId, 'layer'),
    type: 'heatmap',
    source: sourceId,
    minzoom: 7,
    maxzoom: 14,
    filter: ['!', ['has', 'point_count']],
    layout: { visibility: 'none' },
    paint: {
      'heatmap-weight': [
        'interpolate', ['linear'], ['get', 'intensity'],
        0, 0,
        0.24, 0.08,
        0.55, 0.36,
        0.78, 0.74,
        1, 1,
      ],
      'heatmap-intensity': [
        'interpolate', ['linear'], ['zoom'],
        7, 0.55,
        10, 0.95,
        13, 1.2,
        14, 1.35,
      ],
      'heatmap-radius': [
        'interpolate', ['linear'], ['zoom'],
        7, 16,
        10, 24,
        13, 34,
        14, 42,
      ],
      'heatmap-opacity': buildCongestionHeatmapOpacity(1),
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0.0, 'rgba(0,0,0,0)',
        0.18, 'rgba(34, 197, 94, 0.06)',
        0.42, 'rgba(250, 204, 21, 0.1)',
        0.64, 'rgba(249, 115, 22, 0.16)',
        0.84, 'rgba(239, 68, 68, 0.2)',
        1.0, 'rgba(239, 68, 68, 0.24)',
      ],
    },
  })

  map.addLayer({
    id: heatmapStackLayerId(sourceId, 'hotspots-glow'),
    type: 'circle',
    source: sourceId,
    minzoom: 12,
    filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'peak'], 1]],
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        12, 14,
        16, 30,
      ],
      'circle-color': '#FF6B57',
      'circle-opacity': 0,
      'circle-blur': 1,
    },
  })

  map.addLayer({
    id: heatmapStackLayerId(sourceId, 'hotspots'),
    type: 'circle',
    source: sourceId,
    minzoom: 12,
    filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'peak'], 1]],
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        12, 6,
        16, 14,
      ],
      'circle-color': '#EF4444',
      'circle-opacity': 0,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': 'rgba(255,255,255,0.42)',
    },
  })

  map.addLayer({
    id: heatmapStackLayerId(sourceId, 'labels'),
    type: 'symbol',
    source: sourceId,
    minzoom: 12,
    filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'peak'], 1]],
    layout: {
      'text-field': ['get', 'contextLabel'],
      'text-size': 10,
      'text-font': ['Open Sans Bold'],
      'text-offset': [0, 1.4],
      'text-anchor': 'top',
      'text-allow-overlap': false,
      'symbol-sort-key': ['get', 'intensity'],
    },
    paint: {
      'text-color': '#F9FAFB',
      'text-halo-color': 'rgba(8,9,11,0.78)',
      'text-halo-width': 1.2,
      'text-opacity': 0,
    },
  })

  map.addLayer({
    id: heatmapStackLayerId(sourceId, 'circles'),
    type: 'circle',
    source: sourceId,
    filter: ['!', ['has', 'point_count']],
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        7, 16,
        12, 22,
        16, 28,
      ],
      'circle-color': 'rgba(0,0,0,0)',
      'circle-opacity': 0,
    },
  })
}

function initHeatmapPassagesLayers(map: maplibregl.Map) {
  const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

  // Passages heatmap
  map.addSource(HEATMAP_PASSAGES_SOURCE, { type: 'geojson', data: emptyFC })
  map.addLayer({
    id:     HEATMAP_PASSAGES_SOURCE + '-layer',
    type:   'heatmap',
    source: HEATMAP_PASSAGES_SOURCE,
    maxzoom: 16,
    layout: { visibility: 'none' },
    paint: {
      'heatmap-weight':    ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
      'heatmap-radius':    ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 22],
      'heatmap-opacity':   0.70,
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0,    'rgba(0, 100, 255, 0)',
        0.25, 'rgba(0, 150, 255, 0.4)',
        0.5,  'rgba(0, 200, 200, 0.6)',
        0.75, 'rgba(0, 255, 150, 0.8)',
      ],
    },
  })

  map.addLayer({
    id:     HEATMAP_PASSAGES_SOURCE + '-circles',
    type:   'circle',
    source: HEATMAP_PASSAGES_SOURCE,
    paint:  {
      'circle-radius': 18,
      'circle-color': 'rgba(0,0,0,0)',
      'circle-opacity': 0
    }
  })

  // CO2 heatmap
  map.addSource(HEATMAP_CO2_SOURCE, { type: 'geojson', data: emptyFC })
  map.addLayer({
    id:     HEATMAP_CO2_SOURCE + '-layer',
    type:   'heatmap',
    source: HEATMAP_CO2_SOURCE,
    maxzoom: 16,
    layout: { visibility: 'none' },
    paint: {
      'heatmap-weight':    ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
      'heatmap-radius':    ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 22],
      'heatmap-opacity':   0.70,
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0,    'rgba(100, 0, 200, 0)',
        0.2,  'rgba(100, 0, 200, 0.3)',
        0.5,  'rgba(200, 50, 50, 0.6)',
        0.75, 'rgba(255, 100, 0, 0.8)',
      ],
    },
  })

  map.addLayer({
    id:     HEATMAP_CO2_SOURCE + '-circles',
    type:   'circle',
    source: HEATMAP_CO2_SOURCE,
    paint:  {
      'circle-radius': 18,
      'circle-color': 'rgba(0,0,0,0)',
      'circle-opacity': 0
    }
  })
}

function initZoneLayers(map: maplibregl.Map) {
  const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

  // Draft polyline source
  map.addSource(ZONE_DRAFT_SOURCE, { type: 'geojson', data: emptyFC })
  map.addLayer({
    id: ZONE_DRAFT_SOURCE + '-line',
    type: 'line',
    source: ZONE_DRAFT_SOURCE,
    paint: {
      'line-color':    '#FACC15',
      'line-width':    2,
      'line-opacity':  0.8,
      'line-dasharray': [4, 3],
    },
  })

  // Finalized zone source
  map.addSource(ZONE_SOURCE, { type: 'geojson', data: emptyFC })
  map.addLayer({
    id: ZONE_SOURCE + '-fill',
    type: 'fill',
    source: ZONE_SOURCE,
    paint: {
      'fill-color':   '#FACC15',
      'fill-opacity': 0.12,
    },
  })
  map.addLayer({
    id: ZONE_SOURCE + '-outline',
    type: 'line',
    source: ZONE_SOURCE,
    paint: {
      'line-color':   '#FACC15',
      'line-width':   2.5,
      'line-opacity': 0.9,
    },
  })
}

function initSocialLayers(map: maplibregl.Map) {
  const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
  map.addSource(SOCIAL_SOURCE, { 
    type: 'geojson', 
    data: emptyFC,
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 40
  })

  map.addLayer({
    id: SOCIAL_SOURCE + '-glow',
    type: 'circle',
    source: SOCIAL_SOURCE,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 10, 14, 20],
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.15,
      'circle-blur': 1,
    }
  })

  map.addLayer({
    id: SOCIAL_SOURCE + '-circles',
    type: 'circle',
    source: SOCIAL_SOURCE,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 14, 9],
      'circle-color': ['get', 'color'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
      'circle-opacity': 0.9
    }
  })
}

function extractCoordsFromPoint(wellKnownText: any): { lat: number, lng: number } {
  if (!wellKnownText) return { lat: 0, lng: 0 }
  if (typeof wellKnownText === 'object') return wellKnownText
  const match = String(wellKnownText).match(/POINT\(([^ ]+) ([^ ]+)\)/)
  if (match) return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) }
  return { lat: 0, lng: 0 }
}

// Flatten all coordinates from a GeoJSON geometry
function extractCoords(geom: GeoJSON.Geometry): number[][] {
  if (!geom) return []
  if (geom.type === 'Point') return [geom.coordinates as number[]]
  if (geom.type === 'LineString') return geom.coordinates as number[][]
  if (geom.type === 'Polygon') return (geom.coordinates as number[][][]).flat()
  if (geom.type === 'MultiPolygon') return (geom.coordinates as number[][][][]).flat(2)
  return []
}

function addTomTomLayers(map: maplibregl.Map) {
  const flowUrl = getTrafficFlowTileUrl()
  const incUrl  = getTrafficIncidentTileUrl()

  // Helper : désactive un layer TomTom après N erreurs consécutives (évite le spam 503)
  function watchTileErrors(sourceId: string, layerId: string, maxErrors = 3) {
    let errorCount = 0
    const onError = (e: any) => {
      const status = e?.error?.status
      const isTransient = status === 503 || status === 429 || String(e?.error).includes('AJAXError')

      if (!isTransient) return
      
      errorCount++
      if (errorCount >= maxErrors) {
        // Désactiver silencieusement le layer — stop la boucle de retry
        try {
          if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', 'none')
          console.warn(`[CrossFlow] TomTom layer "${layerId}" désactivé après ${errorCount} erreurs — switch automatique en mode synthétique`)
          
          // Force fallback to synthetic if TomTom fails
          const store = useTrafficStore.getState()
          if (store.dataSource === 'live') {
            store.setDataSource('synthetic')
          }
        } catch { /* carte déjà détruite */ }
        map.off('error', onError)
      }
    }
    map.on('error', onError)
  }

  if (flowUrl) {
    try {
      map.addSource(TOMTOM_FLOW, {
        type:    'raster',
        tiles:   [flowUrl],
        tileSize: 256,
        maxzoom: 14, // Prevent API bombing at high zoom levels
      })
      map.addLayer({
        id:     TOMTOM_FLOW + '-layer',
        type:   'raster',
        source: TOMTOM_FLOW,
        paint:  { 'raster-opacity': 0.85 },
      })
      watchTileErrors(TOMTOM_FLOW, TOMTOM_FLOW + '-layer')
    } catch (err) {
      console.warn('[CrossFlow] TomTom flow layer init failed:', err)
    }
  }

  if (incUrl) {
    try {
      map.addSource(TOMTOM_INC, {
        type:    'raster',
        tiles:   [incUrl],
        tileSize: 256,
        maxzoom: 14, // Limit traffic incident requests
      })
      map.addLayer({
        id:     TOMTOM_INC + '-layer',
        type:   'raster',
        source: TOMTOM_INC,
        paint:  { 'raster-opacity': 0.90 },
      })
      watchTileErrors(TOMTOM_INC, TOMTOM_INC + '-layer')
    } catch (err) {
      console.warn('[CrossFlow] TomTom incidents layer init failed:', err)
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapIncidentType(iconCategory: number): Incident['type'] {
  const map: Record<number, Incident['type']> = {
    0: 'congestion', 1: 'accident',   2: 'roadwork',
    3: 'roadwork',   4: 'congestion', 5: 'roadwork',
    6: 'event',      7: 'anomaly',    8: 'roadwork',
    9: 'congestion', 10: 'accident',  11: 'event',
  }
  return map[iconCategory] ?? 'anomaly'
}

function getSeverityColor(sev: Incident['severity']): string {
  const colors = { low: '#00E676', medium: '#FFD600', high: '#FF6D00', critical: '#FF1744' }
  return colors[sev]
}

// Estimate road segment length in meters from coordinate array
function estimateSegmentLength(coords: [number, number][]): number {
  let len = 0
  for (let i = 1; i < coords.length; i++) {
    const dx = (coords[i][0] - coords[i-1][0]) * 111320 * Math.cos(coords[i][1] * Math.PI / 180)
    const dy = (coords[i][1] - coords[i-1][1]) * 110540
    len += Math.sqrt(dx * dx + dy * dy)
  }
  return Math.round(len)
}

// Wrapper to allow inline call with dynamic import-style syntax
function import_scoreToCongestionLevel(score: number): CongestionLevel {
  if (score < 0.25) return 'free'
  if (score < 0.55) return 'slow'
  if (score < 0.80) return 'congested'
  return 'critical'
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function getSpeedRatio(segment: Pick<TrafficSegment, 'speedKmh' | 'freeFlowSpeedKmh'>): number {
  return clamp01(segment.speedKmh / Math.max(segment.freeFlowSpeedKmh, 1))
}

function getCredibleSpeedKmh(speedKmh: number, freeFlowSpeedKmh: number, congestionScore: number): number {
  const freeFlow = Math.max(18, freeFlowSpeedKmh || 18)
  const floorRatio =
    congestionScore >= 0.8 ? 0.16 :
    congestionScore >= 0.6 ? 0.24 :
    congestionScore >= 0.38 ? 0.4 :
    0.58
  const minSpeed = Math.max(8, freeFlow * floorRatio)
  return Math.round(Math.max(speedKmh || 0, minSpeed))
}

function getSegmentBearing(coords: [number, number][]): number {
  if (coords.length < 2) return 0
  const [lng1, lat1] = coords[0]
  const [lng2, lat2] = coords[coords.length - 1]
  const y = Math.sin((lng2 - lng1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lng2 - lng1) * Math.PI / 180)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

function getTrafficColor(speedRatio: number): string {
  if (speedRatio >= 0.8) return '#22C55E'
  if (speedRatio >= 0.6) return '#FFD600'
  if (speedRatio >= 0.4) return '#FF9F0A'
  return '#EF4444'
}

function buildTrafficZones(segments: TrafficSegment[]) {
  const cellSize = 0.006
  const groups = new Map<string, {
    lng: number
    lat: number
    count: number
    ratioSum: number
    speedSum: number
    freeFlowSum: number
    lengthSum: number
  }>()

  segments.forEach(seg => {
    const coords = seg.coordinates
    if (!coords.length) return
    const mid = coords[Math.floor(coords.length / 2)]
    const key = `${Math.round(mid[0] / cellSize)}:${Math.round(mid[1] / cellSize)}`
    const current = groups.get(key) ?? {
      lng: 0,
      lat: 0,
      count: 0,
      ratioSum: 0,
      speedSum: 0,
      freeFlowSum: 0,
      lengthSum: 0,
    }

    current.lng += mid[0]
    current.lat += mid[1]
    current.count += 1
    current.ratioSum += getSpeedRatio(seg)
    current.speedSum += seg.speedKmh
    current.freeFlowSum += seg.freeFlowSpeedKmh
    current.lengthSum += seg.length
    groups.set(key, current)
  })

  const half = cellSize * 0.45
  return Array.from(groups.values()).map(group => {
    const lng = group.lng / group.count
    const lat = group.lat / group.count
    const ratio = clamp01(group.ratioSum / group.count)
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [lng - half, lat - half],
          [lng + half, lat - half],
          [lng + half, lat + half],
          [lng - half, lat + half],
          [lng - half, lat - half],
        ]],
      },
      properties: {
        speedRatio: ratio,
        speedKmh: Math.round(group.speedSum / group.count),
        freeFlowSpeedKmh: Math.round(group.freeFlowSum / group.count),
        segmentCount: group.count,
        intensity: clamp01(1 - ratio),
      },
    }
  })
}

function buildFlowMarkers(segments: TrafficSegment[]) {
  return segments
    .filter(seg => {
      const ratio = getSpeedRatio(seg)
      return (
        ['motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link'].includes(seg.roadType ?? '') ||
        ratio <= 0.82 ||
        (seg.priorityAxis ?? 0) >= 0.65
      )
    })
    .map(seg => {
      const coords = seg.coordinates
      const mid = coords[Math.floor(coords.length / 2)] ?? coords[0]
      const ratio = getSpeedRatio(seg)
      const importance = clamp01(seg.priorityAxis ?? (seg.roadType === 'motorway' ? 1 : seg.roadType === 'trunk' ? 0.85 : seg.roadType === 'primary' ? 0.7 : 0.45))
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: mid,
        },
        properties: {
          bearing: getSegmentBearing(coords),
          speedRatio: ratio,
          importance,
          roadType: seg.roadType ?? 'road',
        },
      }
    })
}

function splitIncidents(incidents: Incident[]) {
  return incidents.reduce<{
    critical: Incident[]
    clusterable: Incident[]
  }>((acc, incident) => {
    if (incident.severity === 'critical' || incident.severity === 'high') {
      acc.critical.push(incident)
    } else {
      acc.clusterable.push(incident)
    }
    return acc
  }, { critical: [], clusterable: [] })
}
