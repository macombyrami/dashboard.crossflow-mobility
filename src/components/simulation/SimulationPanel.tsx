'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
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

import { predictiveApi, type PredEventType, type PredTrafficLevel } from '@/lib/api/predictive'
import { simulationService } from '@/lib/services/SimulationService'
import { useMapStore } from '@/store/mapStore'
import { SIMULATION_INTERACTION_MODE, useSimulationStore } from '@/store/simulationStore'
import { cn } from '@/lib/utils/cn'

const TRAFFIC_LEVELS: Array<{ value: 'light' | 'medium' | 'heavy'; label: string; color: string }> = [
  { value: 'light', label: 'Léger ×1.2', color: '#00E676' },
  { value: 'medium', label: 'Moyen ×1.5', color: '#FF6D00' },
  { value: 'heavy', label: 'Fort ×2.0', color: '#FF1744' },
]

const EVENT_TYPES: Array<{ value: PredEventType; label: string; icon: ReactNode }> = [
  { value: 'accident', label: 'Accident', icon: '💥' },
  { value: 'works', label: 'Travaux', icon: '🚧' },
  { value: 'demonstration', label: 'Manifestation', icon: '📢' },
  { value: 'administrative', label: 'Fermeture', icon: '🚫' },
]

export function SimulationPanel() {
  const city = useMapStore(s => s.city)
  const selectedSegmentId = useMapStore(s => s.selectedSegmentId)
  const revision = useSimulationStore(s => s.revision)
  const interactionMode = useSimulationStore(s => s.interactionMode)
  const trafficLevel = useSimulationStore(s => s.trafficLevel)
  const eventLocation = useSimulationStore(s => s.eventLocation)
  const locationPickerActive = useSimulationStore(s => s.locationPickerActive)
  const setEventLocation = useSimulationStore(s => s.setEventLocation)
  const setLocationPickerActive = useSimulationStore(s => s.setLocationPickerActive)
  const setInteractionMode = useSimulationStore(s => s.setInteractionMode)
  const status = useSimulationStore(s => s.status)
  const lastError = useSimulationStore(s => s.lastError)
  const bumpRevision = useSimulationStore(s => s.bumpRevision)
  const setLastError = useSimulationStore(s => s.setLastError)
  const setTrafficLevel = useSimulationStore(s => s.setTrafficLevel)

  const [eventType, setEventType] = useState<PredEventType>('works')
  const [eventRadius, setEventRadius] = useState(300)
  const [isBusy, setIsBusy] = useState(false)
  const [analytics, setAnalytics] = useState<{
    blocked: number
    slow: number
    events: number
    edges: number
    online: boolean
  } | null>(null)
  const [blockedSegments, setBlockedSegments] = useState<Array<{ id: string; label: string }>>([])
  const [activeEvents, setActiveEvents] = useState<Array<{ id: string; label: string; count: number }>>([])

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      const online = await simulationService.checkHealth()
      if (!mounted) return

      if (online) {
        await simulationService.initEngine(city)
      } else {
        const store = useSimulationStore.getState()
        store.setBackendOnline(false)
        store.setGraphLoaded(false)
        store.setEngineStatus('idle')
        store.setLastError(null)
      }
    }

    void bootstrap()

    return () => {
      mounted = false
    }
  }, [city.id, city.name])

  useEffect(() => {
    let active = true

    const refresh = async () => {
      try {
        const [health, blocked, slow, events, graph] = await Promise.all([
          predictiveApi.health(),
          predictiveApi.getEdges('blocked'),
          predictiveApi.getEdges('slow'),
          predictiveApi.getEvents(),
          predictiveApi.getAnalytics().catch(() => null),
        ])

        if (!active) return

        setBlockedSegments(
          blocked.features.slice(0, 5).map((feature, index) => {
            const props = (feature.properties ?? {}) as Record<string, unknown>
            const rawId = String(props.edge_id ?? props.id ?? props.name ?? `segment-${index + 1}`)
            return {
              id: rawId,
              label: formatShortLabel(rawId, props.name),
            }
          }),
        )
        setActiveEvents(
          events.features.slice(0, 5).map((feature, index) => {
            const props = (feature.properties ?? {}) as Record<string, unknown>
            const rawId = String(props.id ?? props.label ?? props.name ?? `event-${index + 1}`)
            const affected = Array.isArray(props.affected_edges) ? props.affected_edges.length : 0
            return {
              id: rawId,
              label: String(props.label ?? props.name ?? rawId),
              count: affected,
            }
          }),
        )
        setAnalytics({
          online: Boolean(health.online),
          blocked: blocked.features.length,
          slow: slow.features.length,
          events: events.features.length,
          edges: graph?.total_roads ?? 0,
        })
      } catch {
        if (active) {
          setAnalytics(null)
          setBlockedSegments([])
          setActiveEvents([])
        }
      }
    }

    void refresh()

    return () => {
      active = false
    }
  }, [city.id, revision, status])

  const selectedSegmentLabel = useMemo(() => {
    if (!selectedSegmentId) return null
    return selectedSegmentId.length > 28
      ? `…${selectedSegmentId.slice(-12)}`
      : selectedSegmentId
  }, [selectedSegmentId])

  const handleBlockRoad = async () => {
    if (!selectedSegmentId) {
      toast.warning('Sélectionnez un segment sur la carte.')
      return
    }

    setIsBusy(true)
    setLastError(null)

    try {
      await predictiveApi.blockRoad(selectedSegmentId)
      bumpRevision()
      setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
      toast.success('Route bloquée sur la carte')
    } catch (err: any) {
      setLastError(err?.message ?? 'Impossible de bloquer la route.')
      toast.error('Blocage impossible')
    } finally {
      setIsBusy(false)
    }
  }

  const handleAddTraffic = async () => {
    if (!selectedSegmentId) {
      toast.warning('Sélectionnez un segment sur la carte.')
      return
    }

    setIsBusy(true)
    setLastError(null)

    try {
      await predictiveApi.addTraffic(selectedSegmentId, trafficLevel as PredTrafficLevel)
      bumpRevision()
      setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
      toast.success('Trafic appliqué au segment')
    } catch (err: any) {
      setLastError(err?.message ?? 'Impossible d’appliquer le trafic.')
      toast.error('Trafic impossible')
    } finally {
      setIsBusy(false)
    }
  }

  const handleCreateEvent = async () => {
    const center = eventLocation ?? city.center

    setIsBusy(true)
    setLastError(null)

    try {
      await predictiveApi.addEvent(
        center,
        eventType,
        eventRadius,
        `Événement ${city.name}`,
      )
      setLocationPickerActive(false)
      setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
      bumpRevision()
      toast.success('Événement ajouté à la simulation')
    } catch (err: any) {
      setLastError(err?.message ?? 'Impossible de créer l’événement.')
      toast.error('Événement impossible')
    } finally {
      setIsBusy(false)
    }
  }

  const handleExportGeoJSON = async () => {
    try {
      const data = await simulationService.getAffectedEdges()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/geo+json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'crossflow_affected_edges.geojson'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('GeoJSON exporté')
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Export GeoJSON impossible')
    }
  }

  const handleReset = async () => {
    setIsBusy(true)
    try {
      await predictiveApi.resetSimulation()
      setEventLocation(null)
      setLocationPickerActive(false)
      setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
      setBlockedSegments([])
      setActiveEvents([])
      bumpRevision()
      toast.success('Simulation réinitialisée')
    } catch (err) {
      console.error('Reset error:', err)
      toast.error('Réinitialisation impossible')
    } finally {
      setIsBusy(false)
    }
  }

  const isReady = status === 'ready'
  const statusLabel =
    status === 'initializing'
      ? 'Initialisation du moteur…'
      : status === 'ready'
        ? 'Moteur prédictif prêt'
        : status === 'error'
          ? 'Erreur moteur'
          : 'Moteur en attente'

  const statusCopy =
    status === 'initializing'
      ? 'Chargement du graphe OSMnx.'
      : status === 'ready'
        ? 'Simulation temps réel activée.'
        : status === 'error'
          ? (lastError || 'Backend inaccessible')
          : 'Sélectionnez une ville pour démarrer.'

  return (
    <div className="space-y-4">
      <div className={cn(
        'px-4 py-3 rounded-2xl border flex items-center justify-between gap-4',
        status === 'ready'
          ? 'bg-brand/5 border-brand/20'
          : status === 'error'
            ? 'bg-[#FF1744]/5 border-[#FF1744]/20'
            : 'bg-bg-elevated border-bg-border',
      )}>
        <div className="flex items-center gap-3 min-w-0">
          {status === 'initializing' ? (
            <Loader2 className="w-4 h-4 animate-spin text-brand" />
          ) : status === 'ready' ? (
            <CheckCircle2 className="w-4 h-4 text-brand" />
          ) : status === 'error' ? (
            <AlertCircle className="w-4 h-4 text-[#FF1744]" />
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
            {analytics?.online ? 'Backend online' : 'Backend offline'}
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
            Activez un mode puis cliquez sur un segment de la carte. Le clic suivant applique l&apos;action.
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
                <span className="text-[10px] font-bold uppercase tracking-widest">Événement</span>
              </div>
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-bg-border bg-bg-elevated px-3 py-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-text-muted">Segment sélectionné</p>
              <p className="text-xs font-semibold text-text-primary truncate">
                {selectedSegmentLabel ?? 'Aucun segment sélectionné'}
              </p>
            </div>
            <button
              onClick={handleBlockRoad}
              disabled={isBusy || !isReady || !selectedSegmentId}
              className={cn(
                'shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all',
                isBusy || !isReady || !selectedSegmentId
                  ? 'bg-bg-elevated text-text-muted border border-bg-border cursor-not-allowed'
                  : 'bg-[#FF1744]/10 text-[#FF1744] border border-[#FF1744]/20 hover:bg-[#FF1744]/15',
              )}
            >
              <Ban className="w-3.5 h-3.5" />
              Bloquer
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Bloquées" value={analytics?.blocked ?? 0} accent="text-[#FF1744]" />
            <MiniStat label="Ralenties" value={analytics?.slow ?? 0} accent="text-[#FF6D00]" />
            <MiniStat label="Événements" value={analytics?.events ?? 0} accent="text-brand" />
          </div>

          {blockedSegments.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                Routes bloquées
              </p>
              <div className="space-y-2">
                {blockedSegments.map(segment => (
                  <div key={segment.id} className="flex items-center justify-between gap-3 rounded-xl border border-bg-border bg-bg-elevated px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">{segment.label}</p>
                      <p className="text-[10px] text-text-muted uppercase tracking-widest">Impact direct sur le maillage</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#FF1744] uppercase tracking-widest">Critique</span>
                  </div>
                ))}
              </div>
              {analytics && analytics.blocked > blockedSegments.length && (
                <p className="text-[10px] text-text-muted">
                  +{analytics.blocked - blockedSegments.length} autres segments
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
              disabled={isBusy || !isReady || !selectedSegmentId}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border',
                isBusy || !isReady || !selectedSegmentId
                  ? 'bg-bg-elevated text-text-muted border-bg-border cursor-not-allowed'
                  : 'bg-[#FF6D00]/10 text-[#FF6D00] border-[#FF6D00]/20 hover:bg-[#FF6D00]/15',
            )}
          >
            <TrafficCone className="w-4 h-4" />
            Appliquer le trafic sur un segment
          </button>

          <div className="space-y-2 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              Intensité du trafic
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
            Créer un événement
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
              <label className="text-xs text-text-secondary">Rayon d’impact</label>
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
                <p className="text-[10px] uppercase tracking-widest text-text-muted">Point d’impact</p>
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
                  Réinitialiser
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
              {locationPickerActive ? 'Cliquez sur la carte…' : 'Placer sur la carte'}
            </button>

            <button
              onClick={handleCreateEvent}
              disabled={isBusy || !isReady}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border',
                isBusy || !isReady
                  ? 'bg-bg-elevated text-text-muted border-bg-border cursor-not-allowed'
                  : 'bg-[#2979FF]/10 text-[#2979FF] border-[#2979FF]/20 hover:bg-[#2979FF]/15',
              )}
            >
              <Zap className="w-4 h-4" />
              Placer l’événement sur la carte
            </button>
          </div>

          {activeEvents.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                Événements actifs
              </p>
              <div className="space-y-2">
                {activeEvents.map(evt => (
                  <div key={evt.id} className="flex items-center justify-between gap-3 rounded-xl border border-bg-border bg-bg-elevated px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">{evt.label}</p>
                      <p className="text-[10px] text-text-muted uppercase tracking-widest">
                        {evt.count > 0 ? `${evt.count} routes impactées` : 'Impact local'}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-[#2979FF] uppercase tracking-widest">Actif</span>
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
            Mise à jour auto
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
            Réinitialiser
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {analytics?.online ? (
            <Pill icon={<Cpu className="w-3 h-3" />} tone="brand">
              Moteur prédictif actif
            </Pill>
          ) : (
            <Pill icon={<Search className="w-3 h-3" />} tone="muted">
              Chargement du graphe
            </Pill>
          )}
          {isBusy && (
            <Pill icon={<Loader2 className="w-3 h-3 animate-spin" />} tone="muted">
              Exécution…
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

function formatShortLabel(id: string, explicitName?: unknown) {
  if (typeof explicitName === 'string' && explicitName.trim()) return explicitName
  if (!id) return 'Segment'
  const compact = id.length > 28 ? `…${id.slice(-12)}` : id
  return compact.replace(/[_-]+/g, ' ')
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
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border uppercase tracking-widest',
      tone === 'brand'
        ? 'bg-brand/10 border-brand/20 text-brand'
        : 'bg-white/5 border-white/5 text-text-muted',
    )}>
      {icon}
      {children}
    </span>
  )
}
