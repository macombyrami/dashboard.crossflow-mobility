'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Map, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()
  return (
    <main
      role="main"
      className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-6"
    >
      <div className="space-y-1">
        <div className="text-[80px] font-bold text-white/5 leading-none select-none" aria-hidden="true">
          404
        </div>
        <h1 className="text-xl font-semibold text-text-primary -mt-4">Page introuvable</h1>
        <p className="text-sm text-text-secondary max-w-xs leading-relaxed mt-2">
          Cette page n'existe pas ou a été déplacée.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/map"
          aria-label="Retourner à la carte"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-black text-sm font-semibold hover:bg-brand/90 active:scale-95 transition-all"
        >
          <Map className="w-4 h-4" aria-hidden="true" />
          Aller à la carte
        </Link>
        <button
          onClick={() => router.back()}
          aria-label="Revenir à la page précédente"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-secondary text-sm font-medium hover:bg-white/10 hover:text-text-primary active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Retour
        </button>
      </div>
    </main>
  )
}
