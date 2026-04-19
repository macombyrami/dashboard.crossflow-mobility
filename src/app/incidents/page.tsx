'use client'
import { useEffect, useState, useMemo } from 'react'
import { AlertTriangle, RefreshCw, MapPin, Clock, Zap, Download, TrendingUp, TrendingDown, Minus, Route } from 'lucide-react'
import { SeverityPill } from '@/components/ui/SeverityPill'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { generateIncidents, generateCityKPIs } from '@/lib/engine/traffic.engine'
import {
  fetchSytadinKPIs,
  generateSytadinKPIs,
  generateSytadinTravelTimes,
  fetchAndInjectSytadinIncidents,
  injectSytadinIncidents,
  isIdfCity,
} from '@/lib/engine/sytadin.engine'
import { exportToCsv } from '@/lib/utils/export'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import type { IncidentSeverity, IncidentType } from '@/types'

const SEVERITY_ORDER: Record<IncidentSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 }
const TYPE_LABELS: Record<IncidentType, string> = {
  accident: 'Accident',
  roadwork: 'Travaux',
  congestion: 'Congestion',
  anomaly: 'Anomalie IA',
  event: 'Événement',
}

export default function IncidentsPage() {
  const city = useMapStore(s => s.city)
  const incidents = useTrafficStore(s => s.incidents)
  const dataSource = useTrafficStore(s => s.dataSource)
  const setIncidents = useTrafficStore(s => s.setIncidents)
  const setKPIs = useTrafficStore(s => s.setKPIs)
  
  const [filter, setFilter] = useState<IncidentSeverity | 'all'>('all')
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [csvExported, setCsvExported] = useState(false)

  const [idfData, setIdfData] = useState<any>(null)
  const [travelTimes, setTravelTimes] = useState<any[]>([])

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { document.title = `Alertes — ${city.name} | CrossFlow` }, [city.name])

  const refresh = async () => {
    if (isIdfCity(city)) {
      const [kpi] = await Promise.all([
        fetchSytadinKPIs().catch(() => generateSytadinKPIs(city)),
      ])
      setIdfData(kpi)
      setTravelTimes(generateSytadinTravelTimes())

      const base = dataSource === 'live' ? incidents : generateIncidents(city)
      const merged = await fetchAndInjectSytadinIncidents(city, base)
        .catch(() => injectSytadinIncidents(city, base))
      setIncidents(merged)
    } else {
      setIdfData(null)
      setTravelTimes([])
      if (dataSource !== 'live') {
        setIncidents(generateIncidents(city))
      }
    }

    if (dataSource !== 'live') {
      setKPIs(generateCityKPIs(city))
    }
    setLastRefresh(new Date())
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 180_000)
    return () => clearInterval(interval)
  }, [city.id, dataSource]) // eslint-disable-line

  const normSeverity = (s: string): IncidentSeverity =>
    (s.toLowerCase() as IncidentSeverity)

  const filtered = useMemo(() => {
    return [...incidents]
      .filter(i => filter === 'all' || normSeverity(i.severity) === filter)
      .sort((a, b) => {
        if (a.source === 'Lecture directe' && b.source !== 'Lecture directe') return -1
        if (a.source !== 'Lecture directe' && b.source === 'Lecture directe') return 1
        return (SEVERITY_ORDER[normSeverity(a.severity)] ?? 3) - (SEVERITY_ORDER[normSeverity(b.severity)] ?? 3)
      })
  }, [incidents, filter])

  const counts = {
    all: incidents.length,
    critical: incidents.filter(i => normSeverity(i.severity) === 'critical').length,
    high: incidents.filter(i => normSeverity(i.severity) === 'high').length,
    medium: incidents.filter(i => normSeverity(i.severity) === 'medium').length,
    low: incidents.filter(i => normSeverity(i.severity) === 'low').length,
  }

  const FILTERS: { id: IncidentSeverity | 'all'; label: string }[] = [
    { id: 'all',      label: `Tous (${counts.all})` },
    { id: 'critical', label: `Critique (${counts.critical})` },
    { id: 'high',     label: `Élevé (${counts.high})` },
    { id: 'medium',   label: `Moyen (${counts.medium})` },
    { id: 'low',      label: `Faible (${counts.low})` },
  ]

  return (
    <main className="min-h-full p-4 sm:p-6 space-y-6 max-w-5xl mx-auto custom-scrollbar pb-safe">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-brand" />
            Alertes & points d’attention
            <span className="text-text-muted font-medium ml-1">— {city.flag} {city.name}</span>
          </h1>
          <p className="text-sm text-text-muted mt-1 font-medium">
            Dernière mise à jour {mounted ? formatDistanceToNow(lastRefresh, { locale: fr, addSuffix: true }) : '...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              exportToCsv(
                `incidents-${city.id}-${new Date().toISOString().slice(0, 10)}`,
                ['ID', 'Type', 'Sévérité', 'Titre', 'Adresse', 'Source', 'Début'],
                incidents.map(i => [i.id, i.type, i.severity, i.title, i.address, i.source, i.startedAt]),
              )
              setCsvExported(true)
              setTimeout(() => setCsvExported(false), 3000)
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-brand/40 transition-all text-sm font-semibold text-text-secondary hover:text-white group"
          >
            <Download className={cn('w-4 h-4 transition-transform', csvExported ? 'text-brand' : 'group-hover:-translate-y-0.5')} />
            {csvExported ? `${incidents.length} lignes exportées ✓` : 'Exporter CSV'}
          </button>
          <button
            onClick={refresh}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand/10 border border-brand/20 hover:border-brand/50 transition-all text-sm font-bold text-brand group"
          >
            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            Rafraîchir
          </button>
        </div>
      </div>

      {isIdfCity(city) && idfData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="lg:col-span-1 glass-card p-6 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap className="w-16 h-16 text-brand" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-[11px] font-bold text-brand uppercase tracking-[0.2em]">Lecture IDF</span>
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                {idfData.source === 'live' ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand/10 border border-brand/30 text-brand uppercase tracking-wider">
                    Lecture active
                  </span>
                ) : (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-text-muted uppercase tracking-wider">
                    Estimé
                  </span>
                )}
                {idfData.degraded && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 uppercase tracking-wider">
                    Mode dégradé
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white tabular-nums">{idfData.totalCongestionKm}</span>
                <span className="text-lg font-bold text-text-muted">km</span>
              </div>
              <p className="text-sm font-semibold text-text-secondary mt-1">Pression cumulée actuelle</p>
            </div>
            <div className={cn(
              "flex items-center gap-2 mt-6 font-bold text-[13px]",
              idfData.trend === 'increasing' ? "text-red-500" : idfData.trend === 'decreasing' ? "text-brand" : "text-text-muted"
            )}>
              {idfData.trend === 'increasing' ? <TrendingUp className="w-4 h-4" /> : idfData.trend === 'decreasing' ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              {idfData.trend === 'increasing' ? "En hausse" : idfData.trend === 'decreasing' ? "En baisse" : "Stabilisé"}
            </div>
          </div>

          <div className="lg:col-span-2 glass-card overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Route className="w-4 h-4 text-text-muted" />
                <span className="text-[12px] font-bold text-text-secondary uppercase tracking-widest">Temps de parcours — Axes majeurs</span>
              </div>
            </div>
            <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Axe</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Parcours</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider text-right">Temps</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider text-right">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {travelTimes.map((tt, i) => (
                    <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="px-6 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-bold text-white group-hover:border-brand/40 transition-colors">
                          {tt.axis}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-[12px] text-text-secondary truncate max-w-[200px]">
                          {tt.from} <span className="text-text-muted mx-1">→</span> {tt.to}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className={cn(
                            "text-[13px] font-bold tabular-nums",
                            tt.timeMin > tt.normalTimeMin * 1.5 ? "text-red-500" : "text-white"
                          )}>{tt.timeMin} min</span>
                          <span className="text-[10px] text-text-muted font-medium">Réf.: {tt.normalTimeMin} min</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                         <span className={cn(
                           "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                           tt.status === 'saturated' ? "text-red-500 border-red-500/20 bg-red-500/10" :
                           tt.status === 'dense' ? "text-orange-500 border-orange-500/20 bg-orange-500/10" :
                           "text-brand border-brand/20 bg-brand/10"
                         )}>
                           {tt.status === 'saturated' ? "Saturé" : tt.status === 'dense' ? "Dense" : "Fluide"}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap animate-slide-up" style={{ animationDelay: '0.2s' }}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'px-4 py-2 rounded-xl text-[12px] font-bold transition-all border shadow-sm',
              filter === f.id
                ? 'bg-brand text-black border-brand scale-105'
                : 'bg-white/5 text-text-secondary border-white/10 hover:border-white/20 hover:text-white',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
        {filtered.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-brand/10 flex items-center justify-center mx-auto mb-4 border border-brand/20">
              <Zap className="w-8 h-8 text-brand" />
            </div>
            <h3 className="text-white font-bold mb-1">Lecture fluide</h3>
            <p className="text-text-muted text-sm">Aucun point d’attention critique détecté pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
            {filtered.map(inc => (
              <div
                key={inc.id}
                className={cn(
                  'glass-card p-5 group transition-all duration-300 relative overflow-hidden',
                  inc.severity === 'critical' ? 'border-red-500/20' :
                  inc.severity === 'high' ? 'border-orange-500/20' :
                                            'border-white/5',
                )}
              >
                {inc.source === 'Lecture directe' && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-brand text-black text-[9px] font-bold uppercase tracking-widest rounded-bl-xl shadow-lg z-20">
                    Lecture directe
                  </div>
                )}

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1 flex-shrink-0">
                      <div
                        className="w-10 h-10 rounded-[14px] flex items-center justify-center text-lg shadow-sm border"
                        style={{ backgroundColor: `${inc.iconColor}14`, borderColor: `${inc.iconColor}25` }}
                      >
                         <AlertTriangle className="w-5 h-5" style={{ color: inc.iconColor }} />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-bold text-white group-hover:text-brand transition-colors truncate">{inc.title}</h3>
                        <SeverityPill severity={inc.severity} size="sm" />
                      </div>
                      <p className="text-[13px] font-medium text-text-secondary line-clamp-2 lg:line-clamp-1">{inc.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:pl-4 lg:border-l lg:border-white/5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted">
                      <MapPin className="w-3.5 h-3.5" />
                      {inc.address}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted">
                      <Clock className="w-3.5 h-3.5" />
                      {mounted ? formatDistanceToNow(new Date(inc.startedAt), { locale: fr, addSuffix: true }) : '...'}
                    </div>
                    <div className="ml-auto lg:ml-0 flex items-center gap-2">
                       <span className="text-[10px] font-bold text-text-muted px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 uppercase tracking-widest">
                         {inc.source === 'Lecture directe' ? 'Lecture directe' : inc.source}
                       </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
