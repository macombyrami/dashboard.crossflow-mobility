'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import { AlertTriangle, Layers3, MapPinned, Navigation2, Radar } from 'lucide-react'

import { CITIES } from '@/config/cities.config'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { cn } from '@/lib/utils/cn'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => m.CrossFlowMap),
  { ssr: false },
)

export default function MapPage() {
  const setCity = useMapStore(s => s.setCity)
  const setLockedCity = useMapStore(s => s.setLockedCity)
  const trafficMode = useMapStore(s => s.mode)
  const incidents = useTrafficStore(s => s.incidents)
  const dataSource = useTrafficStore(s => s.dataSource)
  const snapshot = useTrafficStore(s => s.snapshot)
  const liveWeather = useTrafficStore(s => s.openMeteoWeather)

  const paris = CITIES.find(c => c.id === 'paris') ?? CITIES[0]

  useEffect(() => {
    document.title = 'Paris Live Traffic | CrossFlow'
    setCity(paris)
    setLockedCity('paris')

    return () => {
      setLockedCity(null)
    }
  }, [paris, setCity, setLockedCity])

  const avgCongestion = snapshot
    ? Math.round((snapshot.segments.reduce((sum, s) => sum + s.congestionScore, 0) / Math.max(snapshot.segments.length, 1)) * 100)
    : 0

  const criticalCount = incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length

  return (
    <main id="main-content" aria-label="Carte Paris en temps reel" className="fixed inset-0 overflow-hidden bg-[#030303]">
      <div className="absolute inset-0">
        <CrossFlowMap />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3 sm:p-4">
        <div className="mx-auto flex max-w-[1600px] items-start justify-between gap-3">
          <div className="pointer-events-auto w-full max-w-[420px] rounded-3xl border border-white/10 bg-[#0B0C10]/88 backdrop-blur-2xl shadow-2xl p-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-white/45 font-bold">
                  <MapPinned className="h-3.5 w-3.5 text-brand-green" />
                  Paris uniquement
                </div>
                <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight leading-tight">
                  Carte trafic temps reel
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-white/60 leading-relaxed">
                  TomTom live, incidents, travaux, météo et couche réseau sont chargés pour Paris uniquement.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                <div className="text-[10px] uppercase tracking-[0.18em] text-brand-green font-black">TomTom</div>
                <div className={cn(
                  'mt-0.5 text-[10px] font-bold',
                  dataSource === 'live' ? 'text-brand-green' : 'text-traffic-warning',
                )}>
                  {dataSource === 'live' ? 'Flux live' : 'Fallback synthétique'}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Metric label="Segments" value={snapshot?.segments.length ?? 0} icon={Layers3} />
              <Metric label="Congestion" value={snapshot ? `${avgCongestion}%` : '—'} icon={Radar} />
              <Metric label="Alertes" value={incidents.length} icon={AlertTriangle} />
              <Metric label="Mode" value={trafficMode === 'live' ? 'Live' : trafficMode} icon={Navigation2} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                {criticalCount} incidents majeurs
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                {liveWeather ? `${liveWeather.weatherEmoji} ${Math.round(liveWeather.temp)}°C` : 'Météo non chargée'}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                {paris.bbox[0].toFixed(3)} / {paris.bbox[1].toFixed(3)} / {paris.bbox[2].toFixed(3)} / {paris.bbox[3].toFixed(3)}
              </span>
            </div>
          </div>

          <div className="hidden xl:block pointer-events-auto max-w-[280px] rounded-3xl border border-white/10 bg-[#0B0C10]/82 backdrop-blur-2xl shadow-2xl p-4 text-white">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/45 font-bold">Lecture carte</p>
            <ul className="mt-3 space-y-2 text-sm text-white/75 leading-relaxed">
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
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] uppercase tracking-[0.18em] text-white/40 font-bold">{label}</p>
        <Icon className="h-3.5 w-3.5 text-brand-green" />
      </div>
      <p className="mt-1 text-base font-black tracking-tight">{value}</p>
    </div>
  )
}
