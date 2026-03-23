'use client'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, MapPin } from 'lucide-react'
import { CITIES } from '@/config/cities.config'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'
import type { City } from '@/types'

export function CitySelector() {
  const city    = useMapStore(s => s.city)
  const setCity = useMapStore(s => s.setCity)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = query
    ? CITIES.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.country.toLowerCase().includes(query.toLowerCase())
      )
    : CITIES

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (c: City) => {
    setCity(c)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-elevated border border-bg-border hover:border-text-muted transition-colors text-sm"
      >
        <MapPin className="w-3.5 h-3.5 text-brand-green" />
        <span className="text-text-primary font-medium">
          {city.flag} {city.name}
        </span>
        <span className="text-text-muted text-xs">{city.country}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 w-72 bg-bg-elevated border border-bg-border rounded-xl shadow-panel z-50 animate-fade-in overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-bg-border">
            <div className="flex items-center gap-2 bg-bg-subtle rounded-lg px-3 py-2">
              <Search className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher une ville..."
                className="bg-transparent text-sm text-text-primary placeholder-text-muted outline-none w-full"
              />
            </div>
          </div>

          {/* Cities list */}
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-4 py-6 text-sm text-text-muted text-center">Aucune ville trouvée</p>
            )}
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => select(c)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-bg-surface transition-colors',
                  c.id === city.id && 'bg-brand-green-dim',
                )}
              >
                <span className="text-lg leading-none">{c.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium truncate',
                    c.id === city.id ? 'text-brand-green' : 'text-text-primary',
                  )}>
                    {c.name}
                  </p>
                  <p className="text-xs text-text-muted">{c.country} • {(c.population / 1000).toFixed(0)}k hab.</p>
                </div>
                {c.id === city.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
