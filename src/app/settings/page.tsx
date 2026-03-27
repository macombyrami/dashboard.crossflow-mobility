'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { Metadata } from 'next'

import { createClient } from '@/lib/supabase/client'
import { useMapStore } from '@/store/mapStore'
import { CITIES } from '@/config/cities.config'
import { Settings, MapPin, User, LogOut, CheckCircle2, Loader2, ShieldCheck, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const ROLE_LABELS: Record<string, string> = {
  'city_planner':    'Planificateur urbain',
  'city planner':    'Planificateur urbain',
  'admin':           'Administrateur',
  'analyst':         'Analyste',
  'operator':        'Opérateur',
  'viewer':          'Observateur',
  'manager':         'Gestionnaire',
  'traffic_officer': 'Agent de circulation',
  'engineer':        'Ingénieur',
}

export default function SettingsPage() {
  useEffect(() => { document.title = 'Paramètres | CrossFlow' }, [])
  const router        = useRouter()
  const supabase      = createClient()
  const setCity       = useMapStore(s => s.setCity)
  const setLockedCity = useMapStore(s => s.setLockedCity)
  const lockedCityId  = useMapStore(s => s.lockedCityId)

  const [user,         setUser]         = useState<SupabaseUser | null>(null)
  const [selectedCity, setSelectedCity] = useState(lockedCityId ?? 'paris')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [signingOut,   setSigningOut]   = useState(false)
  const [search,       setSearch]       = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      const cityId = data.user?.user_metadata?.default_city as string | undefined
      if (cityId) setSelectedCity(cityId)
    })
  }, []) // eslint-disable-line

  const handleSaveCity = async () => {
    if (!user) return
    setSaving(true)
    setSaved(false)
    try {
      await supabase.auth.updateUser({ data: { default_city: selectedCity } })
      const city = CITIES.find(c => c.id === selectedCity)
      if (city) {
        setCity(city)
        setLockedCity(selectedCity)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    setLockedCity(null)
    router.push('/login')
  }

  const meta        = user?.user_metadata ?? {}
  const currentCity = CITIES.find(c => c.id === (lockedCityId ?? selectedCity))
  const filteredCities = search.trim()
    ? CITIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.country.toLowerCase().includes(search.toLowerCase()),
      )
    : CITIES

  return (
    <main className="min-h-full p-6 space-y-6 max-w-2xl mx-auto w-full pb-safe">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-bg-elevated border border-bg-border flex items-center justify-center">
          <Settings className="w-4 h-4 text-text-secondary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text-primary">Paramètres</h1>
          <p className="text-sm text-text-secondary">Gérez votre compte et votre ville de travail</p>
        </div>
      </div>

      {/* Account */}
      <section className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-bg-border flex items-center gap-2">
          <User className="w-4 h-4 text-brand" />
          <span className="text-sm font-semibold text-text-primary">Compte</span>
        </div>
        <div className="p-5">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-xl font-bold text-brand select-none shadow-sm">
                {(meta.display_name ?? user.email ?? '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-text-primary truncate">
                  {meta.display_name || 'Utilisateur CrossFlow'}
                </p>
                <p className="text-[13px] text-text-secondary truncate">{user.email}</p>
                <p className="text-[11px] font-medium text-text-muted mt-1 uppercase tracking-wider">
                  {meta.role ? (ROLE_LABELS[String(meta.role)] ?? String(meta.role)) : 'Membre'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-green/10 border border-brand-green/20 shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                <span className="text-[10px] font-bold text-brand-green uppercase tracking-wider">Connecté</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-text-muted py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Chargement du profil…</span>
            </div>
          )}
        </div>
      </section>

      {/* City selection */}
      <section className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-bg-border flex items-center gap-2">
          <MapPin className="w-4 h-4 text-brand" />
          <span className="text-sm font-semibold text-text-primary">Ville principale</span>
          {currentCity && (
            <span className="ml-auto text-[12px] text-text-muted">
              Actuelle :&nbsp;
              <span className="text-text-secondary font-medium">{currentCity.flag} {currentCity.name}</span>
            </span>
          )}
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[13px] text-text-secondary">
            Votre tableau de bord et votre carte sont verrouillés sur cette ville. Vous pouvez en choisir une autre ici.
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une ville…"
              className="w-full bg-bg-elevated border border-bg-border rounded-xl pl-9 pr-9 py-2.5 text-[13px] text-text-primary placeholder-text-muted outline-none focus:border-brand/50 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid gap-2 max-h-[380px] overflow-y-auto pr-1">
            {filteredCities.length === 0 && (
              <p className="text-[13px] text-text-muted text-center py-6">Aucune ville trouvée pour « {search} »</p>
            )}
            {filteredCities.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCity(c.id)}
                className={cn(
                  'flex items-center gap-4 p-3.5 rounded-xl border text-left transition-all',
                  selectedCity === c.id
                    ? 'border-brand/60 bg-brand/10'
                    : 'border-bg-border bg-bg-elevated hover:border-bg-hover',
                )}
              >
                <span className="text-xl leading-none">{c.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-[13px] font-semibold truncate', selectedCity === c.id ? 'text-brand' : 'text-text-primary')}>
                    {c.name}
                  </p>
                  <p className="text-[11px] text-text-muted">{c.country} · {(c.population / 1_000_000).toFixed(1)}M hab.</p>
                </div>
                {selectedCity === c.id && <CheckCircle2 className="w-4 h-4 text-brand flex-shrink-0" />}
              </button>
            ))}
          </div>
          {search && filteredCities.length > 0 && (
            <p className="text-[11px] text-text-muted">{filteredCities.length} ville{filteredCities.length > 1 ? 's' : ''} trouvée{filteredCities.length > 1 ? 's' : ''}</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSaveCity}
              disabled={saving || selectedCity === lockedCityId}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[13px] transition-all',
                saving || selectedCity === lockedCityId
                  ? 'bg-bg-elevated text-text-muted cursor-not-allowed'
                  : 'bg-brand text-black hover:bg-brand/90 shadow-glow',
              )}
            >
              {saving  && <Loader2     className="w-3.5 h-3.5 animate-spin" />}
              {saved   && <CheckCircle2 className="w-3.5 h-3.5" />}
              {saved ? 'Ville enregistrée !' : 'Enregistrer cette ville'}
            </button>
            {selectedCity === lockedCityId && !saving && (
              <span className="text-[12px] text-text-muted">Déjà votre ville actuelle</span>
            )}
          </div>
        </div>
      </section>

      {/* Sign out */}
      <section className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-bold text-text-primary">Déconnexion</p>
            <p className="text-[12px] text-text-muted mt-0.5">Vous serez redirigé vers la page de connexion</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all text-[13px] font-bold disabled:opacity-50 shrink-0 group"
          >
            {signingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />}
            Se déconnecter
          </button>
        </div>
      </section>
    </main>
  )
}
