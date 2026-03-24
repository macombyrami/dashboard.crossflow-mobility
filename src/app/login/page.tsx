'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Zap, Mail, Lock, Loader2, ArrowRight, Github } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'auth-code-error') {
      setMessage({ type: 'error', text: 'Échec de la validation de la session. Veuillez réessayer.' })
    }
  }, [searchParams])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        setMessage({ type: 'success', text: 'Vérifiez votre boîte mail pour confirmer votre inscription !' })
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        // Full page reload so the server-side middleware sees the new session cookie
        window.location.href = '/map'
        return
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Une erreur est survenue' })
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider: 'github' | 'google') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <>
      {/* Auth Card */}
      <div className="glass-card p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
        
        <div className="mb-6">
          <h2 className="heading-2 mb-1">{isSignUp ? 'Créer un compte' : 'Bienvenue'}</h2>
          <p className="text-text-secondary text-sm">
            {isSignUp ? 'Rejoignez la plateforme CrossFlow' : 'Connectez-vous pour accéder au dashboard'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="label ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-brand transition-colors" />
              <input
                type="email"
                required
                placeholder="nom@entreprise.com"
                className="w-full bg-bg-elevated border border-bg-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-brand/50 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="label ml-1">Mot de passe</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-brand transition-colors" />
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full bg-bg-elevated border border-bg-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-brand/50 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {message && (
            <div className={`text-xs p-3 rounded-lg border flex items-start gap-2 animate-scale-in ${
              message.type === 'error' 
                ? 'bg-traffic-critical/10 border-traffic-critical/20 text-traffic-critical'
                : 'bg-brand/10 border-brand/20 text-brand'
            }`}>
              <div className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${message.type === 'error' ? 'bg-traffic-critical' : 'bg-brand'}`} />
              {message.text}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full btn btn-primary justify-center py-3 rounded-xl mt-2 group"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isSignUp ? 'S\'inscrire' : 'Se connecter'}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-bg-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#121318] px-2 text-text-muted">Ou continuer avec</span>
          </div>
        </div>

        {/* Social Auth */}
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => handleOAuth('github')}
            className="btn btn-ghost justify-center py-2.5 rounded-xl gap-3"
          >
            <Github className="w-4 h-4" />
            <span>GitHub</span>
          </button>
        </div>
      </div>

      {/* Footer Link */}
      <p className="text-center mt-6 text-sm text-text-secondary">
        {isSignUp ? 'Déjà un compte ?' : "Vous n'avez pas de compte ?"}
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="ml-1.5 text-brand hover:underline font-medium transition-all"
        >
          {isSignUp ? 'Se connecter' : "S'inscrire"}
        </button>
      </p>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/5 blur-[120px] rounded-full" />

      <div className="w-full max-w-[420px] animate-slide-up">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.3)] mb-4">
            <Zap className="w-8 h-8 text-black" strokeWidth={2.5} />
          </div>
          <h1 className="display text-center mb-1">CrossFlow</h1>
          <p className="text-text-secondary text-sm">Gestion intelligente de la mobilité urbaine</p>
        </div>

        <Suspense fallback={
          <div className="glass-card p-8 flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
