'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  User, 
  MapPin, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  ShieldCheck, 
  Activity, 
  BarChart3, 
  LayoutDashboard,
  Loader2,
  Sparkles
} from 'lucide-react'
import { CITIES } from '@/config/cities.config'
import { cn } from '@/lib/utils/cn'
import Image from 'next/image'

type Step = 'role' | 'city' | 'activation'

const ROLES = [
  { id: 'operator', title: 'Opérateur Trafic', desc: 'Gestion en temps réel et incidents', icon: Activity },
  { id: 'analyst',  title: 'Analyste Mobilité', desc: 'Études d\'impact et planification', icon: BarChart3 },
  { id: 'director',  title: 'Décideur Public', desc: 'KPIs stratégiques et vision globale', icon: LayoutDashboard },
]

export default function OnboardingClient() {
  const [step, setStep]           = useState<Step>('role')
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // 🛰️ Staff Engineer: Step Transition Logic
  const nextStep = () => {
    if (step === 'role') setStep('city')
    else if (step === 'city') setStep('activation')
  }

  const prevStep = () => {
    if (step === 'city') setStep('role')
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      // Update metadata to mark onboarding as done
      const { error } = await supabase.auth.updateUser({
        data: { 
          default_city: selectedCity,
          role: selectedRole,
          onboarding_completed: true 
        }
      })

      if (error) throw error
      
      // Redirect to dashboard with a slight delay for "Success" feel
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err) {
      console.error('[Onboarding] Completion failed:', err)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand/0 via-brand to-brand/0 opacity-30" />
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand/5 blur-[120px] rounded-full animate-pulse-slow" />
      
      <div className="w-full max-w-2xl z-10">
        {/* Progress Bar */}
        <div className="flex gap-2 mb-12 px-1">
          {(['role', 'city', 'activation'] as Step[]).map((s, idx) => {
             const active = step === s
             const done = (step === 'city' && idx === 0) || (step === 'activation' && idx < 2)
             return (
               <div 
                 key={s} 
                 className={cn(
                   "h-1 flex-1 rounded-full transition-all duration-700",
                   active ? "bg-brand w-2/3" : done ? "bg-brand/40" : "bg-white/5"
                 )} 
               />
             )
          })}
        </div>

        <div className="glass-card p-10 relative overflow-hidden">
          {/* Content: ROLE */}
          {step === 'role' && (
            <div className="animate-slide-up">
              <header className="mb-8">
                <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-4">
                  <User className="w-6 h-6 text-brand" />
                </div>
                <h1 className="heading-1 mb-2">Bienvenue sur CrossFlow</h1>
                <p className="text-text-secondary">Pour personnaliser votre expérience, quel est votre profil d'utilisateur ?</p>
              </header>

              <div className="grid gap-4">
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRole(r.id)}
                    className={cn(
                      "flex items-center gap-4 p-5 rounded-2xl border text-left transition-all duration-300 group",
                      selectedRole === r.id 
                        ? "bg-brand/10 border-brand/40 ring-1 ring-brand/40" 
                        : "bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      selectedRole === r.id ? "bg-brand text-black" : "bg-white/5 text-text-muted group-hover:text-text-primary"
                    )}>
                      <r.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white text-base">{r.title}</p>
                      <p className="text-xs text-text-muted">{r.desc}</p>
                    </div>
                    {selectedRole === r.id && <CheckCircle2 className="w-5 h-5 text-brand animate-scale-in" />}
                  </button>
                ))}
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  disabled={!selectedRole}
                  onClick={nextStep}
                  className="btn btn-primary px-8 py-3 rounded-xl gap-2 disabled:opacity-40"
                >
                  Continuer
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Content: CITY */}
          {step === 'city' && (
            <div className="animate-slide-up">
              <button 
                onClick={prevStep}
                className="flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-6 text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Retour
              </button>
              
              <header className="mb-8">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-orange-500" />
                </div>
                <h1 className="heading-1 mb-2">Zone d'Administration</h1>
                <p className="text-text-secondary">Quelle zone géographique souhaitez-vous piloter prioritairement ?</p>
              </header>

              <div className="grid grid-cols-2 gap-3">
                {CITIES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCity(c.id)}
                    className={cn(
                      "flex flex-col gap-3 p-5 rounded-2xl border text-left transition-all duration-300 relative group",
                      selectedCity === c.id 
                        ? "bg-orange-500/10 border-orange-500/40 ring-1 ring-orange-500/40" 
                        : "bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{c.countryCode}</span>
                      {selectedCity === c.id && <CheckCircle2 className="w-4 h-4 text-orange-500 animate-scale-in" />}
                    </div>
                    <p className="font-bold text-white text-lg">{c.name}</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-tight">{(c as any).segmentsCount?.toLocaleString() || '---'} Segments détectés</p>
                  </button>
                ))}
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  disabled={!selectedCity}
                  onClick={nextStep}
                  className="btn btn-primary px-8 py-3 rounded-xl gap-2 bg-orange-500 hover:bg-orange-600 border-none disabled:opacity-40"
                >
                  Vérifier le Réseau
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Content: ACTIVATION */}
          {step === 'activation' && (
            <div className="animate-slide-up text-center py-4">
              <header className="mb-10">
                <div className="w-20 h-20 rounded-3xl bg-brand/5 border border-brand/10 flex items-center justify-center mb-6 mx-auto relative group">
                   <div className="absolute inset-0 bg-brand/10 blur-xl rounded-full animate-pulse group-hover:bg-brand/20 transition-all" />
                   <Sparkles className="w-10 h-10 text-brand relative animate-bounce-slow" />
                </div>
                <h1 className="heading-1 mb-2">Prêt pour le Décollage</h1>
                <p className="text-text-secondary max-w-sm mx-auto">
                  Votre espace de travail pour <strong>{CITIES.find(c => c.id === selectedCity)?.name}</strong> est configuré avec succès.
                </p>
              </header>

              <div className="space-y-4 max-w-sm mx-auto text-left mb-10">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                  <ShieldCheck className="w-5 h-5 text-brand" />
                  <span className="text-sm font-medium text-white/80">Accès sécurisé activé</span>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                  <Activity className="w-5 h-5 text-brand" />
                  <span className="text-sm font-medium text-white/80">Flux temps réel TomTom connecté</span>
                </div>
              </div>

              <button
                disabled={loading}
                onClick={handleComplete}
                className="w-full btn btn-primary py-4 rounded-2xl gap-3 text-lg group overflow-hidden relative"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 animate-loading-bar" />
                    <span>Accéder au Dashboard</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        
        {/* Footer info */}
        <div className="mt-8 flex items-center justify-center gap-6 opacity-30 select-none">
          <Image src="/logo-crossflow.png" alt="CrossFlow" width={24} height={24} className="w-5 h-5 grayscale" />
          <div className="w-px h-4 bg-white/20" />
          <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">SaaS Infrastructure v2.4</span>
        </div>
      </div>
    </div>
  )
}

function ArrowRight(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}
