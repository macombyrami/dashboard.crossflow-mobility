'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useTrafficStore } from '@/store/trafficStore'

const MODE_CONFIG = {
  car:        { label: 'Voiture',      color: '#FF6D00' },
  metro:      { label: 'Métro',        color: '#2979FF' },
  bus:        { label: 'Bus',          color: '#00E5FF' },
  bike:       { label: 'Vélo',         color: '#00E676' },
  pedestrian: { label: 'Piéton',       color: '#AA00FF' },
} as const

export function ModalSplitChart() {
  const kpis = useTrafficStore(s => s.kpis)
  if (!kpis) return null

  const data = Object.entries(kpis.modalSplit).map(([key, value]) => ({
    name:  MODE_CONFIG[key as keyof typeof MODE_CONFIG]?.label ?? key,
    value: Math.round(value * 100),
    color: MODE_CONFIG[key as keyof typeof MODE_CONFIG]?.color ?? '#8080A0',
  }))

  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 space-y-4">
      <p className="text-sm font-semibold text-text-primary">Répartition modale</p>

      <div className="flex items-center gap-4">
        <ResponsiveContainer width={120} height={120}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={55}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#161625',
                border: '1px solid #1E1E30',
                borderRadius: '8px',
                fontSize: 12,
                color: '#F0F0FF',
              }}
              formatter={(v) => [`${v}%`, '']}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex-1 space-y-2">
          {data.map(d => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-text-secondary">{d.name}</span>
              </div>
              <span className="text-xs font-semibold text-text-primary">{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
