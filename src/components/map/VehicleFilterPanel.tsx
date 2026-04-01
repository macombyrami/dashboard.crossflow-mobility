'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'

const VEHICLE_TYPES = [
  { key: 'subway', label: 'Métro', icon: '🚇' },
  { key: 'tram',   label: 'Tram',  icon: '🚋' },
  { key: 'bus',    label: 'Bus',   icon: '🚌' },
  { key: 'train',  label: 'RER',   icon: '🚆' },
]

// Static line catalogue for autocomplete suggestions
const LINE_CATALOGUE = [
  // Métro
  { label: 'Métro 1',  slug: '1',   icon: '🚇', color: '#FFCD00' },
  { label: 'Métro 2',  slug: '2',   icon: '🚇', color: '#003CA6' },
  { label: 'Métro 3',  slug: '3',   icon: '🚇', color: '#837902' },
  { label: 'Métro 3b', slug: '3B',  icon: '🚇', color: '#6EC4E8' },
  { label: 'Métro 4',  slug: '4',   icon: '🚇', color: '#CF009E' },
  { label: 'Métro 5',  slug: '5',   icon: '🚇', color: '#FF7E2E' },
  { label: 'Métro 6',  slug: '6',   icon: '🚇', color: '#6ECA97' },
  { label: 'Métro 7',  slug: '7',   icon: '🚇', color: '#FA9ABA' },
  { label: 'Métro 7b', slug: '7B',  icon: '🚇', color: '#6ECA97' },
  { label: 'Métro 8',  slug: '8',   icon: '🚇', color: '#E19BDF' },
  { label: 'Métro 9',  slug: '9',   icon: '🚇', color: '#B6BD00' },
  { label: 'Métro 10', slug: '10',  icon: '🚇', color: '#C9910A' },
  { label: 'Métro 11', slug: '11',  icon: '🚇', color: '#704B1C' },
  { label: 'Métro 12', slug: '12',  icon: '🚇', color: '#007852' },
  { label: 'Métro 13', slug: '13',  icon: '🚇', color: '#6EC4E8' },
  { label: 'Métro 14', slug: '14',  icon: '🚇', color: '#62259D' },
  { label: 'Métro 15', slug: '15',  icon: '🚇', color: '#B90845' },
  { label: 'Métro 16', slug: '16',  icon: '🚇', color: '#F3A002' },
  { label: 'Métro 17', slug: '17',  icon: '🚇', color: '#D5C900' },
  { label: 'Métro 18', slug: '18',  icon: '🚇', color: '#00A88F' },
  // RER
  { label: 'RER A',    slug: 'A',   icon: '🚆', color: '#E2231A' },
  { label: 'RER B',    slug: 'B',   icon: '🚆', color: '#47A0D5' },
  { label: 'RER C',    slug: 'C',   icon: '🚆', color: '#FFCD00' },
  { label: 'RER D',    slug: 'D',   icon: '🚆', color: '#00814F' },
  { label: 'RER E',    slug: 'E',   icon: '🚆', color: '#C04191' },
  // Tram
  { label: 'Tram T1',  slug: 'T1',  icon: '🚋', color: '#E85D0E' },
  { label: 'Tram T2',  slug: 'T2',  icon: '🚋', color: '#2E67B1' },
  { label: 'Tram T3a', slug: 'T3A', icon: '🚋', color: '#65AE30' },
  { label: 'Tram T3b', slug: 'T3B', icon: '🚋', color: '#65AE30' },
  { label: 'Tram T4',  slug: 'T4',  icon: '🚋', color: '#E2231A' },
  { label: 'Tram T5',  slug: 'T5',  icon: '🚋', color: '#694394' },
  { label: 'Tram T6',  slug: 'T6',  icon: '🚋', color: '#FF7F00' },
  { label: 'Tram T7',  slug: 'T7',  icon: '🚋', color: '#AA57A7' },
  { label: 'Tram T8',  slug: 'T8',  icon: '🚋', color: '#E2231A' },
  { label: 'Tram T9',  slug: 'T9',  icon: '🚋', color: '#00A1E0' },
  { label: 'Tram T10', slug: 'T10', icon: '🚋', color: '#004B9B' },
  { label: 'Tram T11', slug: 'T11', icon: '🚋', color: '#00A99D' },
  { label: 'Tram T12', slug: 'T12', icon: '🚋', color: '#E85D0E' },
  { label: 'Tram T13', slug: 'T13', icon: '🚋', color: '#00A1E0' },
]

