'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useTrafficStore } from '@/store/trafficStore'

const MODE_CONFIG = {
  car:        { label: 'Voiture',      color: '#FF9F0A' },
  metro:      { label: 'Métro',        color: '#0A84FF' },
  bus:        { label: 'Bus',          color: '#32ADE6' },
  bike:       { label: 'Vélo',         color: '#30D158' },
  pedestrian: { label: 'Piéton',       color: '#AF52DE' },
} as const

export function ModalSplitChart() {
  const kpis = useTrafficStore(s => s.kpis)
  if (!kpis) return null

  const data = Object.entries(kpis.modalSplit).map(([key, value]) => ({
    name:  MODE_CONFIG[key as keyof typeof MODE_CONFIG]?.label ?? key,
    value: Math.round(value * 100),
    color: MODE_CONFIG[key as keyof typeof MODE_CONFIG]?.color ?? '#86868B',
  }))

  return (
    <div className="card-premium p-6 space-y-6">
      <div className="flex items-center gap-2">
         <div className="w-1 h-4 bg-brand-green rounded-full shadow-glow" />
         <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em]">Répartition Modale</p>
      </div>

      <div className="flex items-center gap-8">
        <div className="relative group">
          <ResponsiveContainer width={130} height={130}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} className="hover:opacity-80 transition-opacity" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(21, 21, 24, 0.8)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  fontSize: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
                formatter={(v) => [`${v}%`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="text-center">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none mb-1">Total</p>
                <p className="text-lg font-bold text-white leading-none">100%</p>
             </div>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {data.map(d => (
            <div key={d.name} className="flex items-center justify-between group/row">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0 shadow-glow transition-transform group-hover/row:scale-125" style={{ backgroundColor: d.color }} />
                <span className="text-[12px] font-medium text-text-secondary group-hover/row:text-white transition-colors">{d.name}</span>
              </div>
              <span className="text-[13px] font-bold text-white tabular-nums">{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
