'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Map, LayoutDashboard, TrendingUp, Activity,
  GitBranch, AlertTriangle, Settings, Zap,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/map',        icon: Map,             label: 'Carte',      description: 'Trafic temps réel' },
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Tableau',    description: 'Métriques & KPIs' },
  { href: '/prediction', icon: TrendingUp,      label: 'Prévisions', description: 'Modèle prédictif' },
  { href: '/simulation', icon: GitBranch,       label: 'Simulation', description: 'Scénarios' },
  { href: '/transport',  icon: Activity,        label: 'Transport',  description: 'Réseau TC' },
  { href: '/incidents',  icon: AlertTriangle,   label: 'Incidents',  description: 'Alertes actives' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-[200px] shrink-0 h-full border-r border-bg-border bg-bg-surface">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-[52px] border-b border-bg-border shrink-0">
        <div className="relative">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shadow-glow-sm">
            <Zap className="w-4 h-4 text-black" strokeWidth={2.5} />
          </div>
        </div>
        <div>
          <div className="text-[13px] font-bold text-text-primary tracking-tight leading-none">CrossFlow</div>
          <div className="text-[10px] text-text-muted mt-0.5 leading-none">Smart City</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        <div className="px-2 space-y-0.5">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                  transition-all duration-150 group relative
                  ${active
                    ? 'bg-brand/10 text-brand font-medium'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                  }
                `}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-brand rounded-r-full" />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 ${active ? 'text-brand' : 'text-text-muted group-hover:text-text-secondary'}`}
                  strokeWidth={active ? 2 : 1.75}
                />
                <span className="text-[13px] leading-none">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Settings */}
      <div className="px-2 pb-3 border-t border-bg-border pt-2">
        <Link
          href="/settings"
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
            transition-all duration-150 group
            ${pathname === '/settings'
              ? 'bg-brand/10 text-brand font-medium'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
            }
          `}
        >
          <Settings className="w-4 h-4 shrink-0 text-text-muted group-hover:text-text-secondary" strokeWidth={1.75} />
          <span className="text-[13px] leading-none">Réglages</span>
        </Link>
      </div>
    </aside>
  )
}
