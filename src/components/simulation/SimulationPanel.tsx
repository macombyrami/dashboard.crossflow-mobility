'use client'

import { useMemo, useState } from 'react'
import {
  Ban,
  CheckCircle2,
  Cpu,
  Download,
  Loader2,
  MapPin,
  Search,
  TrafficCone,
  Trash2,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ReactNode } from 'react'

import { useMapStore } from '@/store/mapStore'
import {
  SIMULATION_INTERACTION_MODE,
  useSimulationStore,
  type SimulationInteractionMode,
} from '@/store/simulationStore'
import { runSimulation } from '@/lib/engine/simulation.engine'
import { cn } from '@/lib/utils/cn'

const TRAFFIC_LEVELS: Array<{ value: 'light' | 'medium' | 'heavy'; label: string; color: string }> = [
  { value: 'light', label: 'Leger x1.2', color: '#00E676' },
  { value: 'medium', label: 'Moyen x1.5', color: '#FF6D00' },
  { value: 'heavy', label: 'Fort x2.0', color: '#FF1744' },
]

const EVENT_TYPES: Array<{ value: 'accident' | 'works' | 'demonstration' | 'administrative'; label: string; icon: ReactNode }> = [
  { value: 'accident', label: 'Accident', icon: '💥' },
  { value: 'works', label: 'Travaux', icon: '🚧' },
  { value: 'demonstration', label: 'Manifestation', icon: '📢' },
  { value: 'administrative', label: 'Fermeture', icon: '🚫' },
]

type LocalEventType = 'accident' | 'works' | 'demonstration' | 'administrative'

