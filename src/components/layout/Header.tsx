'use client'
import React, { memo, useState, useEffect, useRef } from 'react'
import { Bell, Sparkles, Search, MapPin, X, ChevronDown, Zap, Lock, AlertTriangle, Clock, ShieldCheck, Info, Menu } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMapStore, geocodingToCity } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { CITIES }       from '@/config/cities.config'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useUIStore } from '@/store/uiStore'

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#FF3B30', // Red
  high:     '#FF9500', // Orange
  medium:   '#FFB300', // Yellow
  low:      '#00D966', // Green
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

const LiveClock = memo(function LiveClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="flex items-center gap-2 text-text-primary px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
      <Clock className="w-3.5 h-3.5 text-white/40" />
      <span className="text-[13px] font-black tracking-tight tabular-nums">{time}</span>
    </div>
  )
})

function LockedCityBadge() {
  const city = useMapStore(s => s.city)
  return (
    <div className="flex items-center gap-3 h-10 px-4 rounded-xl bg-white/5 border border-white/5 shadow-inner transition-all hover:bg-white/10 group cursor-default">
      <MapPin className="w-4 h-4 text-brand-green shrink-0" strokeWidth={2.5} />
      <span className="truncate text-xs font-black text-white leading-none uppercase tracking-[0.05em]">
        {city.flag} {city.name}
      </span>
      <div className="w-px h-4 bg-white/10 mx-1" />
      <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{city.countryCode}</span>
    </div>
  )
}

function CitySearchBar() {
  const lockedCityId    = useMapStore(s => s.lockedCityId)
  const city            = useMapStore(s => s.city)
  const setCity         = useMapStore(s => s.setCity)
  const setCityBoundary = useMapStore(s => s.setCityBoundary)
  const [open, setOpen]       = useState(false)
  const containerRef          = useRef<HTMLDivElement>(null)

  if (lockedCityId) return <LockedCityBadge />

  return (
    <div ref={containerRef} className="relative group">
       <button 
         onClick={() => setOpen(!open)}
         className="flex items-center gap-3 h-10 px-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all text-left"
       >
         <MapPin className="w-4 h-4 text-brand-green shrink-0" strokeWidth={2.5} />
         <span className="text-xs font-black text-white leading-none uppercase tracking-tight">{city.name}</span>
         <ChevronDown className={cn("w-3.5 h-3.5 text-white/20 transition-transform", open && "rotate-180")} />
       </button>
       {/* Simplification: Removed full search logic here for Header rationalization, if really needed, it can be added back or moved to a dedicated search page */}
    </div>
  )
}

// ─── Main Header Component ──────────────────────────────────────────────────

export function Header() {
  const setAIPanelOpen  = useMapStore(s => s.setAIPanelOpen)
  const isAIPanelOpen   = useMapStore(s => s.isAIPanelOpen)
  const weather         = useTrafficStore(s => s.weather)
  const incidents       = useTrafficStore(s => s.incidents)
  const socialIncidents = useTrafficStore(s => s.socialIncidents)
  const clearIncidents  = useTrafficStore(s => s.clearIncidents)
  const toggleSidebar   = useUIStore(s => s.toggleSidebar)
  const [alertOpen, setAlertOpen] = useState(false)
  const alertRef                  = useRef<HTMLDivElement>(null)

  const allIncidents  = [...socialIncidents, ...incidents]
  const incidentCount = allIncidents.length

  return (
    <header
      className="print-hidden flex items-center justify-between h-[56px] px-4 shrink-0 border-b border-white/10 relative z-[100]"
      style={{
        background: 'rgba(10,11,14,0.85)',
        backdropFilter: 'blur(32px) saturate(160%)',
        WebkitBackdropFilter: 'blur(32px) saturate(160%)',
      }}
    >
      {/* 🧩 GROUP 1: CONTEXTE GÉOGRAPHIQUE & SYSTÈME */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={toggleSidebar}
          aria-label="Ouvrir le menu"
          className="lg:hidden flex items-center justify-center w-10 h-10 -ml-2 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <CitySearchBar />
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-[0.15em] text-white/40">
           <ShieldCheck className="w-3.5 h-3.5 text-brand-green" />
           Système Sécurisé
        </div>
      </div>

      {/* 🚀 Actions & Controls */}
      <div className="flex items-center gap-2">
        
        {/* 🧩 GROUP 2: CONDITIONS & STATUS LIVE */}
        <div className="flex items-center gap-2 px-1 py-1 rounded-2xl bg-black/30 border border-white/5">
           {weather && (
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
               <span className="text-base leading-none">{weather.icon}</span>
               <span className="text-[13px] font-black text-white tabular-nums tracking-tight">{weather.temp}°</span>
             </div>
           )}
           <LiveClock />
        </div>

        {/* 🔔 Notifications */}
        <div ref={alertRef} className="relative ml-2">
          <button
            onClick={() => setAlertOpen(!alertOpen)}
            className={cn(
              'w-10 h-10 flex items-center justify-center rounded-xl border transition-all relative', 
              alertOpen ? 'bg-white/15 border-white/20' : 'bg-white/5 border-white/5 hover:bg-white/10'
            )}
          >
            <Bell className="w-4.5 h-4.5 text-white/60" strokeWidth={2} />
            {incidentCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] rounded-lg bg-red-600 text-white text-[9px] font-black leading-[17px] text-center border border-white/10">
                {incidentCount}
              </span>
            )}
          </button>
          {/* Notification List logic... */}
        </div>

        {/* 🧩 GROUP 3: INFO & AI ANALYST (Minimal) */}
        <button
          onClick={() => setAIPanelOpen(!isAIPanelOpen)}
          className={cn(
            'w-10 h-10 flex items-center justify-center rounded-xl border transition-all relative group',
            isAIPanelOpen ? 'bg-brand-green border-brand-green shadow-glow' : 'bg-white/5 border-white/5 hover:bg-white/10'
          )}
          title="Analyse Intelligence"
        >
          <Sparkles className={cn('w-4.5 h-4.5', isAIPanelOpen ? 'text-black' : 'text-brand-green')} />
          {/* Audit: Tooltip instead of text label to reduce clutter */}
          <div className="absolute top-full right-0 mt-3 px-3 py-2 bg-black/95 border border-white/10 rounded-xl text-[10px] text-white/60 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none translate-y-2 group-hover:translate-y-0 shadow-2xl z-50">
             Activer l'Analyse Prédictive IA
          </div>
        </button>

      </div>
    </header>
  )
}

// RESTORING UTILITIES (IDENTICAL TO PREVIOUS FOR STABILITY)
const PRESET_CITIES = [
  { name: 'Paris',         lat: 48.8566, lng: 2.3522,  country: 'FR', query: 'Paris, France' },
  { name: 'Gennevilliers', lat: 48.9233, lng: 2.3042,  country: 'FR', query: 'Gennevilliers, France' },
  { name: 'Lyon',          lat: 45.7640, lng: 4.8357,  country: 'FR', query: 'Lyon, France' },
]

async function fetchCityBoundary(query: string, country?: string): Promise<any> {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}${country ? ','+country : ''}&format=json&polygon_geojson=1&limit=1&featuretype=city&accept-language=fr`)
    const data = await res.json()
    return data[0]?.geojson || null
}
