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
        className="flex items-center gap-3 px-5 py-2.5 rounded-apple glass border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all duration-300 shadow-apple group"
      >
        <div className="w-8 h-8 rounded-apple bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          <MapPin className="w-4 h-4 text-brand-green" />
        </div>
        <div className="flex flex-col items-start translate-y-[-1px]">
          <span className="text-[14px] font-bold text-white tracking-tight leading-none group-hover:text-brand-green transition-colors">
            {city.flag} {city.name}
          </span>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] mt-1.5">{city.country}</span>
        </div>
        <Search className="w-3.5 h-3.5 text-text-muted ml-3 opacity-40 group-hover:opacity-100 transition-opacity" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-3 left-0 w-[calc(100vw-32px)] sm:w-[340px] glass rounded-apple shadow-apple z-50 animate-fade-in overflow-hidden border border-white/10">
          {/* Search input */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-3 bg-white/5 rounded-apple px-4 py-3 border border-white/5 focus-within:border-brand-green/30 transition-all duration-300 shadow-inner">
              {loading
                ? <Loader2 className="w-4 h-4 text-brand-green animate-spin flex-shrink-0" />
                : <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
              }
              <input
                ref={inputRef}
                value={query}
                onChange={handleInput}
                placeholder="Rechercher une destination..."
                className="bg-transparent text-[14px] text-white placeholder-white/30 outline-none w-full font-medium"
              />
              {query && (
                <button onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-4 h-4 text-text-muted hover:text-white" />
                </button>
              )}
            </div>
            <p className="text-[9px] font-bold text-text-muted mt-3 pl-1 uppercase tracking-[0.15em] opacity-50">
              Moteur Global · OpenStreetMap
            </p>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {error && (
              <p className="px-5 py-4 text-[12px] text-[#FF3B30] font-medium bg-[#FF3B30]/5">{error}</p>
            )}

            {showHistory && items.length > 0 && (
              <div className="animate-fade-in">
                <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Destinations Récentes</span>
                </div>
                {items.map(c => (
                  <CityRow key={c.id} city={c} selected={c.id === city.id} onClick={() => select(c)} />
                ))}
              </div>
            )}

            {!showHistory && results.length === 0 && !loading && query.length >= 2 && (
              <div className="px-5 py-8 text-center animate-fade-in">
                <p className="text-[14px] font-medium text-text-muted">Aucun résultat trouvé</p>
                <p className="text-[11px] text-text-muted/60 mt-1">Vérifiez l'orthographe ou essayez un pays</p>
              </div>
            )}

            <div className="divide-y divide-white/5">
              {results.map(r => (
                <ResultRow key={r.id} result={r} onClick={() => selectFromGeocode(r)} />
              ))}
            </div>
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
        'w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-white/5 transition-all duration-300 relative group',
        selected && 'bg-brand-green/10',
      )}
    >
      <div className="w-10 h-10 rounded-apple bg-white/5 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
        {city.flag}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-[14px] font-bold truncate transition-colors', selected ? 'text-brand-green' : 'text-white group-hover:text-brand-green')}>
          {city.name}
        </p>
        <p className="text-[11px] font-medium text-text-muted/60 mt-0.5 truncate uppercase tracking-wider">{city.country}</p>
      </div>
      {selected && (
        <div className="w-2 h-2 rounded-full bg-brand-green shadow-glow animate-pulse" />
      )}
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
      className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-white/5 transition-all duration-300 group"
    >
      <div className="w-10 h-10 rounded-apple bg-white/5 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
        {flag}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-white truncate group-hover:text-brand-green transition-colors">{result.name}</p>
        <p className="text-[11px] font-medium text-text-muted/60 mt-0.5 truncate uppercase tracking-wider">{short}</p>
      </div>
      <span className="text-[9px] font-bold text-brand-green bg-brand-green/10 px-2 py-1 rounded-apple flex-shrink-0 uppercase tracking-widest border border-brand-green/20 shadow-glow-sm">
        {result.type}
      </span>
    </button>
  )
}
