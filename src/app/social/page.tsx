'use client'
import { SytadinFeed } from '@/components/simulation/SytadinFeed'
import { IdfNetworkStats } from '@/components/simulation/IdfNetworkStats'
import { Rss, ExternalLink, Twitter } from 'lucide-react'

export default function SocialPage() {
  return (
    <div className="flex flex-1 flex-col lg:flex-row h-full overflow-hidden">

      {/* ── Left: info + réseau IDF ── */}
      <div className="w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-bg-border flex flex-col max-h-[45vh] lg:max-h-full overflow-hidden">
        <div className="px-5 py-4 border-b border-bg-border flex items-center gap-2 shrink-0">
          <Rss className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-semibold text-text-primary">Social</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Sytadin profile card */}
          <div className="rounded-2xl border border-bg-border bg-bg-surface overflow-hidden">
            <div className="h-16 bg-gradient-to-r from-[#1DA1F2]/30 to-[#2979FF]/20" />
            <div className="px-4 pb-4 -mt-6">
              <div className="w-12 h-12 rounded-full bg-[#1DA1F2] flex items-center justify-center border-2 border-bg-base shadow-lg">
                <Twitter className="w-6 h-6 text-white" />
              </div>
              <div className="mt-2 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-text-primary">Sytadin</p>
                  <span className="text-[10px] bg-[#1DA1F2] text-white px-1.5 py-0.5 rounded-full font-semibold">
                    DiRIF
                  </span>
                </div>
                <p className="text-xs text-text-muted">@Sytadin</p>
              </div>
              <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                Informations trafic en temps réel sur les autoroutes et routes nationales d'Île-de-France. Données DiRIF / Cerema.
              </p>
              <a
                href="https://x.com/Sytadin"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 w-full border border-[#1DA1F2]/30 text-[#1DA1F2] text-xs font-semibold py-2 rounded-xl hover:bg-[#1DA1F2]/10 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Voir sur X / Twitter
              </a>
            </div>
          </div>

          {/* IDF network stats */}
          <IdfNetworkStats />
        </div>
      </div>

      {/* ── Right: live feed ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <SytadinFeed />
      </div>

    </div>
  )
}
