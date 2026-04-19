'use client'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Broad detection: look for chunk loading failures in name, message or string representation
    const errorStr = (error.message || '') + (error.stack || '') + error.toString()
    const isChunkError = 
      error.name === 'ChunkLoadError' || 
      /chunk|loading|failed to load/i.test(errorStr)

    if (isChunkError) {
      const now = Date.now()
      const lastReload = Number(sessionStorage.getItem('cf-last-chunk-reload') || '0')
      
      // Auto-reload but limit frequency to prevent infinite refresh if server is broken
      if (now - lastReload > 10000) {
        sessionStorage.setItem('cf-last-chunk-reload', String(now))
        console.warn('[CrossFlow] ChunkLoadError: Auto-refreshing to sync with latest build...')
        // 800ms is enough to let the UI update and user see the message
        setTimeout(() => window.location.reload(), 800)
      }
    }
  }, [error])

  const isChunkError = 
    error.name === 'ChunkLoadError' || 
    /chunk|loading|failed to load/i.test((error.message || '') + error.toString())

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        {isChunkError ? (
          <RefreshCw className="w-8 h-8 text-brand-green animate-spin shadow-glow-sm" aria-hidden="true" />
        ) : (
          <AlertTriangle className="w-8 h-8 text-red-100" aria-hidden="true" />
        )}
      </div>

      <div className="space-y-2 max-w-sm">
        <h1 className="text-lg font-semibold text-text-primary">
          {isChunkError ? 'Mise à jour requise' : 'Une erreur s\'est produite'}
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed font-medium">
          {isChunkError
             ? 'Nouvelle version détectée. Synchronisation en cours...'
             : error.message?.includes('fetch')
             ? 'Impossible de charger les données. Vérifiez votre connexion internet.'
             : 'Un problème inattendu est survenu. Réessayez ou revenez à l\'accueil.'}
        </p>
        {error.digest && !isChunkError && (
          <p className="text-[10px] font-mono text-text-muted mt-2">
            Code : {error.digest}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={reset}
          aria-label="Réessayer de charger la page"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-black text-sm font-semibold hover:bg-brand/90 active:scale-95 transition-all"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Réessayer
        </button>
        <Link
          href="/map"
          aria-label="Retourner à la carte principale"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-secondary text-sm font-medium hover:bg-white/10 hover:text-text-primary active:scale-95 transition-all"
        >
          <Home className="w-4 h-4" aria-hidden="true" />
          Accueil
        </Link>
      </div>
    </div>
  )
}
