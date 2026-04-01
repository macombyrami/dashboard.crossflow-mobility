'use client'
import React, { memo } from 'react'
import { Bell, Sparkles, Search, MapPin, X, ChevronDown, Zap, Lock, AlertTriangle, Clock, ShieldCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMapStore, geocodingToCity } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { CITIES }       from '@/config/cities.config'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#FF1744',
  high:     '#FF6D00',
  medium:   '#FFB300',
  low:      '#00E676',
}

// 🌐 Audit: Refined Status Label (Intelligence Active)
const LiveClock = memo(function LiveClock() {
  const [time, setTime] = React.useState('')
  React.useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="hidden md:flex items-center gap-4 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 shadow-inner group">
      <div className="flex items-center gap-2 pr-3 border-r border-white/5">
        <div className="relative">
          <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-brand-green animate-ping opacity-40" />
        </div>
        <span className="text-[10px] font-black text-brand-green uppercase tracking-[0.15em] hidden lg:inline">Intelligence Live</span>
      </div>
      <div className="flex items-center gap-2 text-text-primary">
        <Clock className="w-3.5 h-3.5 text-white/40" />
        <span className="text-[13px] font-black tracking-tight tabular-nums">{time}</span>
      </div>
    </div>
  )
})

export function Header() {
  const router          = useRouter()
  const setAIPanelOpen  = useMapStore(s => s.setAIPanelOpen)
  const isAIPanelOpen   = useMapStore(s => s.isAIPanelOpen)
  const weather         = useTrafficStore(s => s.weather)
  const incidents       = useTrafficStore(s => s.incidents)
  const socialIncidents = useTrafficStore(s => s.socialIncidents)
  const clearIncidents  = useTrafficStore(s => s.clearIncidents)
  const [alertOpen, setAlertOpen] = React.useState(false)
  const alertRef                  = React.useRef<HTMLDivElement>(null)
  const buttonRef                 = React.useRef<HTMLButtonElement>(null)

  const allIncidents  = [...socialIncidents, ...incidents]
  const incidentCount = allIncidents.length

  return (
    <header
      className="print-hidden flex items-center h-[56px] px-4 gap-3 shrink-0 border-b border-white/10 relative z-[100]"
      style={{
        background: 'rgba(10,11,14,0.85)',
        backdropFilter: 'blur(32px) saturate(160%)',
        WebkitBackdropFilter: 'blur(32px) saturate(160%)',
      }}
    >
      <Link href="/map" className="lg:hidden flex items-center gap-2 mr-2 shrink-0 group">
        <div className="w-9 h-9 rounded-xl bg-brand-green flex items-center justify-center shadow-[0_0_15px_rgba(0,230,118,0.3)] transition-transform group-hover:scale-110">
          <Zap className="w-5 h-5 text-black" strokeWidth={2.5} />
        </div>
      </Link>

      {/* 📍 Navigation & Search - Context aware */}
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <CitySearchBar />
        
        {/* Audit: System Integrity Badge */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/40">
           <ShieldCheck className="w-3.5 h-3.5 text-brand-green/60" />
           Système Sécurisé
        </div>
      </div>

      {/* 🚀 Actions & Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {weather && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
            <span className="text-lg leading-none">{weather.icon}</span>
            <span className="text-[13px] font-black text-white tabular-nums tracking-tighter">{weather.temp}°</span>
          </div>
        )}

        <LiveClock />

        <div ref={alertRef} className="relative z-[110]">
          <button
            ref={buttonRef}
            onClick={() => setAlertOpen(!alertOpen)}
            className={cn(
              'w-10 h-10 flex items-center justify-center rounded-xl border transition-all relative', 
              alertOpen 
                ? 'bg-white/15 border-white/20 shadow-inner' 
                : 'bg-white/5 border-white/5 hover:bg-white/10 text-text-muted hover:text-white'
            )}
            title="Notification Center"
          >
            <Bell className="w-5 h-5" strokeWidth={2} />
            {incidentCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-lg bg-red-600 text-white text-[9px] font-black leading-[18px] text-center shadow-lg border border-white/20">
                {incidentCount > 9 ? '9+' : incidentCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {alertOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-3 w-80 rounded-2xl border border-white/10 overflow-hidden shadow-[0_25px_50px_rgba(0,0,0,0.65)]"
                style={{ background: 'rgba(18,20,26,0.98)', backdropFilter: 'blur(30px)' }}
              >
                 {/* Notification Content... (Keeping original list logic) */}
                 <div className="px-4 py-4 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-widest text-white/50">Alertes Actives</span>
                    <button onClick={() => setAlertOpen(false)} className="text-white/20 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                 </div>
                 <div className="max-h-96 overflow-y-auto p-2 space-y-1">
                    {allIncidents.length > 0 ? allIncidents.map(inc => (
                      <div key={inc.id} className="p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-default">
                        <div className="flex gap-3">
                           <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: SEVERITY_COLOR[inc.severity] || '#FFF', boxShadow: `0 0 10px ${SEVERITY_COLOR[inc.severity]}` }}/>
                           <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-1">{inc.type}</p>
                              <h4 className="text-[13px] font-extrabold text-white leading-tight mb-1">{inc.title}</h4>
                              <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">{inc.description}</p>
                           </div>
                        </div>
                      </div>
                    )) : (
                      <div className="py-12 text-center text-text-muted text-[11px] font-bold uppercase tracking-widest italic opacity-40">Aucun péril détecté</div>
                    )}
                 </div>
                 <div className="p-3 mt-1 border-t border-white/5">
                    <button onClick={() => { clearIncidents(); setAlertOpen(false); }} className="w-full py-2.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">Effacer tout</button>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 🎯 Audit: Predictive Analysis High-Affordance Button */}
        <button
          onClick={() => setAIPanelOpen(!isAIPanelOpen)}
          className={cn(
            'flex items-center gap-2.5 px-4 h-10 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all duration-300 relative overflow-hidden active:scale-95 group',
            isAIPanelOpen
              ? 'bg-brand-green text-bg-base shadow-[0_0_20px_rgba(0,230,118,0.4)]'
              : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-brand-green/30'
          )}
        >
          {isAIPanelOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-white/10 mix-blend-overlay animate-pulse" />
          )}
          <Sparkles className={cn('w-4 h-4 relative z-10 transition-transform group-hover:rotate-12', isAIPanelOpen ? 'text-bg-base' : 'text-brand-green')} />
          <span className="hidden sm:inline relative z-10">Analyse Prédictive</span>
          {!isAIPanelOpen && <div className="absolute right-0 top-0 w-8 h-full bg-gradient-to-r from-transparent to-brand-green/10 skew-x-[-20deg] group-hover:translate-x-full transition-transform duration-700" />}
        </button>
      </div>
    </header>
  )
}

