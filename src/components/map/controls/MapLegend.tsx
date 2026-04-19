'use client'
import { platformConfig } from '@/config/platform.config'

const levels = [
  { label: 'Fluidité',       key: 'free' },
  { label: 'Pression',       key: 'slow' },
  { label: 'Saturation',     key: 'congested' },
  { label: 'Critique',       key: 'critical' },
] as const

export function MapLegend() {
  const colors = platformConfig.traffic.colors
  return (
    <div className="bg-bg-surface/90 border border-bg-border rounded-xl p-3 backdrop-blur-sm space-y-4">
      <section>
        <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-2">Lecture trafic</p>
        <div className="space-y-1.5">
          {levels.map(({ label, key }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-8 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[key] }} />
              <span className="text-[10px] font-medium text-text-secondary">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="pt-3 border-t border-bg-border">
        <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-2">Hiérarchie visuelle</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-2 rounded-full bg-text-muted opacity-80" />
            <span className="text-[10px] text-text-secondary">Axes majeurs</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-1 rounded-full bg-text-muted opacity-60" />
            <span className="text-[10px] text-text-secondary">Axes secondaires</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-0.5 rounded-full bg-text-muted opacity-40" />
            <span className="text-[10px] text-text-secondary">Zones</span>
          </div>
        </div>
      </section>
    </div>
  )
}
