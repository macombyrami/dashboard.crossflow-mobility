import { HeroSection }    from './landing/hero-experience'
import { FeaturesGrid }   from './landing/features-grid'
import { ImpactMetrics }  from './landing/impact-metrics'
import { CTAFinal }       from './landing/cta-final'

/**
 * 🛰️ Redesigned Elite Landing Experience (One-Pager v4.0)
 * ✅ Responsive: Mobile-first layout, accessible nav
 * ✅ A11y: Skip link, semantic landmarks, aria-labels
 */
export default function LandingPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#030303] text-white selection:bg-brand/30 overflow-x-hidden">
      
      {/* Skip to main content — keyboard/screen reader navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:bg-brand focus:text-black focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold focus:text-sm"
      >
        Aller au contenu principal
      </a>

      {/* Global atmospheric overlay */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand/[0.02] to-transparent" />
      </div>

      <main id="main-content" className="relative z-10 flex flex-col items-center">

        {/* ─── Navigation Bar ─── */}
        <nav
          className="fixed top-0 left-0 right-0 z-[100] h-16 md:h-20 flex items-center"
          aria-label="Navigation principale"
        >
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between backdrop-blur-md">
            {/* Wordmark */}
            <div
              className="text-lg md:text-xl font-black uppercase tracking-tighter italic cursor-pointer"
              aria-label="CrossFlow Mobility — Retour à l'accueil"
            >
              CROSS<span className="text-brand">FLOW</span>
            </div>

            {/* Desktop nav links */}
            <div className="flex items-center gap-4 sm:gap-6">
              <button
                className="hidden md:block text-[10px] font-black uppercase tracking-[0.3em] text-text-muted hover:text-white transition-all py-2"
                aria-label="Découvrir le produit"
              >
                PRODUIT
              </button>
              <button
                className="hidden md:block text-[10px] font-black uppercase tracking-[0.3em] text-text-muted hover:text-white transition-all py-2"
                aria-label="Voir les métropoles partenaires"
              >
                MÉTROPOLES
              </button>
              {/* ─── Accès Interne CTA — min 44px touch target ─── */}
              <a
                href="/login"
                className="min-h-[44px] min-w-[44px] inline-flex items-center px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all whitespace-nowrap"
                aria-label="Accéder à l'espace interne — connexion"
              >
                ACCÈS INTERNE
              </a>
            </div>
          </div>
        </nav>

        <HeroSection />

        <div className="w-full bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
           <FeaturesGrid />
        </div>

        <ImpactMetrics />

        <CTAFinal />

        {/* Footer */}
        <footer className="w-full py-12 md:py-20 border-t border-white/5 mt-12 md:mt-20 bg-black/40 backdrop-blur-3xl">
           <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-10 text-center md:text-left">
              <div className="text-sm font-black uppercase tracking-tighter italic">
                 CROSS<span className="text-brand">FLOW</span> MOBILITY &copy; 2026
              </div>
              <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-[9px] font-black uppercase tracking-[0.4em] text-text-muted">
                 <span className="cursor-pointer hover:text-white transition-colors">MENTIONS LÉGALES</span>
                 <span className="cursor-pointer hover:text-white transition-colors">PRIVACY</span>
                 <span className="cursor-pointer hover:text-white transition-colors">SOUVERAINETÉ</span>
              </div>
              <div className="text-[9px] font-black uppercase tracking-[0.4em] text-brand/60 italic">
                 SYSTÈME OPÉRATIONNEL : ACTIF
              </div>
           </div>
        </footer>
      </main>
    </div>
  )
}