// ─── Preset cities ─────────────────────────────────────────────────────────
const PRESET_CITIES = [
  { name: 'Paris',         lat: 48.8566, lng: 2.3522,  country: 'FR', query: 'Paris, France' },
  { name: 'Gennevilliers', lat: 48.9233, lng: 2.3042,  country: 'FR', query: 'Gennevilliers, France' },
  { name: 'Lyon',          lat: 45.7640, lng: 4.8357,  country: 'FR', query: 'Lyon, France' },
  { name: 'Marseille',     lat: 43.2965, lng: 5.3698,  country: 'FR', query: 'Marseille, France' },
  { name: 'Londres',       lat: 51.5074, lng: -0.1278, country: 'GB', query: 'London, UK' },
]

// Fetch city boundary polygon from Nominatim
async function fetchCityBoundary(query: string): Promise<GeoJSON.Feature | null> {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&limit=1&featuretype=city&accept-language=fr`,
      { next: { revalidate: 86400 } } as RequestInit,
    )
    const data = await res.json()
    if (!data[0]?.geojson) return null
    return {
      type:       'Feature',
      geometry:   data[0].geojson,
      properties: { name: data[0].display_name },
    }
  } catch {
    return null
  }
}

// ─── Locked city badge (when user has a default city set) ──────────────────
function LockedCityBadge() {
  const city = useMapStore(s => s.city)
  return (
    <div className="flex items-center gap-3 w-full max-w-xs h-10 px-4 rounded-xl bg-white/5 border border-white/5 shadow-inner">
      <MapPin className="w-4 h-4 text-brand-green shrink-0" strokeWidth={2.5} />
      <span className="flex-1 truncate text-xs font-black text-white leading-none uppercase tracking-tight">
        {city.flag} {city.name}
      </span>
      <Link href="/settings" title="Changer de ville" className="text-white/20 hover:text-white transition-colors">
        <Lock className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}

// ─── Inline city search bar ─────────────────────────────────────────────────
function CitySearchBar() {
  const lockedCityId    = useMapStore(s => s.lockedCityId)
  const city            = useMapStore(s => s.city)
  const setCity         = useMapStore(s => s.setCity)
  const setCityBoundary = useMapStore(s => s.setCityBoundary)

  const [open, setOpen]       = React.useState(false)
  const [query, setQuery]     = React.useState('')
  const [results, setResults] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  
  const inputRef              = React.useRef<HTMLInputElement>(null)
  const containerRef          = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) { setQuery(''); setResults([]); return }
    inputRef.current?.focus()
  }, [open])

  React.useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return }
    const tid = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&limit=5&accept-language=fr`)
        const data = await res.json()
        const items = data.slice(0, 5).map((r: any) => ({
          name:    r.display_name.split(',')[0].trim(),
          label:   r.display_name.split(',').slice(0, 2).join(',').trim(),
          lat:     parseFloat(r.lat),
          lng:     parseFloat(r.lon),
          country: (r.address?.country_code ?? '').toUpperCase(),
          geojson: r.geojson ?? null,
          bbox:    r.boundingbox ? [parseFloat(r.boundingbox[2]), parseFloat(r.boundingbox[0]), parseFloat(r.boundingbox[3]), parseFloat(r.boundingbox[1])] : null,
        }))
        setResults(items)
      } catch { setResults([]) } finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(tid)
  }, [query])

  if (lockedCityId) return <LockedCityBadge />

  const select = async (c: any) => {
    setOpen(false)
    const bbox = c.bbox ?? [c.lng - 0.15, c.lat - 0.15, c.lng + 0.15, c.lat + 0.15]
    setCity(geocodingToCity({
      id: `${c.lat},${c.lng}`, displayName: c.name, name: c.name, country: c.country, countryCode: c.country,
      lat: c.lat, lng: c.lng, zoom: 12, bbox: bbox as any, type: 'city', importance: 1,
    }))
    if (c.geojson) setCityBoundary({ type: 'Feature', geometry: c.geojson, properties: { name: c.name } })
    else setCityBoundary(await fetchCityBoundary(c.query ?? c.name))
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center gap-3 w-full h-10 px-4 rounded-xl transition-all duration-300 text-left border",
          open ? "bg-white/10 border-white/20 shadow-glow" : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/8"
        )}
      >
        <MapPin className="w-4 h-4 text-brand-green shrink-0" strokeWidth={2.5} />
        <span className="flex-1 truncate text-xs font-black text-white leading-none uppercase tracking-tight">
          {city.name}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-white/20 transition-transform duration-300", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-white/10 overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.7)] z-50 overflow-hidden"
            style={{ background: 'rgba(18,20,26,0.98)', backdropFilter: 'blur(32px)' }}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
              <Search className="w-4 h-4 text-white/30" strokeWidth={2.5} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Localiser une ville..."
                className="flex-1 bg-transparent text-sm text-white font-bold placeholder:text-white/20 outline-none"
              />
            </div>

            <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
              {loading && <div className="px-4 py-6 text-center text-[10px] text-brand-green animate-pulse font-black uppercase tracking-[0.2em]">Synchronisation...</div>}
              {!loading && !query && (
                <>
                  <div className="px-3 pt-2 pb-2">
                    <span className="text-[10px] uppercase font-black tracking-widest text-white/20">Accès rapide</span>
                  </div>
                  {PRESET_CITIES.map(c => (
                    <button key={c.name} onClick={() => select(c)} className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all text-left group">
                      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-brand-green/30">
                        <span className="text-xs">📍</span>
                      </div>
                      <span className="text-xs font-black text-white/70 group-hover:text-white uppercase tracking-tight">{c.name}</span>
                      <span className="ml-auto text-[9px] font-bold text-white/10 group-hover:text-brand-green uppercase">{c.country}</span>
                    </button>
                  ))}
                </>
              )}
              {results.map((r, i) => (
                <button key={i} onClick={() => select(r)} className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/5 transition-all text-left">
                  <MapPin className="w-4 h-4 text-brand-green/40" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-white uppercase tracking-tight truncate">{r.name}</div>
                    <div className="text-[10px] text-white/30 font-bold truncate mt-0.5">{r.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

