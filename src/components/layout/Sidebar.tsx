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
        "fixed inset-y-0 left-0 w-[240px] flex-shrink-0 flex flex-col bg-bg-surface border-r border-bg-border h-screen z-50 transition-transform duration-300 lg:sticky lg:top-0 lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo & Close Button */}
        <div className="px-5 py-5 border-b border-bg-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-green flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-bg-base" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary tracking-wider">CROSSFLOW</p>
              <p className="text-[10px] text-text-muted tracking-widest">MOBILITY</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-bg-elevated text-text-muted hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live indicator */}
        <div className="px-5 py-3 border-b border-bg-border">
          <LiveIndicator />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  active
                    ? 'bg-brand-green-dim text-brand-green'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated',
                )}
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-brand-green' : 'text-text-muted group-hover:text-text-secondary')} />
                {label}
                {active && <ChevronRight className="w-3 h-3 ml-auto text-brand-green opacity-60" />}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 space-y-1 border-t border-bg-border pt-4">
          <Link
            href="/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all"
          >
            <Settings className="w-4 h-4 text-text-muted" />
            {t('common.settings')}
          </Link>
          <div className="px-3 pt-2">
            <div className="bg-bg-elevated rounded-lg p-3 border border-bg-border">
              <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Plan</p>
              <p className="text-xs font-semibold text-brand-green">Enterprise</p>
              <div className="mt-2 h-1 rounded-full bg-bg-subtle overflow-hidden">
                <div className="h-full w-3/4 rounded-full bg-brand-green opacity-60" />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
