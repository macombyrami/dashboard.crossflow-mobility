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
import { generateKPIHistory } from '@/lib/engine/traffic.engine'
import { useMemo } from 'react'

const METRICS = [
  { key: 'congestion',   label: 'Congestion (%)',  color: '#00E676', unit: '%' },
  { key: 'avgTravelMin', label: 'Trajet moyen',    color: '#2979FF', unit: 'min' },
] as const

export function TrafficChart() {
  const city = useMapStore(s => s.city)
  const data = useMemo(() => generateKPIHistory(city, 48), [city])

  // Show every 4th label
  const labeledData = data.map((d, i) => ({ ...d, label: i % 4 === 0 ? d.time : '' }))

  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">Trafic — 24 dernières heures</p>
          <p className="text-xs text-text-muted mt-0.5">{city.name} · {city.country}</p>
        </div>
        <div className="flex items-center gap-4">
          {METRICS.map(m => (
            <div key={m.key} className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded" style={{ backgroundColor: m.color }} />
              <span className="text-xs text-text-muted">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={labeledData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <defs>
            {METRICS.map(m => (
              <linearGradient key={m.key} id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={m.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={m.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#454560', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#454560', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#161625',
              border: '1px solid #1E1E30',
              borderRadius: '12px',
              fontSize: 12,
              color: '#F0F0FF',
            }}
            itemStyle={{ color: '#F0F0FF' }}
            labelStyle={{ color: '#8080A0' }}
          />
          {METRICS.map(m => (
            <Area
              key={m.key}
              type="monotone"
              dataKey={m.key}
              stroke={m.color}
              strokeWidth={2}
              fill={`url(#grad-${m.key})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
