'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, LayoutDashboard, TrendingUp, GitBranch, Activity } from 'lucide-react'

const TABS = [
  { href: '/map',        icon: Map,             label: 'Carte' },
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Tableau' },
  { href: '/prediction', icon: TrendingUp,      label: 'Prévisions' },
  { href: '/simulation', icon: GitBranch,       label: 'Simulation' },
  { href: '/transport',  icon: Activity,        label: 'Transport' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-bg-border"
      style={{
        background: 'rgba(12,13,16,0.92)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 4px)',
        height: 'calc(60px + max(env(safe-area-inset-bottom), 4px))',
      }}
    >
      <div className="flex h-[60px]">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-150 active:scale-95"
            >
              <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 ${active ? 'bg-brand/15' : ''}`}>
                <Icon
                  className={`w-[22px] h-[22px] transition-all duration-200 ${active ? 'text-brand' : 'text-text-muted'}`}
                  strokeWidth={active ? 2.25 : 1.75}
                />
              </div>
              <span className={`text-[10px] leading-none transition-colors duration-200 ${active ? 'text-brand font-medium' : 'text-text-muted'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