interface VehicleFilterPanelProps {
  vehicleCount: number
  className?: string
}

export function VehicleFilterPanel({ vehicleCount, className }: VehicleFilterPanelProps) {
  const activeLayers = useMapStore(s => s.activeLayers)
  const typeFilter   = useMapStore(s => s.vehicleTypeFilter)
  const toggleType   = useMapStore(s => s.toggleVehicleType)
  const searchQuery  = useMapStore(s => s.vehicleSearchQuery)
  const setSearch    = useMapStore(s => s.setVehicleSearch)

  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const dropRef   = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !dropRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().replace(/ligne\s*/g, '').replace(/métro\s*/g, '').replace(/rer\s*/g, '').replace(/tram\s*/g, '').trim()
    if (!q) return []
    return LINE_CATALOGUE.filter(l =>
      l.slug.toLowerCase().startsWith(q) ||
      l.label.toLowerCase().includes(q)
    ).slice(0, 6)
  }, [searchQuery])

  if (!activeLayers.has('transport')) return null

  return (
    <div className={cn("flex flex-col gap-4 w-full h-full pb-8", className)}>
      
      {/* 🔍 STICKY SEARCH AREA */}
      <div className="sticky top-0 bg-transparent z-20 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.15em]">
            Rechercher une ligne
          </span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green border border-brand-green/20">
            {vehicleCount} ACTIFS
          </span>
        </div>
        
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
            <span className="text-sm">🔍</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Ligne, arrêt ou trajet…"
            value={searchQuery}
            onChange={e => { setSearch(e.target.value); setShowSuggestions(true) }}
            onFocus={() => { if (searchQuery) setShowSuggestions(true) }}
            className={cn(
              "w-full h-12 pl-10 pr-10 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm outline-none transition-all",
              "focus:border-brand-green/50 focus:bg-white/[0.08] focus:ring-1 focus:ring-brand-green/20",
              showSuggestions && suggestions.length > 0 && "rounded-b-none border-b-transparent"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearch(''); setShowSuggestions(false) }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <span className="text-xs">✕</span>
            </button>
          )}

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={dropRef}
              className="absolute top-full left-0 right-0 bg-[#121212] border border-white/10 border-top-none rounded-b-2xl shadow-2xl overflow-hidden z-[100]"
            >
              {suggestions.map(s => (
                <button
                  key={s.slug}
                  onMouseDown={e => {
                    e.preventDefault()
                    setSearch(s.slug)
                    setShowSuggestions(false)
                  }}
                  className="flex items-center gap-3 w-full p-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-none"
                >
                  <span 
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black"
                    style={{ background: s.color + '22', border: `1px solid ${s.color}66`, color: s.color }}
                  >
                    {s.slug}
                  </span>
                  <span className="text-sm font-medium text-white/90">{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 🚀 HORIZONTAL TYPE CHIPS */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.15em] px-1">
          Filtres rapides
        </span>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1 -mx-1 snap-x">
          {VEHICLE_TYPES.map(({ key, label, icon }) => {
            const active = typeFilter.size === 0 || typeFilter.has(key)
            return (
              <button
                key={key}
                onClick={() => toggleType(key)}
                className={cn(
                  "flex items-center gap-2 px-4 h-10 rounded-full whitespace-nowrap snap-start transition-all duration-300",
                  "border border-white/10 active:scale-95",
                  active 
                    ? "bg-brand-green/20 border-brand-green/40 text-brand-green shadow-glow-green/10" 
                    : "bg-white/5 text-white/40 opacity-70"
                )}
              >
                <span className="text-sm">{icon}</span>
                <span className="text-xs font-black uppercase tracking-tight">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ℹ️ CONTEXT INFO (Placeholder for actual list) */}
      <div className="mt-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5 italic text-white/30 text-xs leading-relaxed">
        Glissez vers le haut pour voir le détail des perturbations en temps réel sur les lignes sélectionnées.
      </div>

    </div>
  )
}
