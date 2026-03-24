'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CITIES } from '@/config/cities.config'
import {
  Zap, ArrowRight, MapPin, BarChart3, Brain, Layers,
  Car, CheckCircle2, ChevronRight, PenLine,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'city_planner' | 'researcher' | 'operator' | 'other'

const ROLES: { id: Role; label: string; emoji: string; desc: string }[] = [
  { id: 'city_planner', label: 'Planificateur urbain',  emoji: '🏙️', desc: 'Gestion de la mobilité en ville' },
  { id: 'researcher',   label: 'Chercheur / Analyste',  emoji: '🔬', desc: 'Études de flux et données trafic' },
  { id: 'operator',     label: 'Opérateur transport',   emoji: '🚌', desc: 'Gestion de réseaux TC' },
  { id: 'other',        label: 'Autre / Curieux',       emoji: '🌍', desc: 'Je découvre CrossFlow' },
]

const FEATURES = [
  {
    icon:  MapPin,
    color: '#22C55E',
    title: 'Carte trafic temps réel',
    desc:  'Segments colorés sur les vraies rues avec données HERE & TomTom. Zoom, clic sur une route pour la vitesse instantanée.',
  },
  {
    icon:  Layers,
    color: '#3B82F6',
    title: '3 modes de heatmap',
    desc:  'Visualisez la congestion, le nombre de passages ou les émissions CO₂ par zone. Activez le calque Heatmap dans les contrôles.',
  },
  {
    icon:  PenLine,
    color: '#FACC15',
    title: 'Outil Zone',
    desc:  'Dessinez un polygone sur la carte et obtenez instantanément les stats agrégées : congestion, flux véhicules, CO₂ moyen.',
  },
  {
    icon:  Brain,
    color: '#A855F7',
    title: 'Prévisions IA +30 min',
    desc:  'Anticipez l\'évolution du trafic sur les 30 prochaines minutes. Passez en mode Prévision dans le sélecteur en haut.',
  },
  {
    icon:  BarChart3,
    color: '#F97316',
    title: 'Dashboard KPIs',
    desc:  'Météo réelle, qualité de l\'air, congestion globale, vitesse moyenne et modal split — tout en un coup d\'œil.',
  },
  {
    icon:  Car,
    color: '#EF4444',
    title: 'Simulation de scénarios',
    desc:  'Fermez une rue, ajoutez une piste cyclable ou réduisez la vitesse et mesurez l\'impact sur le réseau.',
  },
]

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [step,      setStep]      = useState(0) // 0=welcome, 1=city, 2=features, 3=done
  const [name,      setName]      = useState('')
  const [role,      setRole]      = useState<Role | null>(null)
  const [cityId,    setCityId]    = useState('paris')
  const [loading,   setLoading]   = useState(false)

  const selectedCity = CITIES.find(c => c.id === cityId) ?? CITIES[0]

  const steps = ['Bienvenue', 'Votre ville', 'Fonctionnalités', 'C\'est parti !']

  // ─── Step 0 : Welcome + name + role ────────────────────────────────────────

  const step0 = (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-text-primary">Bienvenue sur CrossFlow</h1>
        <p className="text-text-secondary">La plateforme de mobilité urbaine intelligente. Quelques secondes pour personnaliser votre expérience.</p>
      </div>

      <div className="space-y-2">
        <label className="text-[12px] font-bold uppercase tracking-wider text-text-muted">Votre prénom</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Sophie"
          className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted outline-none focus:border-brand-green/50 transition-colors"
        />
      </div>

      <div className="space-y-3">
        <label className="text-[12px] font-bold uppercase tracking-wider text-text-muted">Votre profil</label>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map(r => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className={cn(
                'flex items-start gap-3 p-4 rounded-xl border text-left transition-all',
                role === r.id
                  ? 'border-brand-green/60 bg-brand-green/10'
                  : 'border-bg-border bg-bg-elevated hover:border-bg-hover',
              )}
            >
              <span className="text-2xl leading-none mt-0.5">{r.emoji}</span>
              <div>
                <p className={cn('text-[13px] font-semibold', role === r.id ? 'text-brand-green' : 'text-text-primary')}>{r.label}</p>
                <p className="text-[11px] text-text-muted mt-0.5">{r.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // ─── Step 1 : City selection ────────────────────────────────────────────────

  const step1 = (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-text-primary">Votre ville principale</h2>
        <p className="text-text-secondary">CrossFlow s'adapte à chaque ville. Choisissez celle que vous gérez ou analysez en priorité.</p>
      </div>

      <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-1">
        {CITIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCityId(c.id)}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl border text-left transition-all',
              cityId === c.id
                ? 'border-brand-green/60 bg-brand-green/10'
                : 'border-bg-border bg-bg-elevated hover:border-bg-hover',
            )}
          >
            <span className="text-2xl leading-none">{c.flag}</span>
            <div className="flex-1">
              <p className={cn('text-[14px] font-semibold', cityId === c.id ? 'text-brand-green' : 'text-text-primary')}>{c.name}</p>
              <p className="text-[11px] text-text-muted">{c.country} · {(c.population / 1_000_000).toFixed(1)}M hab.</p>
            </div>
            {cityId === c.id && <CheckCircle2 className="w-5 h-5 text-brand-green flex-shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  )

  // ─── Step 2 : Features tour ─────────────────────────────────────────────────

  const step2 = (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-text-primary">Ce que vous pouvez faire</h2>
        <p className="text-text-secondary">CrossFlow réunit trafic temps réel, IA prédictive et simulation en une seule interface.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-bg-border bg-bg-elevated space-y-2"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}>
              <f.icon className="w-4 h-4" style={{ color: f.color }} />
            </div>
            <p className="text-[13px] font-semibold text-text-primary leading-tight">{f.title}</p>
            <p className="text-[11px] text-text-muted leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )

  // ─── Step 3 : Ready ──────────────────────────────────────────────────────────

  const step3 = (
    <div className="space-y-8 text-center">
      <div className="w-20 h-20 rounded-2xl bg-brand-green/15 border border-brand-green/30 flex items-center justify-center mx-auto">
        <Zap className="w-10 h-10 text-brand-green" strokeWidth={2} />
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-text-primary">
          Tout est prêt{name ? `, ${name}` : ''} !
        </h2>
        <p className="text-text-secondary">
          CrossFlow est configuré sur <span className="text-brand-green font-semibold">{selectedCity.flag} {selectedCity.name}</span>.
          Vous pouvez changer de ville à tout moment depuis la barre de recherche.
        </p>
      </div>

      <div className="bg-bg-elevated border border-bg-border rounded-xl p-5 text-left space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Vos paramètres</p>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          {name  && <div><span className="text-text-muted">Prénom :</span><span className="ml-2 text-text-primary font-medium">{name}</span></div>}
          {role  && <div><span className="text-text-muted">Profil :</span><span className="ml-2 text-text-primary font-medium">{ROLES.find(r => r.id === role)?.label}</span></div>}
          <div><span className="text-text-muted">Ville :</span><span className="ml-2 text-text-primary font-medium">{selectedCity.flag} {selectedCity.name}</span></div>
          <div><span className="text-text-muted">Données :</span><span className="ml-2 text-brand-green font-medium">HERE + TomTom Live</span></div>
        </div>
      </div>
    </div>
  )

  // ─── Navigation ──────────────────────────────────────────────────────────────

  const canNext = () => {
    if (step === 0) return name.trim().length > 0 && role !== null
    return true
  }

  const handleNext = async () => {
    if (step < 3) { setStep(s => s + 1); return }

    // Finalize: save to Supabase user metadata
    setLoading(true)
    try {
      await supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
          display_name: name.trim(),
          role,
          default_city: cityId,
        },
      })
      router.push('/map')
    } catch {
      router.push('/map')
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-green/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-2xl relative">

        {/* Header logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-brand-green flex items-center justify-center">
            <Zap className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold text-text-primary">CrossFlow</span>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                'flex items-center gap-1.5',
                i === step ? 'opacity-100' : i < step ? 'opacity-60' : 'opacity-30',
              )}>
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all',
                  i < step  ? 'bg-brand-green text-black' :
                  i === step ? 'bg-brand-green/20 border border-brand-green/60 text-brand-green' :
                  'bg-bg-elevated border border-bg-border text-text-muted',
                )}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={cn('text-[12px] font-medium hidden sm:block', i === step ? 'text-text-primary' : 'text-text-muted')}>{label}</span>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-text-muted/40 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-8 shadow-panel">
          {step === 0 && step0}
          {step === 1 && step1}
          {step === 2 && step2}
          {step === 3 && step3}

          {/* CTA */}
          <div className="flex justify-end mt-8">
            <button
              onClick={handleNext}
              disabled={!canNext() || loading}
              className={cn(
                'flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-[14px] transition-all',
                canNext() && !loading
                  ? 'bg-brand-green text-black hover:bg-brand-green/90 shadow-glow'
                  : 'bg-bg-elevated text-text-muted cursor-not-allowed',
              )}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : step === 3 ? (
                <><Zap className="w-4 h-4" /> Lancer CrossFlow</>
              ) : (
                <>Suivant <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>

        {/* Skip */}
        {step < 3 && (
          <div className="text-center mt-4">
            <button
              onClick={async () => {
                await supabase.auth.updateUser({ data: { onboarding_completed: true } })
                router.push('/map')
              }}
              className="text-[12px] text-text-muted hover:text-text-secondary transition-colors"
            >
              Passer l'onboarding →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
