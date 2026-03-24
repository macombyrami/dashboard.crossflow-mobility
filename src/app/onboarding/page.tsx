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
    <div className="space-y-10 animate-slide-up">
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Bienvenue sur CrossFlow</h1>
        <p className="text-[15px] font-medium text-text-secondary leading-relaxed">La plateforme de mobilité urbaine intelligente. Quelques secondes pour personnaliser votre expérience.</p>
      </div>

      <div className="space-y-3">
        <label className="text-[12px] font-bold uppercase tracking-[0.15em] text-text-muted">Votre prénom</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Sophie"
          className="w-full bg-white/5 border border-white/10 rounded-[14px] px-5 py-4 text-text-primary placeholder-text-muted outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/20 transition-all shadow-sm"
        />
      </div>

      <div className="space-y-4">
        <label className="text-[12px] font-bold uppercase tracking-[0.15em] text-text-muted">Votre profil</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ROLES.map(r => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className={cn(
                'flex items-start gap-4 p-5 rounded-[18px] border text-left transition-all duration-300 group',
                role === r.id
                  ? 'border-brand/40 bg-brand/10 shadow-glow-sm'
                  : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10 shadow-sm',
              )}
            >
              <span className="text-3xl leading-none grayscale group-hover:grayscale-0 transition-all duration-500 scale-95 group-hover:scale-105">{r.emoji}</span>
              <div>
                <p className={cn('text-[14px] font-bold tracking-tight', role === r.id ? 'text-brand' : 'text-text-primary')}>{r.label}</p>
                <p className="text-[11px] font-medium text-text-muted mt-1 leading-normal">{r.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // ─── Step 1 : City selection ────────────────────────────────────────────────

  const step1 = (
    <div className="space-y-8 animate-slide-up">
      <div className="space-y-3">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Votre ville principale</h2>
        <p className="text-[15px] font-medium text-text-secondary leading-relaxed">CrossFlow s'adapte à chaque ville. Choisissez celle que vous gérez ou analysez en priorité.</p>
      </div>

      <div className="grid gap-3 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
        {CITIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCityId(c.id)}
            className={cn(
              'flex items-center gap-5 p-5 rounded-[18px] border text-left transition-all duration-300 group shadow-sm',
              cityId === c.id
                ? 'border-brand/40 bg-brand/10 shadow-glow-sm'
                : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10',
            )}
          >
            <span className="text-3xl leading-none transition-transform group-hover:scale-110 duration-300">{c.flag}</span>
            <div className="flex-1">
              <p className={cn('text-[15px] font-bold tracking-tight', cityId === c.id ? 'text-brand' : 'text-text-primary')}>{c.name}</p>
              <p className="text-[11px] font-medium text-text-muted mt-0.5">{c.country} · {(c.population / 1_000_000).toFixed(1)}M hab.</p>
            </div>
            {cityId === c.id && (
              <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center shadow-glow animate-scale-in">
                <CheckCircle2 className="w-4 h-4 text-black" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )

  // ─── Step 2 : Features tour ─────────────────────────────────────────────────

  const step2 = (
    <div className="space-y-8 animate-slide-up">
      <div className="space-y-3">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Ce que vous pouvez faire</h2>
        <p className="text-[15px] font-medium text-text-secondary leading-relaxed">CrossFlow réunit trafic temps réel, IA prédictive et simulation en une seule interface.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className="p-5 rounded-[20px] border border-white/5 bg-white/5 space-y-3 hover:bg-white/10 transition-colors duration-300 group shadow-sm hover:shadow-apple-sm"
          >
            <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shadow-glow-sm" style={{ background: `${f.color}14`, border: `1px solid ${f.color}25` }}>
              <f.icon className="w-5 h-5 transition-transform group-hover:scale-110 duration-500" style={{ color: f.color }} />
            </div>
            <p className="text-[14px] font-bold text-white tracking-tight leading-tight">{f.title}</p>
            <p className="text-[11px] font-medium text-text-muted leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )

  // ─── Step 3 : Ready ──────────────────────────────────────────────────────────

  const step3 = (
    <div className="space-y-10 text-center animate-slide-up">
      <div className="relative inline-block">
        <div className="w-24 h-24 rounded-[24px] bg-brand/15 border border-brand/30 flex items-center justify-center mx-auto shadow-glow">
          <Zap className="w-12 h-12 text-brand animate-float" strokeWidth={2.5} />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-white tracking-tight">
          Tout est prêt{name ? `, ${name}` : ''} !
        </h2>
        <p className="text-[15px] font-medium text-text-secondary leading-relaxed max-w-md mx-auto">
          CrossFlow est configuré sur <span className="text-brand font-bold tracking-tight">{selectedCity.flag} {selectedCity.name}</span> —
          votre centre opérationnel principal.
        </p>
      </div>

      <div className="bg-white/5 border border-white/5 rounded-[20px] p-6 text-left space-y-4 shadow-sm backdrop-blur-md">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted">Résumé de configuration</p>
        <div className="grid grid-cols-2 gap-5 text-[14px]">
          {name  && <div className="space-y-1"><p className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Prénom</p><p className="text-white font-bold">{name}</p></div>}
          {role  && <div className="space-y-1"><p className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Profil</p><p className="text-white font-bold">{ROLES.find(r => r.id === role)?.label}</p></div>}
          <div className="space-y-1"><p className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Ville active</p><p className="text-white font-bold">{selectedCity.flag} {selectedCity.name}</p></div>
          <div className="space-y-1"><p className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Intelligence</p><p className="text-brand font-bold">HERE + TomTom Live</p></div>
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
      const { error } = await supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
          display_name: name.trim(),
          role,
          default_city: cityId,
        },
      })
      if (error) throw error
      
      // Delay slightly for visual feedback
      setTimeout(() => {
        router.push('/map')
      }, 500)
    } catch (err) {
      console.error('Onboarding update error:', err)
      // Fallback but log it
      router.push('/map')
    } finally {
      // Don't set loading false immediately to keep the spinner while redirecting
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-start sm:justify-center p-4 py-10 sm:py-4 overflow-y-auto">
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
        <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-2 custom-scrollbar">
          {steps.map((label, i) => (
            <div key={i} className="flex items-center gap-3 flex-shrink-0">
              <div className={cn(
                'flex items-center gap-2 transition-all duration-500',
                i === step ? 'opacity-100 scale-105' : i < step ? 'opacity-80' : 'opacity-30',
              )}>
                <div className={cn(
                  'w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] sm:text-[12px] font-bold transition-all duration-500 shadow-sm',
                  i < step  ? 'bg-brand text-black scale-90' :
                  i === step ? 'bg-brand/20 border border-brand/60 text-brand shadow-glow-sm' :
                  'bg-white/5 border border-white/5 text-text-muted',
                )}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={cn('text-[12px] sm:text-[13px] font-bold tracking-tight whitespace-nowrap', i === step ? 'text-white' : 'text-text-muted')}>{label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className="w-4 h-[1px] bg-white/10 hidden xs:block" />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="glass border border-white/10 rounded-[28px] p-8 sm:p-10 shadow-apple relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-[100px] pointer-events-none" />
          
          {step === 0 && step0}
          {step === 1 && step1}
          {step === 2 && step2}
          {step === 3 && step3}

          {/* CTA */}
          <div className="flex justify-end mt-12 relative z-10">
            <button
              onClick={handleNext}
              disabled={!canNext() || loading}
              className={cn(
                'flex items-center gap-2.5 px-8 py-4 rounded-[16px] font-bold text-[15px] transition-all duration-300 shadow-apple-sm',
                canNext() && !loading
                  ? 'bg-brand text-black hover:scale-[1.03] active:scale-[0.98] shadow-glow hover:shadow-glow-lg'
                  : 'bg-white/5 text-text-muted border border-white/5 cursor-not-allowed',
              )}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : step === 3 ? (
                <><Zap className="w-5 h-5 fill-black" /> Lancer CrossFlow</>
              ) : (
                <>Suivant <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </div>
        </div>

        {/* Étape obligatoire — pas de skip */}
      </div>
    </div>
  )
}
