'use client'
import { useEffect, useState } from 'react'
import { Network, MapPin, Route, Layers } from 'lucide-react'

interface IdfStats {
  totalSegments: number
  totalKm: number
  frcDistribution: Record<string, number>
  topCounties: Array<{ name: string; count: number }>
  majorHighways: string[]
  frcLabels: Record<string, string>
}

const FRC_COLORS: Record<string, string> = {
  '1': '#FF1744',  // highways — red
  '2': '#FF6D00',  // nationals — orange
  '3': '#FFB300',  // arterials — amber
  '4': '#00E676',  // collectors — green
  '5': '#2979FF',  // local — blue
}

export function IdfNetworkStats() {
  const [stats, setStats] = useState<IdfStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/idf-stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="rounded-xl border border-bg-border bg-bg-surface p-3 space-y-2 animate-pulse">
      <div className="h-3 w-32 bg-bg-elevated rounded" />
      <div className="h-2 w-48 bg-bg-elevated rounded" />
    </div>
  )

  if (!stats) return null

  const totalFrc = Object.values(stats.frcDistribution).reduce((s, v) => s + v, 0)

  return (
    <div className="rounded-2xl border border-bg-border bg-bg-surface overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-bg-border flex items-center gap-2">
        <Network className="w-3.5 h-3.5 text-brand" />
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">
          Réseau IDF — Données réelles
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Global stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-bg-elevated rounded-lg p-3 space-y-0.5">
            <div className="flex items-center gap-1.5 text-text-muted">
              <Route className="w-3 h-3" />
              <span className="text-[10px]">Segments</span>
            </div>
            <p className="text-sm font-bold text-text-primary">
              {stats.totalSegments.toLocaleString('fr-FR')}
            </p>
          </div>
          <div className="bg-bg-elevated rounded-lg p-3 space-y-0.5">
            <div className="flex items-center gap-1.5 text-text-muted">
              <Layers className="w-3 h-3" />
              <span className="text-[10px]">Couverture</span>
            </div>
            <p className="text-sm font-bold text-text-primary">
              {stats.totalKm.toLocaleString('fr-FR')} km
            </p>
          </div>
        </div>

        {/* FRC bar */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-text-muted font-medium uppercase tracking-widest">
            Classes fonctionnelles
          </p>
          <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
            {Object.entries(stats.frcDistribution)
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(([frc, count]) => (
                <div
                  key={frc}
                  style={{
                    width:      `${(count / totalFrc) * 100}%`,
                    background: FRC_COLORS[frc] ?? '#888',
                  }}
                  title={`FRC ${frc} — ${stats.frcLabels[frc]} (${count.toLocaleString('fr-FR')})`}
                />
              ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {Object.entries(stats.frcDistribution)
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(([frc, count]) => (
                <div key={frc} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: FRC_COLORS[frc] ?? '#888' }} />
                  <span className="text-[9px] text-text-muted">
                    FRC {frc} · {count.toLocaleString('fr-FR')}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Major highways */}
        {stats.majorHighways.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-widest">
              Autoroutes / Nationales
            </p>
            <div className="flex flex-wrap gap-1.5">
              {stats.majorHighways.slice(0, 12).map(road => (
                <span
                  key={road}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    color:      /^A/.test(road) ? '#FF1744' : '#FF6D00',
                    background: /^A/.test(road) ? 'rgba(255,23,68,0.1)' : 'rgba(255,109,0,0.1)',
                    border:     `1px solid ${/^A/.test(road) ? 'rgba(255,23,68,0.25)' : 'rgba(255,109,0,0.25)'}`,
                  }}
                >
                  {road}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Top counties */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-text-muted font-medium uppercase tracking-widest">
            Top communes
          </p>
          <div className="space-y-1">
            {stats.topCounties.slice(0, 5).map(c => {
              const pct = Math.round((c.count / stats.totalSegments) * 100)
              return (
                <div key={c.name} className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-text-muted shrink-0" />
                  <span className="text-[10px] text-text-secondary flex-1 truncate">{c.name}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 rounded-full bg-brand/30 overflow-hidden w-12">
                      <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[9px] text-text-muted w-6 text-right">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <p className="text-[9px] text-text-muted text-center">
          Source · TomTom XD IDF · {stats.totalSegments.toLocaleString('fr-FR')} segments
        </p>
      </div>
    </div>
  )
}
