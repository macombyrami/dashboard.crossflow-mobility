'use client'

import { useMapStore } from '@/store/mapStore'

const VEHICLE_TYPES = [
  { key: 'subway', label: 'Métro', icon: '🚇' },
  { key: 'tram',   label: 'Tram',  icon: '🚋' },
  { key: 'bus',    label: 'Bus',   icon: '🚌' },
  { key: 'train',  label: 'RER',   icon: '🚆' },
]

interface VehicleFilterPanelProps {
  vehicleCount: number
}

export function VehicleFilterPanel({ vehicleCount }: VehicleFilterPanelProps) {
  const typeFilter   = useMapStore(s => s.vehicleTypeFilter)
  const toggleType   = useMapStore(s => s.toggleVehicleType)
  const searchQuery  = useMapStore(s => s.vehicleSearchQuery)
  const setSearch    = useMapStore(s => s.setVehicleSearch)

  return (
    <div
      style={{
        position:        'absolute',
        top:             '60px',
        right:           '56px',  // clear of MapLibre nav controls (~48px wide)
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

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <span style={{
          position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '12px', color: '#86868B', pointerEvents: 'none',
        }}>🔍</span>
        <input
          type="text"
          placeholder="Ligne, ex: 1, Bus 47…"
          value={searchQuery}
          onChange={e => setSearch(e.target.value)}
          style={{
            width:        '100%',
            padding:      '7px 10px 7px 28px',
            borderRadius: '10px',
            border:       '1px solid rgba(255,255,255,0.08)',
            background:   'rgba(255,255,255,0.05)',
            color:        '#F5F5F7',
            fontSize:     '12px',
            outline:      'none',
            boxSizing:    'border-box',
            fontFamily:   'inherit',
          }}
          onFocus={e => (e.currentTarget.style.border = '1px solid rgba(34,197,94,0.4)')}
          onBlur={e  => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)')}
        />
        {searchQuery && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: '#86868B', cursor: 'pointer', fontSize: '12px',
            }}
          >✕</button>
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
                // Clicking the only active type → reset (show all)
                if (exclusive) {
                  // clear filter (show all)
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
