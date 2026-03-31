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
    console.error('[CrossFlow Error]', error)

    // Check for ChunkLoadError (Standard Next.js / Webpack / Turbopack chunk load failure)
    const isChunkError = 
      error.name === 'ChunkLoadError' || 
      error.message?.includes('Failed to load chunk') || 
      error.message?.includes('Loading chunk')

    if (isChunkError) {
      const now = Date.now()
      const lastReload = Number(sessionStorage.getItem('cf-last-chunk-reload') || '0')
      
      // Only auto-reload once every 30s to prevent refresh loops if server is really down
      if (now - lastReload > 30000) {
        sessionStorage.setItem('cf-last-chunk-reload', String(now))
        console.warn('[CrossFlow] ChunkLoadError detected. Re-syncing client with latest build...')
        // Short delay to let the UI update before refresh
        setTimeout(() => window.location.reload(), 1500)
      }
    }
  }, [error])

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-400" aria-hidden="true" />
      </div>

      <div className="space-y-2 max-w-sm">
        <h1 className="text-lg font-semibold text-text-primary">Une erreur s'est produite</h1>
        <p className="text-sm text-text-secondary leading-relaxed font-medium">
          {error.name === 'ChunkLoadError' || error.message?.includes('Failed to load chunk')
             ? 'Mise à jour de l\'application en cours...'
             : error.message?.includes('fetch')
             ? 'Impossible de charger les données. Vérifiez votre connexion internet.'
             : 'Un problème inattendu est survenu. Réessayez ou revenez à l\'accueil.'}
        </p>
        {error.digest && (
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
