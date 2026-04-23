'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import {
  Map, LayoutDashboard, Activity,
  GitBranch, AlertTriangle, Settings, Zap,
  LogOut, UserCircle, BotMessageSquare,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/map',                     icon: Map,              label: 'Carte',      description: 'Trafic temps reel' },
  { href: '/dashboard',               icon: LayoutDashboard,  label: 'Tableau',    description: 'Metriques & KPIs' },
  { href: '/dashboard/consultant-ai', icon: BotMessageSquare, label: 'Agent IA',   description: 'Copilote intelligent' },
  { href: '/simulation',              icon: GitBranch,        label: 'Simulation', description: 'Scenarios' },
  { href: '/transport',               icon: Activity,         label: 'Transport',  description: 'Reseau TC' },
  { href: '/incidents',               icon: AlertTriangle,    label: 'Incidents',  description: 'Alertes actives' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    fetchUser()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="print-hidden hidden lg:flex flex-col w-[200px] shrink-0 h-full border-r border-bg-border glass shadow-apple">
      <div className="flex items-center gap-2.5 px-5 h-[58px] border-b border-bg-border shrink-0">
        <div className="relative">
          <div className="w-8 h-8 rounded-[10px] bg-brand flex items-center justify-center shadow-glow-sm">
            <Zap className="w-4.5 h-4.5 text-black" strokeWidth={2.5} />
          </div>
        </div>
        <div>
          <div className="text-[14px] font-bold text-text-primary tracking-tight leading-none">CrossFlow</div>
          <div className="text-[10px] font-bold text-text-muted mt-1 leading-none uppercase tracking-widest">Smart City</div>
        </div>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        <div className="px-3">
          <div className="space-y-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm transition-all duration-300 group relative',
                  active
                    ? 'bg-bg-hover text-brand font-semibold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-subtle'
                )}
              >
                {active && (
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand shadow-glow animate-pulse" />
                )}
                <Icon
                  className={cn('w-4.5 h-4.5 shrink-0 transition-all duration-300', active ? 'text-brand scale-110' : 'text-text-muted group-hover:text-text-secondary group-hover:scale-105')}
                  strokeWidth={active ? 2.25 : 1.75}
                />
                <span className={cn('text-[13px] tracking-tight', active && 'translate-x-0.5 transition-transform')}>{label}</span>
              </Link>
            )
          })}
          </div>
        </div>
      </nav>

      <div className="px-3 pb-5 border-t border-bg-border pt-4 space-y-1">
        {user && (
          <div className="px-3 py-3 flex items-center gap-3 mb-2 rounded-[14px] bg-bg-subtle border border-bg-border">
            <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center border border-bg-border shrink-0">
              <UserCircle className="w-5 h-5 text-text-secondary" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-text-primary truncate uppercase tracking-tight">
                {user.email?.split('@')[0]}
              </div>
              <div className="text-[9px] font-medium text-text-muted truncate">
                {user.email}
              </div>
            </div>
          </div>
        )}

        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm transition-all duration-300 group',
            pathname === '/settings'
              ? 'bg-bg-hover text-brand font-semibold shadow-sm'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-subtle'
          )}
        >
          <Settings className={cn('w-4.5 h-4.5 shrink-0 transition-all duration-300', pathname === '/settings' ? 'text-brand scale-110' : 'text-text-muted group-hover:text-text-secondary group-hover:rotate-12')} strokeWidth={1.75} />
          <span className="text-[13px] tracking-tight">Reglages</span>
        </Link>
        
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm transition-all duration-300 text-text-secondary hover:text-red-400 hover:bg-red-400/10 group"
        >
          <LogOut className="w-4.5 h-4.5 shrink-0 text-text-muted group-hover:text-red-400 transition-all duration-300 group-hover:-translate-x-0.5" strokeWidth={1.75} />
          <span className="text-[13px] tracking-tight">Deconnexion</span>
        </button>
      </div>
    </aside>
  )
}
