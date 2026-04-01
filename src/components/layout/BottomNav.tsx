'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Map, TrendingUp, Cpu, AlertTriangle, Rss } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const TABS = [
  { href: '/map',        icon: Map,             label: 'Carte' },
  { href: '/prediction', icon: TrendingUp,      label: 'Prévisions' },
  { href: '/simulation', icon: Cpu,             label: 'Simulation' },
  { href: '/incidents',  icon: AlertTriangle,   label: 'Alertes' },
  { href: '/social',     icon: Rss,             label: 'Social' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navigation principale mobile"
      className="print-hidden md:hidden fixed bottom-0 left-0 right-0 z-[100] border-t border-white/5 bg-[#030303]/90 backdrop-blur-2xl"
      style={{
        paddingBottom:           'env(safe-area-inset-bottom)',
        height:                  'calc(64px + env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex h-16 items-center justify-around px-2" role="list">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              role="listitem"
              className={cn(
                'relative flex flex-col items-center justify-center gap-1.5 flex-1 min-w-0 transition-all duration-200 active:scale-90',
                active ? 'text-brand-green' : 'text-zinc-500'
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'w-6 h-6 transition-all duration-300',
                    active ? 'scale-110' : 'opacity-70'
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                {active && (
                  <motion.div
                    layoutId="glow"
                    className="absolute inset-0 bg-brand-green/20 blur-xl rounded-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
              </div>
              <span className={cn(
                'text-[9px] font-black uppercase tracking-[0.05em] transition-all',
                active ? 'opacity-100 translate-y-0.5' : 'opacity-40'
              )}>
                {label}
              </span>
              
              {active && (
                <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-px bg-brand-green shadow-glow-green" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
