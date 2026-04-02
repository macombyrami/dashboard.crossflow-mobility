'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CITIES } from '@/config/cities.config'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import {
  Zap, ArrowRight, MapPin, BarChart3, Brain, Layers,
  Car, CheckCircle2, ChevronRight, PenLine, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { LucideIcon } from 'lucide-react'
import onboardingData from '@/lib/data/onboarding.json'
import appData from '@/lib/data/app.json'
import { SmartCityBg } from '@/components/onboarding/SmartCityBg'

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  MapPin, Layers, PenLine, Brain, BarChart3, Car,
}

type Role = 'city_planner' | 'researcher' | 'operator' | 'other'
const ROLES = onboardingData.roles as { id: Role; label: string; emoji: string; desc: string }[]
const FEATURES = onboardingData.features.map(f => ({
  ...f,
  icon: ICON_MAP[f.iconName],
}))

export default function OnboardingPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [step,      setStep]      = useState(0)
  const [name,      setName]      = useState('')
  const [role,      setRole]      = useState<Role | null>(null)
  const [cityId,    setCityId]    = useState(onboardingData.defaultCityId)
  const [loading,   setLoading]   = useState(false)

  const selectedCity = CITIES.find(c => c.id === cityId) ?? CITIES[0]

  const variants: Variants = {
    initial: { opacity: 0, x: 20 },
    enter:   { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
    exit:    { opacity: 0, x: -20, transition: { duration: 0.3, ease: 'easeIn' } }
  }

  const handleNext = async () => {
    if (step < 3) { setStep(s => s + 1); return }
    setLoading(true)
    try {
      await supabase.auth.updateUser({
        data: { onboarding_completed: true, display_name: name.trim(), role, default_city: cityId },
      })
      setTimeout(() => router.push('/map'), 800)
    } catch (err) {
      console.error('Onboarding error:', err)
      router.push('/map')
    }
  }

  const canNext = () => {
    if (step === 0) return name.trim().length > 2 && role !== null
    return true
  }

  return (
    <div className="min-h-screen bg-[#070809] flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden selection:bg-brand/30">
      <SmartCityBg />

      <div className="w-full max-w-3xl relative z-10">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-12"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-green flex items-center justify-center shadow-glow-sm">
              <Zap className="w-6 h-6 text-black" strokeWidth={3} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-text-primary tracking-tighter leading-none">{appData.name}</span>
              <span className="text-[10px] font-bold text-brand uppercase tracking-[0.2em] mt-1 italic">Intelligence Mobilité</span>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-6">
            {onboardingData.steps.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-700",
                  i <= step ? "bg-brand scale-125 shadow-glow" : "bg-white/10"
                )} />
                {i === step && (
                  <span className="text-[10px] whitespace-nowrap font-black uppercase text-brand tracking-widest animate-fade-in">{label}</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Content Box */}
        <div className="relative group">
          <div className="absolute inset-0 bg-white/[0.01] blur-2xl rounded-[40px] -z-10 group-hover:bg-brand/5 transition-colors duration-1000" />
          
          <div className="glass-premium border border-white/5 rounded-[40px] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={variants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="min-h-[420px] flex flex-col"
              >
                {step === 0 && (
                  <div className="space-y-12">
                    <div className="space-y-4">
                      <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter leading-[0.95]">
                        Prêt à transformer <br/><span className="text-brand">la ville ?</span>
                      </h1>
                      <p className="text-[16px] text-text-secondary leading-relaxed max-w-xl font-medium">
                        {onboardingData.copy.welcomeDesc}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                      <div className="lg:col-span-2 space-y-4">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted italic">Identité</label>
                        <input
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Sophie"
                          className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-5 text-xl font-bold text-text-primary placeholder:text-white/10 focus:border-brand/40 focus:bg-white/[0.06] transition-all outline-none"
                        />
                      </div>
                      <div className="lg:col-span-3 space-y-4">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted italic">Mission</label>
                        <div className="grid grid-cols-2 gap-3">
                          {ROLES.map(r => (
                            <button
                              key={r.id}
                              onClick={() => setRole(r.id)}
                              className={cn(
                                "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left",
                                role === r.id ? "bg-brand/10 border-brand/50 shadow-glow-sm" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                              )}
                            >
                              <span className="text-2xl">{r.emoji}</span>
                              <span className={cn("text-[13px] font-black leading-tight", role === r.id ? "text-brand" : "text-text-primary")}>{r.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-10">
                    <div className="space-y-4">
                      <h2 className="text-4xl font-black text-white tracking-tighter">Choisissez votre <span className="text-brand">bastion</span>.</h2>
                      <p className="text-text-secondary font-medium">Configurez CrossFlow pour votre métropole principale.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                      {CITIES.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setCityId(c.id)}
                          className={cn(
                            "flex items-center justify-between p-6 rounded-3xl border transition-all",
                            cityId === c.id ? "bg-brand/10 border-brand/50 shadow-glow-sm" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                          )}
                        >
                          <div className="flex items-center gap-5">
                            <span className="text-3xl filter saturate-[1.25]">{c.flag}</span>
                            <div className="flex flex-col">
                              <span className={cn("text-lg font-black tracking-tight", cityId === c.id ? "text-brand" : "text-text-primary")}>{c.name}</span>
                              <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.1em]">{c.country}</span>
                            </div>
                          </div>
                          {cityId === c.id && <CheckCircle2 className="w-5 h-5 text-brand" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-10">
                    <div className="space-y-4">
                      <h2 className="text-4xl font-black text-white tracking-tighter text-center italic">Arsenal Analytique.</h2>
                      <p className="text-text-secondary font-medium text-center max-w-md mx-auto">Découvrez les outils à votre disposition pour dominer les flux urbains.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {FEATURES.map((f, i) => (
                        <div key={i} className="p-5 rounded-3xl border border-white/5 bg-white/[0.02] space-y-4 hover:bg-white/[0.04] transition-colors group">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${f.color}15`, border: `1px solid ${f.color}30` }}>
                            <f.icon className="w-5 h-5" style={{ color: f.color }} />
                          </div>
                          <div>
                            <span className="text-[13px] font-black text-white tracking-tight block">{f.title}</span>
                            <p className="text-[11px] text-text-muted font-medium mt-1 leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity uppercase">{f.desc.slice(0, 45)}...</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-12">
                    <div className="relative">
                      <div className="absolute inset-0 bg-brand blur-3xl opacity-20 animate-pulse" />
                      <div className="w-24 h-24 rounded-[32px] bg-brand/10 border border-brand/30 flex items-center justify-center relative z-10 rotate-12">
                        <Sparkles className="w-12 h-12 text-brand" strokeWidth={2} />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tighter leading-none italic uppercase">Initialisation.</h2>
                      <p className="text-lg font-bold text-text-muted tracking-tight">Bonjour {name}, le centre opérationnel de <span className="text-brand">{selectedCity.name}</span> est prêt.</p>
                    </div>

                    <div className="flex items-center gap-6 pt-4">
                       <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-brand uppercase tracking-[0.2em] mb-2">Statut</span>
                          <span className="text-xs font-bold text-white px-3 py-1 bg-white/5 rounded-full border border-white/10 uppercase tracking-tighter italic">Live Ready</span>
                       </div>
                       <div className="w-[1px] h-8 bg-white/10" />
                       <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-brand uppercase tracking-[0.2em] mb-2">Region</span>
                          <span className="text-xs font-bold text-white px-3 py-1 bg-white/5 rounded-full border border-white/10 uppercase tracking-tighter italic">{selectedCity.flag} {selectedCity.name}</span>
                       </div>
                    </div>
                  </div>
                )}

                <div className="flex-1" />

                {/* Footer / CTA */}
                <div className="flex items-center justify-between pt-10 border-t border-white/5">
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className={cn("h-1 rounded-full transition-all duration-500", i === step ? "w-8 bg-brand shadow-glow-sm" : "w-1.5 bg-white/10")} />
                    ))}
                  </div>

                  <button
                    onClick={handleNext}
                    disabled={!canNext() || loading}
                    className={cn(
                      "px-8 py-4 rounded-2xl font-black text-[14px] uppercase tracking-widest flex items-center gap-3 transition-all",
                      canNext() && !loading ? "bg-brand text-black shadow-glow hover:scale-105 active:scale-95" : "bg-white/5 text-white/20 cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : step === 3 ? (
                      <>Lancer le centre opérationnel <ArrowRight className="w-5 h-5" /></>
                    ) : (
                      <>Suivant <ArrowRight className="w-5 h-5" /></>
                    )}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <p className="text-center mt-8 text-[10px] font-bold text-text-muted uppercase tracking-[0.4em] italic opacity-40">CrossFlow Intelligence Network — v1.0.0</p>
      </div>
    </div>
  )
}

function RefreshCw(props: any) {
  return (
    <svg 
      {...props} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}
