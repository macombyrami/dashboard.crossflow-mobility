'use client'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { X, Car, Wind, Users } from 'lucide-react'

function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

export function ZoneStatsPanel() {
  const zonePolygon = useMapStore(s => s.zonePolygon)
  const clearZone   = useMapStore(s => s.clearZone)
  const snapshot    = useTrafficStore(s => s.snapshot)

  if (!zonePolygon || !snapshot) return null

  // Find segments with midpoint inside zone
  const inZone = snapshot.segments.filter(seg => {
    const mid = seg.coordinates[Math.floor(seg.coordinates.length / 2)]
    return pointInPolygon(mid, zonePolygon)
  })

  if (inZone.length === 0) return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 glass rounded-apple px-4 py-3 border border-yellow-400/20 text-sm text-text-muted">
      Aucun segment dans cette zone
    </div>
  )

  const avgCongestion = inZone.reduce((a, s) => a + s.congestionScore, 0) / inZone.length
  const avgSpeed      = inZone.reduce((a, s) => a + s.speedKmh, 0) / inZone.length
  const totalPassages = inZone.reduce((a, s) => a + s.flowVehiclesPerHour, 0)
  const avgCo2        = inZone.reduce((a, s) => a + (120 + s.congestionScore * 180), 0) / inZone.length

  const congPct = Math.round(avgCongestion * 100)
  const congColor = congPct < 30 ? '#22C55E' : congPct < 60 ? '#FFD600' : congPct < 80 ? '#FF9F0A' : '#FF3B30'

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 glass rounded-apple border border-yellow-400/20 shadow-apple overflow-hidden min-w-[320px]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-bg-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="text-[12px] font-bold text-yellow-400 uppercase tracking-wider">Zone analysée</span>
          <span className="text-[11px] text-text-muted">· {inZone.length} segments</span>
        </div>
        <button onClick={clearZone} className="text-text-muted hover:text-text-primary transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-px bg-bg-border p-px">
        <div className="bg-bg-elevated px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted mb-1 flex items-center gap-1">
            <Car className="w-3 h-3" /> Congestion
          </p>
          <p className="text-2xl font-bold" style={{ color: congColor }}>{congPct}<span className="text-sm ml-0.5">%</span></p>
          <p className="text-[10px] text-text-muted mt-0.5">{Math.round(avgSpeed)} km/h moy.</p>
        </div>

        <div className="bg-bg-elevated px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted mb-1 flex items-center gap-1">
            <Users className="w-3 h-3" /> Passages
          </p>
          <p className="text-2xl font-bold text-brand">{totalPassages.toLocaleString('fr-FR')}</p>
          <p className="text-[10px] text-text-muted mt-0.5">véh/h total zone</p>
        </div>

        <div className="bg-bg-elevated px-4 py-3 col-span-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted mb-1 flex items-center gap-1">
            <Wind className="w-3 h-3" /> Émissions CO₂ moyennes
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold text-orange-400">{Math.round(avgCo2)}<span className="text-sm ml-1">g/km</span></p>
            <div className="flex-1 bg-bg-border rounded-full h-1.5 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-red-500" style={{ width: `${Math.min(100, (avgCo2 / 300) * 100)}%` }} />
            </div>
          </div>
          <p className="text-[10px] text-text-muted mt-0.5">Référence: 120 g/km (fluide) → 300 g/km (embouteillage)</p>
        </div>
      </div>
    </div>
  )
}
