'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, MapPin, Loader2, Clock, X } from 'lucide-react'
import { useMapStore, geocodingToCity } from '@/store/mapStore'
import { searchPlace } from '@/lib/api/geocoding'
import { cn } from '@/lib/utils/cn'
import type { GeocodingResult } from '@/lib/api/geocoding'
import type { City } from '@/types'

export function CitySearch() {
  const city        = useMapStore(s => s.city)
  const setCity     = useMapStore(s => s.setCity)
  const cityHistory = useMapStore(s => s.cityHistory)

  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const ref     = useRef<HTMLDivElement>(null)
  const inputRef= useRef<HTMLInputElement>(null)
  const timerRef= useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
        setResults([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const res = await searchPlace(q)
      setResults(res)
    } catch {
      setError('Erreur de recherche')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    clearTimeout(timerRef.current)
    if (q.length >= 2) {
      setLoading(true)
      timerRef.current = setTimeout(() => doSearch(q), 350)
    } else {
      setResults([])
      setLoading(false)
    }
  }

  const select = (c: City) => {
    setCity(c)
    setOpen(false)
    setQuery('')
    setResults([])
  }

  const selectFromGeocode = (r: GeocodingResult) => select(geocodingToCity(r))

  const showHistory = query.length < 2
  const items = showHistory ? cityHistory : []

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50) }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-elevated border border-bg-border hover:border-text-muted transition-colors text-sm"
      >
        <MapPin className="w-3.5 h-3.5 text-brand-green flex-shrink-0" />
        <span className="text-text-primary font-medium max-w-[140px] truncate">
          {city.flag} {city.name}
        </span>
        <span className="text-text-muted text-xs hidden sm:inline">{city.country}</span>
        <Search className="w-3 h-3 text-text-muted ml-1" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-2 left-0 w-80 bg-bg-elevated border border-bg-border rounded-xl shadow-panel z-50 animate-fade-in overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-bg-border">
            <div className="flex items-center gap-2 bg-bg-subtle rounded-lg px-3 py-2.5 border border-bg-border focus-within:border-brand-green/40 transition-colors">
              {loading
                ? <Loader2 className="w-3.5 h-3.5 text-brand-green animate-spin flex-shrink-0" />
                : <Search className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
              }
              <input
                ref={inputRef}
                value={query}
                onChange={handleInput}
                placeholder="Rechercher une ville, un quartier..."
                className="bg-transparent text-sm text-text-primary placeholder-text-muted outline-none w-full"
              />
              {query && (
                <button onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }}>
                  <X className="w-3.5 h-3.5 text-text-muted hover:text-text-secondary" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-text-muted mt-2 pl-1">
              Propulsé par OpenStreetMap · Toute ville du monde
            </p>
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto">
            {error && (
              <p className="px-4 py-3 text-xs text-[#FF1744]">{error}</p>
            )}

            {showHistory && items.length > 0 && (
              <>
                <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-text-muted" />
                  <span className="text-[10px] text-text-muted uppercase tracking-widest">Récents</span>
                </div>
                {items.map(c => (
                  <CityRow key={c.id} city={c} selected={c.id === city.id} onClick={() => select(c)} />
                ))}
              </>
            )}

            {!showHistory && results.length === 0 && !loading && query.length >= 2 && (
              <p className="px-4 py-6 text-sm text-text-muted text-center">
                Aucun résultat pour « {query} »
              </p>
            )}

            {results.map(r => (
              <ResultRow key={r.id} result={r} onClick={() => selectFromGeocode(r)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CityRow({ city, selected, onClick }: { city: City; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-bg-surface transition-colors',
        selected && 'bg-brand-green-dim',
      )}
    >
      <span className="text-base leading-none">{city.flag}</span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', selected ? 'text-brand-green' : 'text-text-primary')}>
          {city.name}
        </p>
        <p className="text-xs text-text-muted">{city.country}</p>
      </div>
      {selected && <span className="w-1.5 h-1.5 rounded-full bg-brand-green flex-shrink-0" />}
    </button>
  )
}

function ResultRow({ result, onClick }: { result: GeocodingResult; onClick: () => void }) {
  const flagMap: Record<string, string> = {
    FR: '🇫🇷', GB: '🇬🇧', DE: '🇩🇪', ES: '🇪🇸', IT: '🇮🇹',
    US: '🇺🇸', JP: '🇯🇵', MA: '🇲🇦', NL: '🇳🇱', BE: '🇧🇪',
    CH: '🇨🇭', PT: '🇵🇹', DZ: '🇩🇿', TN: '🇹🇳', AE: '🇦🇪',
    SG: '🇸🇬', AU: '🇦🇺', CA: '🇨🇦', BR: '🇧🇷', IN: '🇮🇳',
  }
  const flag = flagMap[result.countryCode] ?? '🌍'
  const short = result.displayName.split(',').slice(0, 3).join(',')

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-bg-surface transition-colors"
    >
      <span className="text-base leading-none flex-shrink-0">{flag}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{result.name}</p>
        <p className="text-xs text-text-muted truncate">{short}</p>
      </div>
      <span className="text-[10px] text-text-muted bg-bg-subtle px-1.5 py-0.5 rounded flex-shrink-0 capitalize">
        {result.type}
      </span>
    </button>
  )
}
