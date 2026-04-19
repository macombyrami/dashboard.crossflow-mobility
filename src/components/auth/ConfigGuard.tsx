'use client'
import React, { useEffect, useState } from 'react'
import { AlertCircle, Terminal, HardDrive, RefreshCcw, WifiOff } from 'lucide-react'
import { validateSupabaseConfig } from '@/lib/config/env'

/**
 * 🛰️ STAFF ENGINEER: ConfigGuard (V2 - Hardened)
 * 
 * Logic:
 * 1. Checks if Supabase env vars are missing/placeholder (via validateSupabaseConfig).
 * 2. Checks for the 'sb_config_error' cookie (set by Middleware Fix 3).
 * 3. Intercepts 'Failed to fetch' errors to show a Diagnostic Screen.
 */
export function ConfigGuard({ children }: { children: React.ReactNode }) {
  const [errorType, setErrorType] = useState<'config' | 'network' | null>(null)
  const [missingVars, setMissingVars] = useState<string[]>([])

  useEffect(() => {
    // 1. Initial State Check (Static Validation)
    const { isValid, missing } = validateSupabaseConfig()
    if (!isValid) {
      setErrorType('config')
      setMissingVars(missing)
      return
    }

    // 2. Middleware Signal Check
    if (document.cookie.includes('sb_config_error=true')) {
      setErrorType('config')
      return
    }

    // 3. Network Failure Interceptor (Transient Network Errors)
    const handleGlobalError = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || ''
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        // Only trigger for auth-related fetch failures
        if (event.reason?.stack?.includes('supabase')) {
          setErrorType('network')
          event.preventDefault()
        }
      }
    }

    window.addEventListener('unhandledrejection', handleGlobalError)
    return () => window.removeEventListener('unhandledrejection', handleGlobalError)
  }, [])

  if (!errorType) return <>{children}</>

  return (
    <div className="fixed inset-0 z-[9999] bg-[#030303] flex items-center justify-center p-6 text-white font-sans selection:bg-brand selection:text-black">
      <div className="max-w-xl w-full animate-in fade-in zoom-in duration-500">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shadow-glow-red">
            {errorType === 'config' ? <AlertCircle className="w-6 h-6 text-red-500" /> : <WifiOff className="w-6 h-6 text-yellow-500" />}
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight leading-none italic italic-bold">
               {errorType === 'config' ? 'INFRASTRUCTURE CRITICAL FAILURE' : 'SUPABASE CONNECTIVITY ERROR'}
            </h1>
            <p className="text-red-500/60 text-xs font-bold uppercase tracking-widest mt-1">
               Supabase Middleware: Diagnostic System
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <HardDrive className="w-24 h-24" />
           </div>

           <p className="text-sm text-white/80 leading-relaxed mb-6">
              {errorType === 'config' 
                ? "L'application a détecté une **configuration d'infrastructure incomplète**. Le Middleware a bloqué la requête pour prévenir une boucle infinie."
                : "La tentative de connexion à Supabase a échoué. Cela arrive généralement quand l'URL est un **placeholder** ou bloquée par la CSP."
              }
           </p>

           <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                 <Terminal className="w-5 h-5 text-brand shrink-0 mt-1" />
                 <div>
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-1">Root Cause</span>
                    <p className="text-xs font-bold font-mono text-brand">
                        {missingVars.length > 0 
                           ? `Variable(s) manquante(s) : ${missingVars.join(', ')}` 
                           : "Configuration Supabase invalide (Placeholder détecté)"}
                    </p>
                 </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                 <RefreshCcw className="w-5 h-5 text-white/40 shrink-0 mt-1" />
                 <div>
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-1">Resolution</span>
                    <ol className="text-xs text-white/60 space-y-2 list-decimal list-inside">
                       <li>Vérifiez vos variables d'environnement dans Vercel ou localement.</li>
                       <li>Vérifiez que le préfixe <code className="text-brand">NEXT_PUBLIC_</code> est présent.</li>
                       <li>Vérifiez que l'URL ne contient pas "placeholder".</li>
                    </ol>
                 </div>
              </div>
           </div>

           {/* Button */}
           <button 
             onClick={() => window.location.reload()}
             className="w-full mt-8 py-4 px-6 rounded-2xl bg-white text-black font-black uppercase tracking-tighter hover:bg-brand hover:shadow-brand-glow transition-all active:scale-95"
           >
              RE-TENTER LA SYNCHRONISATION
           </button>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-between items-center px-2">
           <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">CrossFlow v4.2 Resilience Engine</span>
           <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest">ERROR_CODE: {errorType?.toUpperCase()}</span>
        </div>
      </div>
    </div>
  )
}
