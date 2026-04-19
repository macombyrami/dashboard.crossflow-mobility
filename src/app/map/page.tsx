'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import { AlertTriangle, Layers3, MapPinned, Navigation2, Radar } from 'lucide-react'

import { CITIES } from '@/config/cities.config'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import type { MapLayerId } from '@/types'
import { cn } from '@/lib/utils/cn'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => m.CrossFlowMap),
  { ssr: false },
)

export default function MapPage() {
  const setCity = useMapStore(s => s.setCity)
  const setLockedCity = useMapStore(s => s.setLockedCity)
  const setLayer = useMapStore(s => s.setLayer)
  const activeLayers = useMapStore(s => s.activeLayers)
  const toggleLayer = useMapStore(s => s.toggleLayer)
  const trafficMode = useMapStore(s => s.mode)
  const incidents = useTrafficStore(s => s.incidents)
  const dataSource = useTrafficStore(s => s.dataSource)
  const snapshot = useTrafficStore(s => s.snapshot)
  const trafficSummary = useTrafficStore(s => s.trafficSummary)
  const liveWeather = useTrafficStore(s => s.openMeteoWeather)

  const paris = CITIES.find(c => c.id === 'paris') ?? CITIES[0]

  useEffect(() => {
    document.title = 'Paris Live Traffic | CrossFlow'
    setCity(paris)
    setLockedCity('paris')
    if (!activeLayers.has('flow')) setLayer('flow', true)
    return () => setLockedCity(null)
  }, [paris, setCity, setLayer, setLockedCity])

  const segmentCount = trafficSummary?.segmentCount ?? snapshot?.segments.length ?? 0
  const avgCongestion = trafficSummary ? Math.round(trafficSummary.avgCongestion * 100) : 0
  const criticalCount = trafficSummary?.alertCount ?? incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length
  const layerPills: Array<{ id: MapLayerId, label: string, tone: string, hint: string }> = [
    { id: 'traffic', label: 'Traffic', tone: 'text-brand-green', hint: 'Zones + routes' },
    { id: 'incidents', label: 'Incidents', tone: 'text-traffic-warning', hint: 'Clusters + pins' },
    { id: 'flow', label: 'Flow', tone: 'text-white', hint: 'Arrows on major roads' },
  ]

  return (
    <main id="main-content" aria-label="Carte Paris en temps reel" className="fixed inset-0 isolate overflow-hidden bg-[#030303]">
      <div className="absolute inset-0">
        <CrossFlowMap />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-2 sm:p-3 lg:p-4">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-3">
          <div className="pointer-events-auto w-full max-w-[24rem] rounded-[1.5rem] border border-white/10 bg-[#0B0C10]/88 p-3.5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:max-w-[26rem] sm:p-4">
            <div className="flex items-start justify-between gap-2.5">
              <div>
                <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-white/45 font-black">
                  <MapPinned className="h-3.5 w-3.5 text-brand-green" />
                  Paris uniquement
                </div>
                <h1 className="mt-1 text-lg sm:text-xl lg:text-[1.7rem] font-black tracking-tight leading-tight">
                  Carte trafic temps reel
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-white/60 leading-relaxed">
                  TomTom live, incidents, travaux, météo et couche réseau sont chargés pour Paris uniquement.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-right">
                <div className="text-[10px] uppercase tracking-[0.18em] text-brand-green font-black">TomTom</div>
                <div className={cn(
                  'mt-0.5 text-[10px] font-bold',
                  dataSource === 'live' ? 'text-brand-green' : 'text-traffic-warning',
                )}>
                  {dataSource === 'live' ? 'Flux live' : 'Fallback synthétique'}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="État trafic" value={trafficSummary?.trafficLabel ?? 'Chargement'} icon={Radar} />
              <Metric label="Segments utiles" value={segmentCount} icon={Layers3} />
              <Metric label="Congestion" value={trafficSummary ? `${avgCongestion}%` : '—'} icon={AlertTriangle} />
              <Metric label="Prévision" value={trafficSummary?.predictionLabel ?? '—'} icon={Navigation2} />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {layerPills.map(layer => {
                const active = activeLayers.has(layer.id)
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => toggleLayer(layer.id)}
                    className={cn(
                      'rounded-2xl border px-3 py-2 text-left transition-all',
                      active
                        ? 'border-white/20 bg-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.28)]'
                        : 'border-white/10 bg-white/5 hover:bg-white/8'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] uppercase tracking-[0.18em] text-white/45 font-black">{layer.label}</span>
                      <span className={cn('text-[9px] font-black uppercase tracking-[0.16em]', active ? layer.tone : 'text-white/30')}>
                        {active ? 'On' : 'Off'}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-white/62">{layer.hint}</div>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/55">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                {criticalCount > 0 ? `${criticalCount} alertes` : 'Aucune alerte majeure'}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                {liveWeather ? `${liveWeather.weatherEmoji} ${Math.round(liveWeather.temp)}°C` : 'Météo non chargée'}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                Paris verrouillÃ©
              </span>
            </div>
          </div>

          <div className="hidden 2xl:block pointer-events-auto max-w-[18rem] rounded-[1.5rem] border border-white/10 bg-[#0B0C10]/82 p-3 text-white shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <p className="text-[9px] uppercase tracking-[0.22em] text-white/45 font-black">Lecture carte</p>
            <ul className="mt-2.5 space-y-1.5 text-[13px] text-white/75 leading-relaxed">
              <li>Rouge = incident critique ou fort ralentissement.</li>
              <li>Orange = congestion visible ou impact moyen.</li>
              <li>Vert = trafic fluide ou faible charge.</li>
              <li>Les routes affichées sont bornées au bassin parisien.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[8px] uppercase tracking-[0.16em] text-white/40 font-black">{label}</p>
        <Icon className="h-3 w-3 text-brand-green" />
      </div>
      <p className="mt-1 text-[15px] font-black tracking-tight leading-none">{value}</p>
    </div>
  )
}
