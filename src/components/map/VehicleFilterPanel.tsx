'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useMapStore } from '@/store/mapStore'

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
}

export function VehicleFilterPanel({ vehicleCount }: VehicleFilterPanelProps) {
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
    <div
      style={{
        position:        'absolute',
        top:             '60px',
        right:           '56px',
        width:           '220px',
        fontFamily:      'Inter, -apple-system, sans-serif',
        background:      'rgba(10,10,16,0.90)',
        backdropFilter:  'blur(18px)',
        border:          '1px solid rgba(255,255,255,0.09)',
        borderRadius:    '16px',
        boxShadow:       '0 8px 32px rgba(0,0,0,0.45)',
        padding:         '12px',
        zIndex:          15,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Véhicules
        </span>
        <span style={{
          fontSize: '10px', fontWeight: 700,
          padding: '2px 8px', borderRadius: '20px',
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
          color: '#22C55E',
        }}>
          {vehicleCount} actifs
        </span>
      </div>

      {/* Search with autocomplete */}
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <span style={{
          position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '12px', color: '#86868B', pointerEvents: 'none',
        }}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Ligne, ex: 1, Bus 47…"
          value={searchQuery}
          onChange={e => { setSearch(e.target.value); setShowSuggestions(true) }}
          onFocus={() => { if (searchQuery) setShowSuggestions(true) }}
          style={{
            width:        '100%',
            padding:      '7px 10px 7px 28px',
            borderRadius: showSuggestions && suggestions.length > 0 ? '10px 10px 0 0' : '10px',
            border:       '1px solid rgba(255,255,255,0.08)',
            background:   'rgba(255,255,255,0.05)',
            color:        '#F5F5F7',
            fontSize:     '12px',
            outline:      'none',
            boxSizing:    'border-box',
            fontFamily:   'inherit',
          }}
          onMouseOver={e => (e.currentTarget.style.border = '1px solid rgba(34,197,94,0.4)')}
          onMouseOut={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)')}
        />
        {searchQuery && (
          <button
            onClick={() => { setSearch(''); setShowSuggestions(false) }}
            style={{
              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: '#86868B', cursor: 'pointer', fontSize: '12px',
            }}
          >✕</button>
        )}

        {/* Autocomplete dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={dropRef}
            style={{
              position:    'absolute',
              top:         '100%',
              left:        0,
              right:       0,
              background:  'rgba(18,18,28,0.98)',
              border:      '1px solid rgba(255,255,255,0.12)',
              borderTop:   'none',
              borderRadius:'0 0 10px 10px',
              overflow:    'hidden',
              zIndex:      20,
            }}
          >
            {suggestions.map(s => (
              <button
                key={s.slug}
                onMouseDown={e => {
                  e.preventDefault()
                  setSearch(s.slug)
                  setShowSuggestions(false)
                }}
                style={{
                  display:     'flex',
                  alignItems:  'center',
                  gap:         '8px',
                  width:       '100%',
                  padding:     '7px 10px',
                  background:  'none',
                  border:      'none',
                  borderBottom:'1px solid rgba(255,255,255,0.05)',
                  color:       '#F5F5F7',
                  fontSize:    '12px',
                  cursor:      'pointer',
                  textAlign:   'left',
                  fontFamily:  'inherit',
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                onMouseOut={e  => (e.currentTarget.style.background = 'none')}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '22px', height: '22px', borderRadius: '6px',
                  background: s.color + '33', border: `1px solid ${s.color}66`,
                  fontSize: '11px', fontWeight: 800, color: s.color,
                  flexShrink: 0,
                }}>
                  {s.slug.slice(0, 3)}
                </span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Type filter pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
        {VEHICLE_TYPES.map(({ key, label, icon }) => {
          const active = typeFilter.size === 0 || typeFilter.has(key)
          const exclusive = typeFilter.size === 1 && typeFilter.has(key)
          return (
            <button
              key={key}
              onClick={() => {
                if (exclusive) {
                  const next = useMapStore.getState().vehicleTypeFilter
                  next.forEach(t => useMapStore.getState().toggleVehicleType(t))
                } else {
                  toggleType(key)
                }
              }}
              style={{
                display:      'inline-flex',
                alignItems:   'center',
                gap:          '4px',
                padding:      '4px 9px',
                borderRadius: '20px',
                border:       active ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.07)',
                background:   active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                color:        active ? '#F5F5F7' : '#555',
                fontSize:     '11px',
                fontWeight:   active ? 600 : 400,
                cursor:       'pointer',
                transition:   'all 0.15s ease',
                fontFamily:   'inherit',
              }}
            >
              {icon} {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
