'use client'
import { Globe, Activity, AlertTriangle, Construction, Waves } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'
import type { QuickFilterId } from '@/types'

const FILTERS: {
  id: QuickFilterId
  label: string
  icon: typeof Globe
  tone: string
  accent: string
}[] = [
  { id: 'all', label: 'Tout', icon: Globe, tone: 'text-white', accent: 'from-white/20 to-white/5' },
  { id: 'congestion', label: 'Congestion', icon: Activity, tone: 'text-[#FFB800]', accent: 'from-[#FFB800]/30 to-[#FF6A00]/10' },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle, tone: 'text-[#FF5A5F]', accent: 'from-[#FF5A5F]/30 to-[#FF5A5F]/10' },
  { id: 'travaux', label: 'Travaux', icon: Construction, tone: 'text-[#FF8A00]', accent: 'from-[#FF8A00]/30 to-[#FF8A00]/10' },
  { id: 'flux', label: 'Flux', icon: Waves, tone: 'text-[#32D7FF]', accent: 'from-[#32D7FF]/30 to-[#32D7FF]/10' },
]

export function TrafficFilterBar() {
  const activeQuickFilters = useMapStore(s => s.activeQuickFilters)
  const resetQuickFilters = useMapStore(s => s.resetQuickFilters)
  const toggleQuickFilter = useMapStore(s => s.toggleQuickFilter)
  const setLayer      = useMapStore(s => s.setLayer)

  const handleFilter = (mode: QuickFilterId) => {
    if (mode === 'all') {
      resetQuickFilters()
      setLayer('traffic', true)
      setLayer('flow', true)
      setLayer('incidents', true)
      return
    }

    const next = new Set(activeQuickFilters)
    next.delete('all')
    next.has(mode) ? next.delete(mode) : next.add(mode)

    toggleQuickFilter(mode)

    const hasAny = next.size > 0
    const showTraffic = !hasAny || next.has('congestion') || next.has('flux')
    const showFlow = !hasAny || next.has('flux')
    const showIncidents = !hasAny || next.has('incidents') || next.has('travaux')

    setLayer('traffic', showTraffic)
    setLayer('flow', showFlow)
    setLayer('incidents', showIncidents)
  }

  return (
    <div className="glass-card flex items-center gap-1.5 p-1.5 rounded-2xl shadow-lg border border-white/10 bg-[linear-gradient(135deg,rgba(10,12,18,0.88),rgba(18,21,30,0.7))]">
      {FILTERS.map(({ id, label, icon: Icon, tone, accent }) => {
        const active = activeQuickFilters.has(id) || (id === 'all' && activeQuickFilters.has('all'))
        return (
          <button
            key={id}
            onClick={() => handleFilter(id)}
            className={cn(
              'relative overflow-hidden flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 border',
              active
                ? `bg-gradient-to-br ${accent} ${tone} border-white/15 shadow-[0_12px_30px_rgba(0,0,0,0.18)]`
                : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-white/[0.05] hover:border-white/10',
            )}
            aria-pressed={active}
          >
            <span className={cn(
              'absolute inset-0 opacity-0 transition-opacity',
              active ? 'opacity-100 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_65%)]' : '',
            )} />
            <Icon className={cn('relative z-[1] w-3.5 h-3.5 flex-shrink-0', active ? tone : 'text-text-muted')} strokeWidth={2} />
            <span className="hidden sm:inline">{label}</span>
            {active && <span className="relative z-[1] h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_10px_currentColor]" />}
          </button>
        )
      })}
    </div>
  )
}
