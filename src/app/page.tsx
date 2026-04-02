import { HeroSection }    from '@/components/landing/hero-experience'
import { FeaturesGrid }   from '@/components/landing/features-grid'
import { ImpactMetrics }  from '@/components/landing/impact-metrics'
import { CTAFinal }       from '@/components/landing/cta-final'

/**
 * 🛰️ Redesigned Elite Landing Experience (One-Pager v4.0)
 * 
 * Flow:
 * 1. Hero (Impact + CTA)
 * 2. Features (Operational Sovereignty)
 * 3. Impact (Data-driven Proof)
 * 4. CTA Final (Conversion Hook)
 * 5. Trust Footer (Implicit with logos)
 */
export default function LandingPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#030303] text-white selection:bg-brand/30 overflow-x-hidden">
      
      {/* 🧩 GLOBAL ATMOSPHERIC OVERLAY */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand/2 to-transparent" />
      </div>

      <main className="relative z-10 flex flex-col items-center">
        {/* Navigation Bar (Floating/Sticky) */}
        <nav className="fixed top-0 left-0 right-0 h-20 z-[100] flex items-center justify-center pointer-events-none">
           <div className="w-full max-w-6xl px-6 flex items-center justify-between pointer-events-auto backdrop-blur-md">
              <div className="text-xl font-black uppercase tracking-tighter italic italic-bold italic-display group cursor-pointer">
                 CROSS<span className="text-brand group-hover:text-white transition-colors">FLOW</span>
              </div>
              <div className="flex items-center gap-6">
                 <button className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted hover:text-white transition-all hidden md:block">
                    PRODUIT
                 </button>
                 <button className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted hover:text-white transition-all hidden md:block">
                    MÉTROPOLES
                 </button>
                 <button className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all">
                    ACCÈS INTERNE
                 </button>
              </div>
           </div>
        </nav>

        <HeroSection />

        <div className="w-full bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
           <FeaturesGrid />
        </div>

        <ImpactMetrics />

        <CTAFinal />

        {/* Global Footer */}
        <footer className="w-full py-20 border-t border-white/5 text-center mt-20 bg-black/40 backdrop-blur-3xl">
           <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
              <div className="text-sm font-black uppercase tracking-tighter italic">
                 CROSS<span className="text-brand">FLOW</span> MOBILITY © 2026
              </div>
              <div className="flex gap-10 text-[9px] font-black uppercase tracking-[0.4em] text-text-muted">
                 <span>MENTIONS LÉGALES</span>
                 <span>PRIVACY</span>
                 <span>SOUVERAINETÉ</span>
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
