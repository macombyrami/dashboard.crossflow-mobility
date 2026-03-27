'use client'

import { useEffect, useRef } from 'react'
import { useMapStore } from '@/store/mapStore'
import type { TransitVehicle } from '@/lib/engine/transit.engine'

// Icons by route type
const ROUTE_ICON: Record<string, string> = {
  subway:   '🚇',
  tram:     '🚋',
  bus:      '🚌',
  train:    '🚆',
  monorail: '🚝',
  ferry:    '⛴️',
}

const TYPE_LABEL: Record<string, string> = {
  subway:   'Métro',
  tram:     'Tramway',
  bus:      'Bus',
  train:    'RER / Train',
  monorail: 'Monorail',
  ferry:    'Ferry',
}

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
function bearingLabel(deg: number): string {
  return DIRS[Math.round(deg / 45) % 8]
}

function textOnBg(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length < 6) return '#000'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#000' : '#fff'
}

interface VehicleInfoCardProps {
  vehicle: TransitVehicle | null
  isDisrupted: boolean
}

export function VehicleInfoCard({ vehicle, isDisrupted }: VehicleInfoCardProps) {
  const selectedVehicleId  = useMapStore(s => s.selectedVehicleId)
  const setSelectedVehicle = useMapStore(s => s.setSelectedVehicle)
  const isTracking         = useMapStore(s => s.isTrackingVehicle)
  const setTracking        = useMapStore(s => s.setTrackingVehicle)
  const cardRef            = useRef<HTMLDivElement>(null)

  const isVisible = selectedVehicleId !== null && vehicle !== null

  // Animate in/out
  useEffect(() => {
    if (!cardRef.current) return
    if (isVisible) {
      cardRef.current.style.transform = 'translateY(0)'
      cardRef.current.style.opacity   = '1'
    } else {
      cardRef.current.style.transform = 'translateY(100%)'
      cardRef.current.style.opacity   = '0'
    }
  }, [isVisible])

  function handleClose() {
    setSelectedVehicle(null)
    setTracking(false)
  }

  function handleTrackToggle() {
    setTracking(!isTracking)
  }

  if (!vehicle) {
    return (
      <div
        ref={cardRef}
        style={{
          position:   'absolute',
          bottom:     '24px',
          left:       '16px',
          width:      '300px',
          transform:  'translateY(100%)',
          opacity:    0,
          transition: 'transform 0.35s cubic-bezier(0.34,1.2,0.64,1), opacity 0.25s ease',
          zIndex:     20,
          pointerEvents: 'none',
        }}
      />
    )
  }

  const { routeType, routeRef, routeName, color, speedKmh, bearing } = vehicle
  const tc      = textOnBg(color)
  const icon    = ROUTE_ICON[routeType] ?? '🚌'
  const label   = TYPE_LABEL[routeType] ?? routeType
  const dirText = bearingLabel(bearing)

  return (
    <div
      ref={cardRef}
      style={{
        position:        'absolute',
        bottom:          '24px',
        left:            '16px',
        width:           '300px',
        transform:       isVisible ? 'translateY(0)' : 'translateY(100%)',
        opacity:         isVisible ? 1 : 0,
        transition:      'transform 0.35s cubic-bezier(0.34,1.2,0.64,1), opacity 0.25s ease',
        zIndex:          20,
        fontFamily:      'Inter, -apple-system, sans-serif',
        borderRadius:    '20px',
        background:      'rgba(12,12,18,0.92)',
        backdropFilter:  'blur(20px)',
        border:          `1px solid ${color}35`,
        boxShadow:       `0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px ${color}20`,
        overflow:        'hidden',
      }}
    >
      {/* Header stripe */}
      <div style={{ height: '4px', background: color, borderRadius: '20px 20px 0 0' }} />

      <div style={{ padding: '16px' }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          {/* Route badge */}
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: color, display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
            boxShadow: `0 4px 12px ${color}50`,
          }}>
            <span style={{ fontSize: '20px' }}>{icon}</span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#F5F5F7', letterSpacing: '-0.3px' }}>
              {label} <span style={{ color }}>{routeRef}</span>
            </p>
            <p style={{
              margin: 0, fontSize: '11px', color: '#86868B',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {routeName || '—'}
            </p>
          </div>

          {/* Close */}
          <button
            onClick={handleClose}
            style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#86868B', fontSize: '14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >✕</button>
        </div>

        {/* Status badge */}
        <div style={{ marginBottom: '14px' }}>
          {isDisrupted ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '4px 10px', borderRadius: '20px',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
              fontSize: '10px', fontWeight: 700, color: '#EF4444',
            }}>
              ⚠ PERTURBÉ
            </span>
          ) : (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '4px 10px', borderRadius: '20px',
              background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.30)',
              fontSize: '10px', fontWeight: 700, color: '#22C55E',
            }}>
              ● EN SERVICE
            </span>
          )}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          {[
            { label: 'Vitesse', value: `${speedKmh}`, unit: 'km/h' },
            { label: 'Direction', value: dirText, unit: `${Math.round(bearing)}°` },
            { label: 'Type', value: icon, unit: label },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
              padding: '8px', textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <p style={{ margin: 0, fontSize: '8px', color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {stat.label}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '17px', fontWeight: 700, color: '#F5F5F7' }}>
                {stat.value}
              </p>
              <p style={{ margin: 0, fontSize: '8px', color: '#86868B' }}>{stat.unit}</p>
            </div>
          ))}
        </div>

        {/* Tracking button */}
        <button
          onClick={handleTrackToggle}
          style={{
            width: '100%', padding: '10px 16px', borderRadius: '12px', border: 'none',
            background: isTracking ? color : 'rgba(255,255,255,0.07)',
            color:      isTracking ? tc : '#F5F5F7',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            transition: 'all 0.2s ease',
            boxShadow: isTracking ? `0 4px 12px ${color}40` : 'none',
          }}
          onMouseEnter={e => {
            if (!isTracking) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
          }}
          onMouseLeave={e => {
            if (!isTracking) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
          }}
        >
          {isTracking ? '📡 Suivi actif — cliquer pour arrêter' : '📡 Suivre ce véhicule'}
        </button>
      </div>
    </div>
  )
}
