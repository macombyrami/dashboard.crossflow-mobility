'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogIn, Mail, Lock, Loader2, Compass } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  const handleDemoAccess = async () => {
    // For demo purposes, we can have a pre-filled demo account or just skip
    // but here we implement real auth.
    setEmail('demo@crossflow.ai')
    setPassword('demo1234')
  }

  return (
    <div className="min-h-screen bg-[#08090B] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-green/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      
      {/* Logo Section */}
      <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-16 h-16 bg-brand-green-dim border border-brand-green/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow">
          <Compass className="w-9 h-9 text-brand-green" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">CrossFlow Mobility</h1>
        <p className="text-text-secondary mt-2 font-medium">Intelligence Urbaine & Flux Temps Réel</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[400px] glass-dark border border-white/10 rounded-[28px] p-8 shadow-apple-xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] ml-1">
              Email Professionnel
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-brand-green transition-colors" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@entreprise.com"
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-brand-green/40 focus:bg-white/10 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] ml-1">
              Mot de passe
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-brand-green transition-colors" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-brand-green/40 focus:bg-white/10 transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs py-3 px-4 rounded-xl animate-in fade-in zoom-in-95">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-green hover:bg-brand-green-light text-[#08090B] font-bold py-4 rounded-2xl transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                Accéder au Dashboard
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <button 
                onClick={handleDemoAccess}
                className="text-xs text-text-muted hover:text-white transition-colors"
            >
                Utiliser le compte de démonstration
            </button>
        </div>
      </div>

      <p className="mt-12 text-[11px] text-text-muted font-medium uppercase tracking-[0.2em] opacity-40">
        Enterprise Level · Security v2.4
      </p>
    </div>
  )
}
