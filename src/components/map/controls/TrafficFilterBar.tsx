'use client'
import { Globe, Activity, AlertTriangle, Construction, Waves } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'

type FilterMode = 'all' | 'congestion' | 'incidents' | 'travaux' | 'flux'

const FILTERS: { id: FilterMode; label: string; icon: typeof Globe }[] = [
  { id: 'all',        label: 'Tout',       icon: Globe         },
  { id: 'congestion', label: 'Congestion', icon: Activity      },
  { id: 'incidents',  label: 'Incidents',  icon: AlertTriangle },
  { id: 'travaux',    label: 'Travaux',    icon: Construction  },
  { id: 'flux',       label: 'Flux',       icon: Waves         },
]

export function TrafficFilterBar() {
  const filterMode    = useMapStore(s => s.filterMode)
  const setFilterMode = useMapStore(s => s.setFilterMode)
  const setLayer      = useMapStore(s => s.setLayer)

  const handleFilter = (mode: FilterMode) => {
    setFilterMode(mode)
    // Adjust layer visibility based on filter
    switch (mode) {
      case 'all':
        setLayer('traffic',   true)
        setLayer('incidents', true)
        setLayer('heatmap',   false)
        break
      case 'congestion':
        setLayer('traffic',   true)
        setLayer('incidents', false)
        setLayer('heatmap',   true)
        break
      case 'incidents':
      case 'travaux':
        setLayer('traffic',   false)
        setLayer('incidents', true)
        setLayer('heatmap',   false)
        break
      case 'flux':
        setLayer('traffic',   true)
        setLayer('incidents', false)
        setLayer('heatmap',   true)
        break
    }
  }

  return (
    <div className="glass-card flex items-center gap-1 p-1 rounded-xl shadow-lg">
      {FILTERS.map(({ id, label, icon: Icon }) => {
        const active = filterMode === id
        return (
          <button
            key={id}
            onClick={() => handleFilter(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200',
              active
                ? 'bg-brand text-black shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-subtle',
            )}
          >
            <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', active ? 'text-black' : 'text-text-muted')} strokeWidth={2} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
