'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin, Search, X } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'

type SearchResult = {
  id: string
  label: string
  sublabel: string
  latitude: number
  longitude: number
  bbox: [number, number, number, number] | null
  kind: string
}

function parseBbox(value: any): [number, number, number, number] | null {
  if (!Array.isArray(value) || value.length < 4) return null
  const bbox: [number, number, number, number] = [
    Number(value[2]),
    Number(value[0]),
    Number(value[3]),
    Number(value[1]),
  ]
  return bbox.every(Number.isFinite) ? bbox : null
}

export function MapSearchControl() {
  const setSearchFocus = useMapStore(s => s.setSearchFocus)
  const city = useMapStore(s => s.city)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          q: `${query}, ${city.name}`,
          format: 'jsonv2',
          limit: '6',
          addressdetails: '1',
          namedetails: '1',
        })

        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          headers: { 'Accept-Language': 'fr,en' },
          signal: controller.signal,
        })

        if (!res.ok) {
          setResults([])
          return
        }

        const data = await res.json()
        const nextResults: SearchResult[] = (Array.isArray(data) ? data : []).map((item: any) => ({
          id: String(item.place_id ?? item.osm_id ?? `${item.lat},${item.lon}`),
          label: item.namedetails?.name ?? item.display_name?.split(',')[0] ?? 'Lieu',
          sublabel: item.display_name ?? '',
          latitude: Number(item.lat),
          longitude: Number(item.lon),
          bbox: parseBbox(item.boundingbox),
          kind: item.type ?? item.class ?? 'place',
        })).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))

        setResults(nextResults)
      } catch {
        if (!controller.signal.aborted) setResults([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 280)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [city.name, query])

  const handleSelect = (result: SearchResult) => {
    setSearchFocus({
      id: result.id,
      label: result.label,
      latitude: result.latitude,
      longitude: result.longitude,
      bbox: result.bbox,
      kind: result.kind,
    })
    setQuery(result.label)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-[420px]">
      <div
        className={cn(
          'flex items-center gap-3 rounded-2xl border shadow-lg backdrop-blur-xl transition-all',
          'bg-white/92 border-black/10 text-slate-900',
          open ? 'ring-2 ring-brand/20 shadow-xl' : 'hover:border-slate-300'
        )}
      >
        <Search className="ml-4 h-4 w-4 text-slate-400" />
        <input
          ref={inputRef}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          placeholder="Rechercher une adresse, une rue ou un lieu"
          className="h-12 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
        />
        {loading && <Loader2 className="mr-3 h-4 w-4 animate-spin text-brand" />}
        {!loading && query && (
          <button
            onClick={() => {
              setQuery('')
              setResults([])
              inputRef.current?.focus()
            }}
            className="mr-3 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-2xl border border-black/8 bg-white/96 shadow-2xl backdrop-blur-xl">
          {query.trim().length < 2 ? (
            <div className="px-4 py-3 text-xs text-slate-500">
              Saisissez au moins 2 caractères pour cibler une adresse ou un point d’intérêt.
            </div>
          ) : null}

          {query.trim().length >= 2 && !loading && results.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-500">
              Aucun résultat exploitable dans la zone recherchée.
            </div>
          ) : null}

          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className="flex w-full items-start gap-3 border-t border-slate-100 px-4 py-3 text-left transition-colors first:border-t-0 hover:bg-slate-50"
            >
              <span className="mt-0.5 rounded-xl bg-brand/10 p-2 text-brand">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">{result.label}</span>
                <span className="block truncate text-xs text-slate-500">{result.sublabel}</span>
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {result.kind}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
