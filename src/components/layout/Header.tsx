'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell, Sparkles, Search, MapPin, X, ChevronDown, Zap, Lock, AlertTriangle, Clock } from 'lucide-react'
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

export function Header() {
  const router          = useRouter()
  const setAIPanelOpen  = useMapStore(s => s.setAIPanelOpen)
  const isAIPanelOpen   = useMapStore(s => s.isAIPanelOpen)
  const weather         = useTrafficStore(s => s.weather)
  const incidents       = useTrafficStore(s => s.incidents)
  const [time, setTime]           = useState('')
  const [alertOpen, setAlertOpen] = useState(false)
  const alertRef                  = useRef<HTMLDivElement>(null)

  const incidentCount = incidents?.length ?? 0

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (alertRef.current && !alertRef.current.contains(e.target as Node)) {
        setAlertOpen(false)
      }
    }
    if (alertOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [alertOpen])

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <header
      className="print-hidden flex items-center h-[52px] px-3 sm:px-4 gap-2 shrink-0 border-b border-bg-border"
      style={{
        background: 'rgba(10,11,14,0.92)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      }}
    >
      {/* Logo — mobile only (desktop has sidebar) */}
      <Link href="/map" className="lg:hidden flex items-center gap-2 mr-1 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
          <Zap className="w-4 h-4 text-black" strokeWidth={2.5} />
        </div>
      </Link>

      {/* City — locked badge or free search */}
      <div className="flex-1 min-w-0">
        <CitySearchBar />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Weather — sm+ only */}
        {weather && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-elevated/60 border border-bg-border/50">
            <span className="text-base leading-none">{weather.icon}</span>
            <span className="text-[13px] font-medium text-text-primary tabular-nums">{weather.temp}°</span>
          </div>
        )}

        {/* Clock — md+ only */}
        <div className="hidden md:flex items-center px-2.5 py-1.5 rounded-lg bg-bg-elevated/60 border border-bg-border/50">
          <span className="text-[13px] font-medium text-text-secondary mono tabular-nums">{time}</span>
        </div>

        {/* Alerts dropdown */}
        <div ref={alertRef} className="relative">
          <button
            onClick={() => setAlertOpen(o => !o)}
            className={cn('btn-icon relative', alertOpen && 'bg-bg-elevated')}
            title="Incidents actifs"
            aria-label="Incidents actifs"
            aria-expanded={alertOpen}
          >
            <Bell className="w-[18px] h-[18px]" strokeWidth={1.75} />
            {incidentCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-traffic-critical text-white text-[9px] font-bold leading-4 text-center tabular-nums">
                {incidentCount > 9 ? '9+' : incidentCount}
              </span>
            )}
          </button>

          {alertOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-bg-border overflow-hidden z-50 animate-scale-in"
              style={{
                background:          'rgba(18,20,26,0.97)',
                backdropFilter:      'blur(24px)',
                WebkitBackdropFilter:'blur(24px)',
                boxShadow:           '0 20px 48px rgba(0,0,0,0.6)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-brand" strokeWidth={2} />
                  <span className="text-[12px] font-bold text-text-primary uppercase tracking-wider">
                    Alertes actives
                  </span>
                  {incidentCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-traffic-critical/20 text-traffic-critical text-[10px] font-bold">
                      {incidentCount}
                    </span>
                  )}
                </div>
                <button onClick={() => setAlertOpen(false)} className="text-text-muted hover:text-text-secondary transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Incident list */}
              <div className="max-h-72 overflow-y-auto">
                {incidentCount === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-[13px] font-semibold text-text-primary mb-1">Tout est fluide</p>
                    <p className="text-[11px] text-text-muted">Aucun incident actif détecté.</p>
                  </div>
                ) : (
                  incidents
                    .slice()
                    .sort((a, b) => {
                      const order = { critical: 0, high: 1, medium: 2, low: 3 }
                      return (order[a.severity] ?? 3) - (order[b.severity] ?? 3)
                    })
                    .slice(0, 6)
                    .map(inc => (
                      <div
                        key={inc.id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors border-b border-bg-border/50 last:border-0"
                      >
                        <div
                          className="mt-0.5 w-2 h-2 rounded-full shrink-0"
                          style={{ background: SEVERITY_COLOR[inc.severity] ?? '#FFD600', boxShadow: `0 0 6px ${SEVERITY_COLOR[inc.severity] ?? '#FFD600'}` }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold text-text-primary truncate leading-snug">{inc.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-text-muted truncate max-w-[140px]">{inc.address}</span>
                            <span className="text-text-muted/40">·</span>
                            <div className="flex items-center gap-1 text-[10px] text-text-muted shrink-0">
                              <Clock className="w-2.5 h-2.5" />
                              {formatDistanceToNow(new Date(inc.startedAt), { locale: fr, addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>

              {/* Footer CTA */}
              <div className="px-4 py-2.5 border-t border-bg-border">
                <button
                  onClick={() => { router.push('/incidents'); setAlertOpen(false) }}
                  className="w-full text-[11px] font-bold text-brand hover:text-brand/80 transition-colors text-center"
                >
                  Voir tous les incidents →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Assistant */}
        <button
          onClick={() => setAIPanelOpen(!isAIPanelOpen)}
          className={`
            flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-[13px] font-medium
            transition-all duration-150 active:scale-95
            ${isAIPanelOpen
              ? 'bg-brand/15 text-brand border border-brand/30'
              : 'bg-bg-elevated border border-bg-border text-text-secondary hover:text-text-primary hover:border-bg-hover'
            }
          `}
          aria-label="Assistant IA"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isAIPanelOpen ? 'text-brand' : ''}`} strokeWidth={2} />
          <span className="hidden sm:inline">IA</span>
        </button>
      </div>
    </header>
  )
}

// ─── Preset cities ─────────────────────────────────────────────────────────
const PRESET_CITIES = [
  { name: 'Paris',         lat: 48.8566, lng: 2.3522,  country: 'FR', query: 'Paris, France' },
  { name: 'Lyon',          lat: 45.7640, lng: 4.8357,  country: 'FR', query: 'Lyon, France' },
  { name: 'Marseille',     lat: 43.2965, lng: 5.3698,  country: 'FR', query: 'Marseille, France' },
  { name: 'Bordeaux',      lat: 44.8378, lng: -0.5792, country: 'FR', query: 'Bordeaux, France' },
  { name: 'Gennevilliers', lat: 48.9233, lng: 2.3042,  country: 'FR', query: 'Gennevilliers, France' },
  { name: 'Londres',       lat: 51.5074, lng: -0.1278, country: 'GB', query: 'London, UK' },
  { name: 'Berlin',        lat: 52.5200, lng: 13.4050, country: 'DE', query: 'Berlin, Germany' },
]

function countryFlag(code: string) {
  const city = CITIES.find(c => c.countryCode === code)
  return city?.flag ?? '🌍'
}

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
    <div className="flex items-center gap-2 w-full max-w-xs h-9 px-3 rounded-lg bg-bg-elevated/70 border border-bg-border/60">
      <MapPin className="w-3.5 h-3.5 text-brand shrink-0" strokeWidth={2} />
      <span className="flex-1 truncate text-[13px] font-medium text-text-primary leading-none">
        {city.flag} {city.name}
      </span>
      <Link href="/settings" title="Changer de ville" className="text-text-muted hover:text-text-secondary transition-colors">
        <Lock className="w-3 h-3" />
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

  // Move hooks before conditional returns
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const inputRef              = useRef<HTMLInputElement>(null)
  const containerRef          = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) { setQuery(''); setResults([]); return }
    inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return }
    const tid = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&limit=5&accept-language=fr`
        )
        const data = await res.json()
        const items = data.slice(0, 5).map((r: any) => ({
          name:    r.display_name.split(',')[0].trim(),
          label:   r.display_name.split(',').slice(0, 2).join(',').trim(),
          lat:     parseFloat(r.lat),
          lng:     parseFloat(r.lon),
          country: (r.address?.country_code ?? '').toUpperCase(),
          geojson: r.geojson ?? null,
          bbox:    r.boundingbox
            ? [parseFloat(r.boundingbox[2]), parseFloat(r.boundingbox[0]),
               parseFloat(r.boundingbox[3]), parseFloat(r.boundingbox[1])]
            : null,
        }))
        setResults(items)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 280)
    return () => clearTimeout(tid)
  }, [query])

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Early return after ALL hooks are declared
  if (lockedCityId) return <LockedCityBadge />

  const select = async (c: {
    name: string; lat: number; lng: number; country: string
    label?: string; query?: string; geojson?: any; bbox?: number[] | null
  }) => {
    setOpen(false)
    const bbox = c.bbox ?? [c.lng - 0.15, c.lat - 0.15, c.lng + 0.15, c.lat + 0.15]
    setCity(geocodingToCity({
      id:          `${c.lat},${c.lng}`,
      displayName: c.name,
      name:        c.name,
      country:     c.country,
      countryCode: c.country,
      lat:         c.lat,
      lng:         c.lng,
      zoom:        12,
      bbox:        bbox as [number, number, number, number],
      type:        'city',
      importance:  1,
    }))

    // Fetch and set boundary polygon
    if (c.geojson) {
      setCityBoundary({ type: 'Feature', geometry: c.geojson, properties: { name: c.name } })
    } else {
      // For preset cities, fetch via Nominatim
      const boundary = await fetchCityBoundary(c.query ?? c.name)
      setCityBoundary(boundary)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full h-9 px-3 rounded-lg bg-bg-elevated/70 border border-bg-border/60 hover:border-bg-hover transition-all duration-150 text-left"
      >
        <MapPin className="w-3.5 h-3.5 text-brand shrink-0" strokeWidth={2} />
        <span className="flex-1 truncate text-[13px] font-medium text-text-primary leading-none">
          {city.name}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-bg-border overflow-hidden animate-scale-in z-50"
          style={{
            background: 'rgba(18,20,26,0.96)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-bg-border">
            <Search className="w-3.5 h-3.5 text-text-muted shrink-0" strokeWidth={2} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher une ville…"
              className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-muted outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-text-muted hover:text-text-secondary">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-52 overflow-y-auto">
            {loading && (
              <div className="px-4 py-3 text-[12px] text-text-muted">Recherche…</div>
            )}
            {!loading && !query && (
              <>
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Villes disponibles</span>
                </div>
                {CITIES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => select({ ...c, lat: c.center.lat, lng: c.center.lng, geojson: null })}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-bg-elevated transition-colors duration-100 text-left"
                  >
                    <div className="w-6 h-6 rounded-md bg-bg-subtle flex items-center justify-center shrink-0">
                      <span className="text-[11px]">{c.flag}</span>
                    </div>
                    <span className="text-[13px] text-text-primary">{c.name}</span>
                    <span className="ml-auto text-[10px] text-text-muted">{c.country}</span>
                  </button>
                ))}
              </>
            )}
            {!loading && query && results.length === 0 && (
              <div className="px-4 py-3 text-[12px] text-text-muted">
                Aucun résultat pour « {query} »
              </div>
            )}
            {!loading && results.map((r, i) => (
              <button
                key={i}
                onClick={() => select(r)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-bg-elevated transition-colors duration-100 text-left"
              >
                <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0" strokeWidth={1.75} />
                <div className="min-w-0">
                  <div className="text-[13px] text-text-primary truncate">{r.name}</div>
                  {r.label && r.label !== r.name && (
                    <div className="text-[11px] text-text-muted truncate">{r.label}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
