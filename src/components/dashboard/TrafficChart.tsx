'use client'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { useMapStore } from '@/store/mapStore'
import { useKPIHistoryStore } from '@/store/kpiHistoryStore'
import { generateKPIHistory } from '@/lib/engine/traffic.engine'
import { useMemo } from 'react'

const METRICS = [
  { key: 'congestion',   label: 'Congestion',  color: '#22C55E', unit: '%' },
  { key: 'avgTravelMin', label: 'Trajet',     color: '#0A84FF', unit: 'min' },
] as const

export function TrafficChart() {
  const city        = useMapStore(s => s.city)
  const realHistory = useKPIHistoryStore(s => s.getForCity(city.id, 48))
  const synth       = useMemo(() => generateKPIHistory(city, 48), [city])

  // Use real history when we have at least 2 points, otherwise fall back to synthetic
  const data = realHistory.length >= 2 ? realHistory : synth

  // Show every 4th label
  const labeledData = data.map((d, i) => ({ ...d, label: i % 4 === 0 ? d.time : '' }))

  return (
    <div className="card-premium p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] mb-1">Activité Réseau</p>
          <p className="text-[15px] font-bold text-white tracking-tight">Trafic — 24h</p>
        </div>
        <div className="flex items-center gap-6">
          {METRICS.map(m => (
            <div key={m.key} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shadow-glow" style={{ backgroundColor: m.color }} />
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-[220px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={labeledData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
            <defs>
              {METRICS.map(m => (
                <linearGradient key={m.key} id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor={m.color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={m.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#86868B', fontSize: 10, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              tick={{ fill: '#86868B', fontSize: 10, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(21, 21, 24, 0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                fontSize: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
              itemStyle={{ fontWeight: 700, padding: '2px 0' }}
              labelStyle={{ color: '#86868B', marginBottom: '8px', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
            />
            {METRICS.map(m => (
              <Area
                key={m.key}
                type="monotone"
                dataKey={m.key}
                stroke={m.color}
                strokeWidth={3}
                fill={`url(#grad-${m.key})`}
                animationDuration={2000}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
