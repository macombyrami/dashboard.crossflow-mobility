'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Map, LayoutDashboard, FlaskConical, AlertTriangle,
  Settings, ChevronRight, Zap, Train, TrendingUp, X
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { LiveIndicator } from '@/components/ui/LiveIndicator'
import { useUIStore } from '@/store/uiStore'
import { useTranslation } from '@/lib/hooks/useTranslation'

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const { isSidebarOpen, setSidebarOpen } = useUIStore()

  const NAV_ITEMS = [
    { href: '/map',        icon: Map,             label: t('nav.map') },
    { href: '/dashboard',  icon: LayoutDashboard, label: t('nav.dashboard') },
    { href: '/prediction', icon: TrendingUp,      label: t('nav.predictions') },
    { href: '/transport',  icon: Train,           label: t('nav.transport') },
    { href: '/simulation', icon: FlaskConical,    label: t('nav.simulation') },
    { href: '/incidents',  icon: AlertTriangle,   label: t('nav.incidents') },
  ]

  return (
    <>
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-4 left-4 w-[240px] flex-shrink-0 flex flex-col glass rounded-panel z-50 transition-all duration-500 ease-in-out lg:sticky lg:top-4 lg:translate-x-0 lg:h-[calc(100vh-32px)] shadow-apple",
        isSidebarOpen ? "translate-x-0" : "-translate-x-[calc(100%+16px)]"
      )}>
        {/* Logo & Close Button */}
        <div className="px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-apple bg-brand-green flex items-center justify-center flex-shrink-0 shadow-glow">
              <Zap className="w-5 h-5 text-bg-base" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white tracking-[0.2em] leading-none">CROSSFLOW</p>
              <p className="text-[9px] text-text-secondary tracking-[0.2em] mt-1.5 uppercase">MOBILITY</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-apple hover:bg-white/5 text-text-secondary hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live indicator (Subtle) */}
        <div className="px-6 py-3 opacity-80">
          <LiveIndicator />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3.5 px-4 py-3 rounded-apple text-[13px] font-medium transition-all duration-200 group relative',
                  active
                    ? 'text-brand-green bg-brand-green/10'
                    : 'text-text-secondary hover:text-white hover:bg-white/5',
                )}
              >
                {active && <div className="absolute left-1.5 w-1 h-4 bg-brand-green rounded-full shadow-glow" />}
                <Icon className={cn('w-[18px] h-[18px] flex-shrink-0 transition-colors', active ? 'text-brand-green' : 'text-text-muted group-hover:text-text-secondary')} />
                <span className={cn(active ? 'font-semibold' : 'font-medium')}>{label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-brand-green/40" />}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-4 pb-6 pt-4 space-y-2 border-t border-white/5 mt-auto">
          <Link
            href="/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3.5 px-4 py-3 rounded-apple text-[13px] font-medium text-text-secondary hover:text-white hover:bg-white/5 transition-all"
          >
            <Settings className="w-[18px] h-[18px] text-text-muted" />
            {t('common.settings')}
          </Link>
          <div className="px-2 pt-2">
            <div className="glass-light rounded-apple p-4 border border-white/5 shadow-inner">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] text-text-muted uppercase tracking-[0.15em] font-bold">Status</p>
                <div className="w-1.5 h-1.5 rounded-full bg-brand-green shadow-glow animate-pulse" />
              </div>
              <p className="text-xs font-bold text-brand-green mb-3">Enterprise v2.4</p>
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full w-4/5 rounded-full bg-brand-green opacity-40" />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
