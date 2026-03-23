'use client'
import { platformConfig } from '@/config/platform.config'

const levels = [
  { label: 'Fluide',        key: 'free' },
  { label: 'Ralenti',       key: 'slow' },
  { label: 'Congestionné',  key: 'congested' },
  { label: 'Critique',      key: 'critical' },
] as const

export function MapLegend() {
  const colors = platformConfig.traffic.colors
  return (
    <div className="bg-bg-surface/90 border border-bg-border rounded-xl p-3 backdrop-blur-sm">
      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2">Congestion</p>
      <div className="space-y-1.5">
        {levels.map(({ label, key }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-8 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[key] }} />
            <span className="text-xs text-text-secondary">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
