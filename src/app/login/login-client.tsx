'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { validateSupabaseConfig } from '@/lib/config/env'
import { getAuthCallbackUrl } from '@/lib/utils/url'
import { Zap, Mail, Lock, Loader2, ArrowRight, Eye, EyeOff, ShieldCheck, Server, AlertTriangle, Clock } from 'lucide-react'
import appData from '@/lib/data/app.json'
import Image from 'next/image'
import { cn } from '@/lib/utils/cn'
import { installAuthSessionGuard, loginCircuitBreaker } from '@/lib/supabase/authGuard'

function LoginForm() {
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [isSignUp,        setIsSignUp]        = useState(false)
  const [message,         setMessage]         = useState<{ type: 'error' | 'success' | 'degraded'; text: string } | null>(null)
  const [circuitCooldown, setCircuitCooldown] = useState(0) // seconds remaining
  const cooldownRef = useRef<NodeJS.Timeout | null>(null)

  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  // ─── Solution 1: TOKEN_REFRESH_FAILED loop breaker ─────────────────────
  useEffect(() => {
    const cleanup = installAuthSessionGuard(supabase)
    return cleanup
  }, []) // eslint-disable-line

  useEffect(() => {
    const error  = searchParams.get('error')
    const reason = searchParams.get('reason')

    if (error === 'auth-code-error') {
      setMessage({ type: 'error', text: 'Échec de la validation de la session. Veuillez réessayer.' })
    }
    if (reason === 'session_expired') {
      setMessage({ type: 'error', text: 'Votre session a expiré. Reconnectez-vous pour continuer.' })
    }
  }, [searchParams])

  // Cooldown ticker for circuit breaker UI
  useEffect(() => {
    if (circuitCooldown <= 0) return
    cooldownRef.current = setInterval(() => {
      const remaining = loginCircuitBreaker.cooldownRemaining
      setCircuitCooldown(remaining)
      if (remaining <= 0) clearInterval(cooldownRef.current!)
    }, 1000)
    return () => clearInterval(cooldownRef.current!)
  }, [circuitCooldown])

  // Reset form when switching between login / signup
  useEffect(() => {
    setMessage(null)
    setConfirmPassword('')
    setShowPassword(false)
  }, [isSignUp])

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Entrez votre adresse email pour recevoir un lien de réinitialisation.' })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
    })
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Email de réinitialisation envoyé. Vérifiez votre boîte mail.' })
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // 🛰️ Solution 2: Circuit Breaker — block retries after 2 failures
    if (loginCircuitBreaker.isOpen) {
      const remaining = loginCircuitBreaker.cooldownRemaining
      setCircuitCooldown(remaining)
      setMessage({
        type: 'degraded',
        text: `Service temporairement indisponible. Réessayez dans ${remaining} seconde${remaining > 1 ? 's' : ''}.`,
      })
      setLoading(false)
      return
    }

    // 🛰️ Infrastructure Guard
    const { isValid, missing } = validateSupabaseConfig()
    if (!isValid) {
      setMessage({ 
        type: 'error', 
        text: `Configuration système incomplète (${missing.join(', ')}). Vérifiez vos variables d'environnement.` 
      })
      setLoading(false)
      return
    }

    // Client-side validation for signup
    if (isSignUp && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' })
      setLoading(false)
      return
    }
    if (isSignUp && password.length < 8) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères.' })
      setLoading(false)
      return
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: getAuthCallbackUrl('/map') },
        })
        if (error) throw error
        loginCircuitBreaker.reset() // Success — reset circuit
        setMessage({ type: 'success', text: 'Vérifiez votre boîte mail pour confirmer votre inscription !' })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        loginCircuitBreaker.reset() // Success — reset circuit
        window.location.href = '/map'
        return
      }
    } catch (error: any) {
      // 🛰️ Solution 2: Record failure in circuit breaker
      const isNetworkError = error?.message?.includes('fetch') || error?.name === 'TypeError'
      const isServerError  = error?.status >= 500 || error?.message?.includes('unavailable')

      if (isNetworkError || isServerError) {
        loginCircuitBreaker.recordFailure()
      }

      // 🛰️ Solution 3: SaaS-grade UX — differentiate backend KO from user errors
      if (isNetworkError) {
        setMessage({
          type: 'degraded',
          text: 'Service temporairement indisponible. Vérifiez votre connexion et réessayez dans quelques instants.',
        })
        setCircuitCooldown(loginCircuitBreaker.cooldownRemaining)
        setLoading(false)
        return
      }

      // Humanize common Supabase error messages
      const msg: Record<string, string> = {
        'Invalid login credentials': 'Email ou mot de passe incorrect.',
        'Email not confirmed':        'Confirmez votre email avant de vous connecter.',
        'User already registered':   'Un compte existe déjà avec cet email.',
        'Too Many Requests':         'Trop de tentatives. Patientez quelques instants.',
      }
      setMessage({ type: 'error', text: msg[error.message] ?? error.message ?? 'Une erreur est survenue.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card p-8 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
      
      {/* 💎 Phase 10: Rarity & Social Proof Banner */}
      <div className="mb-8 p-3 rounded-xl bg-brand/5 border border-brand/10 flex items-center gap-3 animate-pulse-slow">
        <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-brand" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black text-brand uppercase tracking-widest leading-none mb-1 italic">Accès Prioritaire IDF</p>
          <p className="text-[9px] font-bold text-text-muted uppercase tracking-tight">Postes de commande & Collectivités partenaires</p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="heading-2 mb-1">{isSignUp ? 'Créer un compte' : 'Bienvenue'}</h2>
        <p className="text-text-secondary text-sm">
          {isSignUp ? `Rejoignez la plateforme ${appData.name}` : 'Connectez-vous pour accéder au dashboard'}
        </p>
      </div>

      <form onSubmit={handleAuth} className="space-y-4" noValidate>
        {/* Email */}
        <div className="space-y-1.5 flex flex-col">
          <label htmlFor="email" className="label ml-1 cursor-pointer">
            Adresse Email <span className="text-traffic-critical">*</span>
          </label>
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-brand transition-colors" aria-hidden="true" />
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="votre-nom@ville-partenaire.fr"
              className="w-full bg-bg-elevated border border-bg-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-required="true"
              aria-label="Saisissez votre adresse email"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5 flex flex-col">
          <div className="flex items-center justify-between ml-1">
            <label htmlFor="password" className="label cursor-pointer">
              Mot de passe <span className="text-traffic-critical">*</span>
            </label>
            {!isSignUp && (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-[11px] font-bold text-brand hover:text-brand-light transition-colors disabled:opacity-50 underline underline-offset-2"
                aria-label="Mot de passe oublié ? Récupérez votre accès par email."
              >
                Mot de passe oublié ?
              </button>
            )}
          </div>
          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-brand transition-colors" aria-hidden="true" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              className="w-full bg-bg-elevated border border-bg-border rounded-xl py-2.5 pl-10 pr-11 text-sm focus:outline-none focus:border-brand/50 transition-all font-mono"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-required="true"
              aria-label="Votre mot de passe"
              minLength={isSignUp ? 8 : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-1 rounded"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {isSignUp && password && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-1 flex-1 rounded-full bg-white/5 transition-colors",
                      password.length >= i * 2 ? (password.length > 10 ? "bg-brand" : "bg-orange-500") : ""
                    )} 
                  />
                ))}
              </div>
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-tight">
                Force : {password.length > 10 ? "Excellent" : password.length > 7 ? "Acceptable" : "Trop court"}
              </p>
            </div>
          )}
        </div>

        {/* Confirm password (signup only) */}
        {isSignUp && (
          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="label ml-1">Confirmer le mot de passe</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-brand transition-colors" aria-hidden="true" />
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full bg-bg-elevated border border-bg-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-brand/50 transition-all"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-required="true"
              />
            </div>
          </div>
        )}

        {/* Error / Success / Degraded message */}
        {message && (
          <div
            role="alert"
            aria-live="assertive"
            className={cn(
              'text-xs p-3 rounded-lg border flex items-start gap-2.5 animate-scale-in',
              message.type === 'error'    && 'bg-traffic-critical/10 border-traffic-critical/20 text-traffic-critical',
              message.type === 'success'  && 'bg-brand/10 border-brand/20 text-brand',
              message.type === 'degraded' && 'bg-amber-500/10 border-amber-500/20 text-amber-400',
            )}
          >
            {/* Icon */}
            {message.type === 'degraded' ? (
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
            ) : (
              <div className={cn(
                'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                message.type === 'error'   ? 'bg-traffic-critical' : 'bg-brand'
              )} />
            )}
            <div className="flex-1">
              {message.text}
              {/* Cooldown countdown for circuit breaker */}
              {message.type === 'degraded' && circuitCooldown > 0 && (
                <div className="flex items-center gap-1.5 mt-2 text-amber-500/70">
                  <Clock className="w-3 h-3" />
                  <span className="font-mono font-bold tabular-nums">{circuitCooldown}s</span>
                  <span>avant le prochain essai</span>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || loginCircuitBreaker.isOpen}
          className="w-full btn btn-primary justify-center py-3 rounded-xl mt-2 group disabled:opacity-60 disabled:cursor-not-allowed"
          aria-busy={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-label="Chargement…" />
          ) : loginCircuitBreaker.isOpen ? (
            <>
              <Clock className="w-4 h-4" aria-hidden="true" />
              <span>Patienter ({circuitCooldown}s)</span>
            </>
          ) : (
            <>
              <span>{isSignUp ? "S'inscrire" : 'Se connecter'}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <p className="text-center mt-5 text-sm text-text-secondary">
        {isSignUp ? 'Déjà un compte ?' : "Pas encore de compte ?"}
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="ml-1.5 text-brand hover:underline font-medium transition-all"
        >
          {isSignUp ? 'Se connecter' : "S'inscrire"}
        </button>
      </p>

      {/* Trust signals — Phase 7: Authorized Authority */}
      <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center text-center gap-2 group/tip">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover/tip:bg-brand/10 transition-colors">
            <ShieldCheck className="w-3.5 h-3.5 text-text-muted group-hover/tip:text-brand" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest text-text-muted group-hover/tip:text-text-primary">SSL / TLS 1.3</span>
        </div>
        <div className="flex flex-col items-center text-center gap-2 group/tip">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover/tip:bg-brand/10 transition-colors">
            <Lock className="w-3.5 h-3.5 text-text-muted group-hover/tip:text-brand" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest text-text-muted group-hover/tip:text-text-primary">RGPD Compliance</span>
        </div>
        <div className="flex flex-col items-center text-center gap-2 group/tip">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover/tip:bg-brand/10 transition-colors">
            <Server className="w-3.5 h-3.5 text-text-muted group-hover/tip:text-brand" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest text-text-muted group-hover/tip:text-text-primary">Data Hosting EU</span>
        </div>
      </div>
    </div>
  )
}

export default function LoginPageClient() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    // Reduced from 2600ms — every 100ms = ~1% additional bounce rate
    const timer = setTimeout(() => setShowSplash(false), 800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4 relative overflow-hidden">
      {/* Skip to form — accessibility */}
      <a
        href="#login-form"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[999] focus:bg-brand focus:text-black focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold"
      >
        Aller au formulaire
      </a>

      {/* Top-Left Logo — brand name is meaningful, image is decorative */}
      <div className="absolute top-8 left-8 flex items-center gap-3 animate-fade-in pointer-events-none select-none z-40">
        <Image
          src="/logo-crossflow.png"
          alt=""               
          aria-hidden="true"  
          width={32}
          height={32}
          className="w-8 h-8 object-contain"
        />
        <span className="text-sm font-bold tracking-tight text-text-primary uppercase opacity-90">
          {appData.name}
        </span>
      </div>

      {/* Splash Animation Overlay */}
      {showSplash && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-base animate-splash-bg" aria-hidden="true">
          <div className="relative">
            <div className="absolute inset-0 bg-brand/20 blur-[80px] animate-pulse" />
            <Image
              src="/logo-crossflow.png"
              alt="CrossFlow Mobility"
              width={160}
              height={160}
              className="relative w-40 h-40 object-contain animate-logo-splash"
              priority
            />
          </div>
        </div>
      )}

      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/5 blur-[120px] rounded-full" aria-hidden="true" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/5 blur-[120px] rounded-full" aria-hidden="true" />

      <div className="w-full max-w-[420px] animate-slide-up">
        {/* Logo Section */}
        <header className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.3)] mb-4 overflow-hidden">
            <Image src="/logo-crossflow.png" alt="" width={56} height={56} className="w-10 h-10 object-contain invert" aria-hidden="true" />
          </div>
          <h1 className="display text-center mb-1">{appData.name}</h1>
          <p className="text-text-secondary text-sm">{appData.description}</p>
        </header>

        <main id="login-form">
          <Suspense fallback={
            <div className="glass-card p-8 flex items-center justify-center min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-brand" aria-label="Chargement du formulaire…" />
            </div>
          }>
            <LoginForm />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
