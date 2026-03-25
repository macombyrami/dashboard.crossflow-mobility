'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, LayoutDashboard, AlertTriangle, Activity, Settings } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const TABS = [
  { href: '/map',        icon: Map,             label: 'Carte',     ariaLabel: 'Carte du trafic en temps réel' },
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Tableau',   ariaLabel: 'Tableau de bord et métriques' },
  { href: '/incidents',  icon: AlertTriangle,   label: 'Incidents', ariaLabel: 'Alertes et incidents actifs' },
  { href: '/transport',  icon: Activity,        label: 'Transport', ariaLabel: 'Réseau de transport en commun' },
  { href: '/settings',   icon: Settings,        label: 'Réglages',  ariaLabel: 'Paramètres et configuration' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navigation principale mobile"
      className="print-hidden lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-bg-border"
      style={{
        background:              'rgba(12,13,16,0.94)',
        backdropFilter:          'blur(24px) saturate(180%)',
        WebkitBackdropFilter:    'blur(24px) saturate(180%)',
        paddingBottom:           'max(env(safe-area-inset-bottom), 4px)',
        height:                  'calc(60px + max(env(safe-area-inset-bottom), 4px))',
      }}
    >
      <div className="flex h-[60px]" role="list">
        {TABS.map(({ href, icon: Icon, label, ariaLabel }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              role="listitem"
              aria-label={ariaLabel}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-inset rounded-lg',
              )}
            >
              <div className={cn(
                'relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200',
                active ? 'bg-brand/15' : '',
              )}>
                <Icon
                  className={cn(
                    'w-[22px] h-[22px] transition-all duration-200',
                    active ? 'text-brand' : 'text-text-muted',
                  )}
                  strokeWidth={active ? 2.25 : 1.75}
                  aria-hidden="true"
                />
              </div>
              <span className={cn(
                'text-[10px] leading-none transition-colors duration-200',
                active ? 'text-brand font-medium' : 'text-text-muted',
              )}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