export function SimulationPanel() {
  const city = useMapStore(s => s.city)
  const selectedSegmentId = useMapStore(s => s.selectedSegmentId)

  const interactionMode = useSimulationStore(s => s.interactionMode)
  const trafficLevel = useSimulationStore(s => s.trafficLevel)
  const eventLocation = useSimulationStore(s => s.eventLocation)
  const locationPickerActive = useSimulationStore(s => s.locationPickerActive)
  const setEventLocation = useSimulationStore(s => s.setEventLocation)
  const setLocationPickerActive = useSimulationStore(s => s.setLocationPickerActive)
  const setInteractionMode = useSimulationStore(s => s.setInteractionMode)
  const status = useSimulationStore(s => s.status)
  const lastError = useSimulationStore(s => s.lastError)
  const setLastError = useSimulationStore(s => s.setLastError)
  const setTrafficLevel = useSimulationStore(s => s.setTrafficLevel)
  const roadNetwork = useSimulationStore(s => s.roadNetwork)
  const scenarioType = useSimulationStore(s => s.scenarioType)
  const buildScenario = useSimulationStore(s => s.buildScenario)
  const blockedEdgeIds = useSimulationStore(s => s.blockedEdgeIds)
  const trafficEdges = useSimulationStore(s => s.trafficEdges)
  const localEvents = useSimulationStore(s => s.localEvents)
  const blockRoad = useSimulationStore(s => s.blockRoad)
  const unblockRoad = useSimulationStore(s => s.unblockRoad)
  const setTrafficEdge = useSimulationStore(s => s.setTrafficEdge)
  const addLocalEvent = useSimulationStore(s => s.addLocalEvent)
  const removeLocalEvent = useSimulationStore(s => s.removeLocalEvent)
  const resetLocalSimulation = useSimulationStore(s => s.resetLocalSimulation)
  const addResult = useSimulationStore(s => s.addResult)
  const setCurrentResult = useSimulationStore(s => s.setCurrentResult)
  const setRunning = useSimulationStore(s => s.setRunning)
  const setProgress = useSimulationStore(s => s.setProgress)
  const isRunning = useSimulationStore(s => s.isRunning)

  const [eventType, setEventType] = useState<LocalEventType>('works')
  const [eventRadius, setEventRadius] = useState(300)
  const [isBusy, setIsBusy] = useState(false)

  const selectedSegmentLabel = useMemo(() => {
    if (!selectedSegmentId) return null
    return selectedSegmentId.length > 28 ? `...${selectedSegmentId.slice(-12)}` : selectedSegmentId
  }, [selectedSegmentId])

  const analytics = useMemo(() => {
    const totalEdges = roadNetwork?.features.length ?? 0
    const activeTraffic = Object.values(trafficEdges).length
    return {
      blocked: blockedEdgeIds.length,
      slow: activeTraffic,
      events: localEvents.length,
      edges: totalEdges,
      localReady: Boolean(roadNetwork),
    }
  }, [blockedEdgeIds.length, localEvents.length, roadNetwork, trafficEdges])

  const statusLabel =
    status === 'ready'
      ? 'Moteur local pret'
      : status === 'initializing'
        ? 'Initialisation de la carte'
        : status === 'error'
          ? 'Erreur locale'
          : 'Mode local'

  const statusCopy =
    status === 'ready'
      ? 'Simulation temps reel activee sans backend distant.'
      : status === 'initializing'
        ? 'Chargement du graphe IDF local...'
        : status === 'error'
          ? (lastError || 'Donnees locales indisponibles')
          : 'La simulation utilise les donnees locales du projet predictive-main.'

  const handleBlockRoad = () => {
    if (!selectedSegmentId) {
      toast.warning('Selectionnez un segment sur la carte.')
      return
    }

    setLastError(null)
    blockRoad(selectedSegmentId)
    setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
    toast.success('Route bloquee sur la carte')
  }

  const handleAddTraffic = () => {
    if (!selectedSegmentId) {
      toast.warning('Selectionnez un segment sur la carte.')
      return
    }

    setLastError(null)
    setTrafficEdge(selectedSegmentId, trafficLevel)
    setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
    toast.success('Trafic applique au segment')
  }

  const handleCreateEvent = () => {
    const center = eventLocation ?? city.center
    const affectedEdges = approximateAffectedEdges(roadNetwork, center.lat, center.lng, eventRadius)

    setLastError(null)
    addLocalEvent({
      type: eventType,
      label: `${city.name} ${EVENT_TYPES.find(evt => evt.value === eventType)?.label ?? 'Evenement'}`,
      lat: center.lat,
      lng: center.lng,
      radius: eventRadius,
      affectedEdges,
    })

    setLocationPickerActive(false)
    setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
    toast.success('Evenement ajoute a la simulation')
  }

  const handleExportGeoJSON = () => {
    const data = buildAffectedEdgesGeoJSON(roadNetwork, blockedEdgeIds, trafficEdges)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/geo+json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'crossflow_affected_edges.geojson'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('GeoJSON exporte')
  }

  const handleRunComparison = async () => {
    setRunning(true)
    setProgress(8)
    setLastError(null)

    try {
      const scenario = buildScenario()
      scenario.name = scenario.name || `${city.name} - ${scenarioType}`
      const result = await runSimulation(city, scenario, pct => setProgress(pct))
      addResult(result)
      setCurrentResult(result)
      toast.success('Simulation comparee avec succes')
    } catch (err: any) {
      setLastError(err?.message ?? 'Impossible de lancer la comparaison locale.')
      toast.error('Comparaison impossible')
    } finally {
      setRunning(false)
      setProgress(0)
    }
  }

  const handleReset = () => {
    resetLocalSimulation()
    setEventLocation(null)
    setLocationPickerActive(false)
    setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
    toast.success('Simulation reinitialisee')
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'px-4 py-3 rounded-2xl border flex items-center justify-between gap-4',
          status === 'ready'
            ? 'bg-brand/5 border-brand/20'
            : status === 'error'
              ? 'bg-[#FF1744]/5 border-[#FF1744]/20'
              : 'bg-bg-elevated border-bg-border',
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          {status === 'initializing' ? (
            <Loader2 className="w-4 h-4 animate-spin text-brand" />
          ) : status === 'ready' ? (
            <CheckCircle2 className="w-4 h-4 text-brand" />
          ) : status === 'error' ? (
            <Ban className="w-4 h-4 text-[#FF1744]" />
          ) : (
            <Cpu className="w-4 h-4 text-text-muted" />
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-primary">
              {statusLabel}
            </p>
            <p className="text-[10px] text-text-secondary leading-tight">
              {statusCopy}
            </p>
          </div>
        </div>

        <div className="hidden xl:flex items-center gap-2">
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-white/5 border border-white/10 text-text-muted uppercase tracking-widest">
            Mode local
          </span>
        </div>
      </div>

      <section className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-bg-border">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">
            Mode interaction
          </p>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-[11px] text-text-muted leading-relaxed">
            Activez un mode puis cliquez sur un segment de la carte. Le clic suivant applique l'action.
          </p>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setInteractionMode(
                interactionMode === SIMULATION_INTERACTION_MODE.BLOCK_ROAD
                  ? SIMULATION_INTERACTION_MODE.NONE
                  : SIMULATION_INTERACTION_MODE.BLOCK_ROAD
              )}
              className={cn(
                'rounded-xl border px-3 py-2 text-left transition-all',
                interactionMode === SIMULATION_INTERACTION_MODE.BLOCK_ROAD
                  ? 'border-[#FF1744]/30 bg-[#FF1744]/10 text-[#FF1744]'
                  : 'border-bg-border bg-bg-elevated text-text-secondary hover:bg-white/5 hover:text-text-primary',
              )}
            >
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Blocage</span>
              </div>
            </button>
            <button
              onClick={() => setInteractionMode(
                interactionMode === SIMULATION_INTERACTION_MODE.ADD_TRAFFIC
                  ? SIMULATION_INTERACTION_MODE.NONE
                  : SIMULATION_INTERACTION_MODE.ADD_TRAFFIC
              )}
              className={cn(
                'rounded-xl border px-3 py-2 text-left transition-all',
                interactionMode === SIMULATION_INTERACTION_MODE.ADD_TRAFFIC
                  ? 'border-[#FF6D00]/30 bg-[#FF6D00]/10 text-[#FF6D00]'
                  : 'border-bg-border bg-bg-elevated text-text-secondary hover:bg-white/5 hover:text-text-primary',
              )}
            >
              <div className="flex items-center gap-2">
                <TrafficCone className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Trafic</span>
              </div>
            </button>
            <button
              onClick={() => setLocationPickerActive(!locationPickerActive)}
              className={cn(
                'rounded-xl border px-3 py-2 text-left transition-all',
                locationPickerActive
                  ? 'border-[#2979FF]/30 bg-[#2979FF]/10 text-[#2979FF]'
                  : 'border-bg-border bg-bg-elevated text-text-secondary hover:bg-white/5 hover:text-text-primary',
              )}
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Evenement</span>
              </div>
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-bg-border bg-bg-elevated px-3 py-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-text-muted">Segment selectionne</p>
              <p className="text-xs font-semibold text-text-primary truncate">
                {selectedSegmentLabel ?? 'Aucun segment selectionne'}
              </p>
            </div>
            <button
              onClick={handleBlockRoad}
              className={cn(
                'shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all',
                !selectedSegmentId
                  ? 'bg-bg-elevated text-text-muted border border-bg-border cursor-not-allowed'
                  : 'bg-[#FF1744]/10 text-[#FF1744] border border-[#FF1744]/20 hover:bg-[#FF1744]/15',
              )}
            >
              <Ban className="w-3.5 h-3.5" />
              Bloquer
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Bloquees" value={analytics.blocked} accent="text-[#FF1744]" />
            <MiniStat label="Ralenties" value={analytics.slow} accent="text-[#FF6D00]" />
            <MiniStat label="Evenements" value={analytics.events} accent="text-brand" />
          </div>

          {blockedEdgeIds.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                Routes bloquees
              </p>
              <div className="space-y-2">
                {blockedEdgeIds.slice(0, 5).map(edgeId => (
                  <div
                    key={edgeId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-bg-border bg-bg-elevated px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">{formatSegmentLabel(edgeId)}</p>
                      <p className="text-[10px] text-text-muted uppercase tracking-widest">Impact direct sur le maillage</p>
                    </div>
                    <button
                      onClick={() => unblockRoad(edgeId)}
                      className="text-[10px] font-bold text-[#FF1744] uppercase tracking-widest hover:underline"
                    >
                      Retirer
                    </button>
                  </div>
                ))}
              </div>
              {blockedEdgeIds.length > 5 && (
                <p className="text-[10px] text-text-muted">
                  +{blockedEdgeIds.length - 5} autres segments
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-bg-border">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">
            Simuler du trafic
          </p>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {TRAFFIC_LEVELS.map(level => {
              const active = trafficLevel === level.value
              return (
                <button
                  key={level.value}
                  onClick={() => setTrafficLevel(level.value)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-left transition-all',
                    active
                      ? 'border-brand/30 bg-brand/10 text-brand'
                      : 'border-bg-border bg-bg-elevated text-text-secondary hover:bg-white/5 hover:text-text-primary',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: level.color }} />
                    <span className="text-[11px] font-bold uppercase tracking-wider">{level.label}</span>
                  </div>
                </button>
              )
            })}
          </div>

          <button
            onClick={handleAddTraffic}
            disabled={!selectedSegmentId}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border',
              !selectedSegmentId
                ? 'bg-bg-elevated text-text-muted border-bg-border cursor-not-allowed'
                : 'bg-[#FF6D00]/10 text-[#FF6D00] border-[#FF6D00]/20 hover:bg-[#FF6D00]/15',
            )}
          >
            <TrafficCone className="w-4 h-4" />
            Appliquer le trafic sur un segment
          </button>

          <div className="space-y-2 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              Intensite du trafic
            </p>
            <div className="grid grid-cols-3 gap-2">
              {TRAFFIC_LEVELS.map(level => (
                <div key={level.value} className="rounded-xl border border-bg-border bg-bg-elevated px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: level.color }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">{level.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-bg-border">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">
            Creer un evenement
          </p>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {EVENT_TYPES.map(evt => {
              const active = eventType === evt.value
              return (
                <button
                  key={evt.value}
                  onClick={() => setEventType(evt.value)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-left transition-all',
                    active
                      ? 'border-brand/30 bg-brand/10 text-brand'
                      : 'border-bg-border bg-bg-elevated text-text-secondary hover:bg-white/5 hover:text-text-primary',
                  )}
                >
                  <span className="text-sm mr-2">{evt.icon}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider">{evt.label}</span>
                </button>
              )
            })}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs text-text-secondary">Rayon d'impact</label>
              <span className="text-xs font-semibold text-brand">{eventRadius} m</span>
            </div>
            <input
              type="range"
              min={50}
              max={1000}
              step={50}
              value={eventRadius}
              onChange={e => setEventRadius(Number(e.target.value))}
              className="w-full accent-[#00E676] cursor-pointer"
            />
          </div>

          <div className="space-y-2 rounded-xl border border-bg-border bg-bg-elevated px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-text-muted">Point d'impact</p>
                <p className="text-xs font-semibold text-text-primary truncate">
                  {eventLocation
                    ? `${eventLocation.lat.toFixed(4)}, ${eventLocation.lng.toFixed(4)}`
                    : `Centre de ${city.name}`}
                </p>
              </div>
              {eventLocation && (
                <button
                  onClick={() => setEventLocation(null)}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#FF4757] hover:underline"
                >
                  Reinitialiser
                </button>
              )}
            </div>

            <button
              onClick={() => setLocationPickerActive(!locationPickerActive)}
              className={cn(
                'w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold uppercase tracking-widest border transition-all',
                locationPickerActive
                  ? 'bg-[#FF4757]/10 text-[#FF4757] border-[#FF4757]/20 animate-pulse'
                  : 'bg-bg-surface text-text-secondary border-bg-border hover:bg-white/5 hover:text-text-primary',
              )}
            >
              <MapPin className="w-3.5 h-3.5" />
              {locationPickerActive ? 'Cliquez sur la carte...' : 'Placer sur la carte'}
            </button>

            <button
              onClick={handleCreateEvent}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border bg-[#2979FF]/10 text-[#2979FF] border-[#2979FF]/20 hover:bg-[#2979FF]/15"
            >
              <Zap className="w-4 h-4" />
              Placer l'evenement sur la carte
            </button>
          </div>

          {localEvents.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                Evenements actifs
              </p>
              <div className="space-y-2">
                {localEvents.slice(0, 5).map(evt => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-bg-border bg-bg-elevated px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">{evt.label}</p>
                      <p className="text-[10px] text-text-muted uppercase tracking-widest">
                        {evt.affectedEdges.length > 0 ? `${evt.affectedEdges.length} routes impactees` : 'Impact local'}
                      </p>
                    </div>
                    <button
                      onClick={() => removeLocalEvent(evt.id)}
                      className="text-[10px] font-bold text-[#2979FF] uppercase tracking-widest hover:underline"
                    >
                      Retirer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="bg-bg-surface border border-bg-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">
            Actions globales
          </p>
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
            Mise a jour locale
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-brand/10 hover:border-brand/20 text-[10px] font-bold text-text-primary uppercase tracking-widest transition-all"
            onClick={handleExportGeoJSON}
            disabled={isBusy}
          >
            <Download className="w-3.5 h-3.5 text-brand" />
            GeoJSON
          </button>
          <button
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-[10px] font-bold text-text-primary uppercase tracking-widest transition-all"
            onClick={handleReset}
            disabled={isBusy}
          >
            <Trash2 className="w-3.5 h-3.5 text-text-muted" />
            Reinitialiser
          </button>
        </div>

        <button
          onClick={handleRunComparison}
          disabled={isBusy || isRunning}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border',
            isBusy || isRunning
              ? 'bg-bg-elevated text-text-muted border-bg-border cursor-not-allowed'
              : 'bg-brand/10 text-brand border-brand/20 hover:bg-brand/15',
          )}
        >
          <Cpu className={cn('w-4 h-4', isRunning && 'animate-pulse')} />
          {isRunning ? 'Comparaison en cours...' : 'Tester l\'impact'}
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <Pill icon={<Cpu className="w-3 h-3" />} tone="brand">
            Moteur local actif
          </Pill>
          <Pill icon={<Search className="w-3 h-3" />} tone="muted">
            Graphe IDF charge
          </Pill>
          {isBusy && (
            <Pill icon={<Loader2 className="w-3 h-3 animate-spin" />} tone="muted">
              Execution...
            </Pill>
          )}
        </div>
      </section>
    </div>
  )
}

function MiniStat({ label, value, accent = 'text-white' }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="rounded-xl bg-bg-elevated border border-bg-border px-3 py-2">
      <p className="text-[9px] uppercase tracking-widest text-text-muted">{label}</p>
      <p className={cn('text-sm font-bold mt-1', accent)}>{value}</p>
    </div>
  )
}

function formatSegmentLabel(id: string) {
  if (!id) return 'Segment'
  const compact = id.length > 28 ? `...${id.slice(-12)}` : id
  return compact.replace(/[_-]+/g, ' ')
}

function approxCoordKey(lng: number, lat: number) {
  return `${lng.toFixed(4)}:${lat.toFixed(4)}`
}

function approximateAffectedEdges(
  network: GeoJSON.FeatureCollection | null,
  lat: number,
  lng: number,
  radiusMeters: number,
) {
  if (!network?.features?.length) return []
  const threshold = Math.max(0.002, radiusMeters / 100000)
  const affected: string[] = []

  for (const feature of network.features.slice(0, 300)) {
    if (feature.geometry?.type !== 'LineString') continue
    const coords = feature.geometry.coordinates as [number, number][]
    const close = coords.some(([x, y]) => Math.abs(x - lng) <= threshold && Math.abs(y - lat) <= threshold)
    if (close) {
      const id = String((feature.properties as Record<string, unknown> | undefined)?.id ?? '')
      if (id) affected.push(id)
    }
  }

  return affected.slice(0, 25)
}

function buildAffectedEdgesGeoJSON(
  network: GeoJSON.FeatureCollection | null,
  blockedEdgeIds: string[],
  trafficEdges: Record<string, 'light' | 'medium' | 'heavy'>,
) {
  if (!network?.features?.length) {
    return { type: 'FeatureCollection', features: [] }
  }

  const features = network.features
    .filter(feature => {
      const id = String((feature.properties as Record<string, unknown> | undefined)?.id ?? '')
      return blockedEdgeIds.includes(id) || Boolean(trafficEdges[id])
    })
    .map(feature => {
      const id = String((feature.properties as Record<string, unknown> | undefined)?.id ?? '')
      const level = trafficEdges[id]
      return {
        ...feature,
        properties: {
          ...(feature.properties ?? {}),
          status: blockedEdgeIds.includes(id) ? 'blocked' : 'slow',
          traffic_level: level ?? 'heavy',
        },
      }
    })

  return {
    type: 'FeatureCollection',
    features,
  }
}

function Pill({
  icon,
  children,
  tone = 'muted',
}: {
  icon: ReactNode
  children: ReactNode
  tone?: 'muted' | 'brand'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border uppercase tracking-widest',
        tone === 'brand'
          ? 'bg-brand/10 border-brand/20 text-brand'
          : 'bg-white/5 border-white/5 text-text-muted',
      )}
    >
      {icon}
      {children}
    </span>
  )
}
