'use client'
import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import {
  Map, LayoutDashboard, TrendingUp, Activity,
  GitBranch, AlertTriangle, Settings, Zap,
  LogOut, UserCircle, Loader2, Rss,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/map',        icon: Map,             label: 'Carte',      description: 'Trafic temps réel', ariaLabel: 'Carte du trafic en temps réel' },
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Tableau',    description: 'Métriques & KPIs',  ariaLabel: 'Tableau de bord et métriques KPI' },
  { href: '/prediction', icon: TrendingUp,      label: 'Prévisions', description: 'Modèle prédictif', ariaLabel: 'Prévisions et modèle prédictif' },
  { href: '/simulation', icon: GitBranch,       label: 'Simulation', description: 'Scénarios',        ariaLabel: 'Simulation de scénarios de trafic' },
  { href: '/transport',  icon: Activity,        label: 'Transport',  description: 'Réseau TC',        ariaLabel: 'Réseau de transport en commun' },
  { href: '/incidents',  icon: AlertTriangle,   label: 'Incidents',  description: 'Alertes actives',  ariaLabel: 'Alertes et incidents actifs' },
  { href: '/social',     icon: Rss,             label: 'Social',     description: '@Sytadin · IDF',   ariaLabel: 'Feed social trafic Île-de-France' },
]

export function Sidebar() {
  const pathname    = usePathname()
  const router      = useRouter()
  const [user, setUser]         = useState<any>(null)
  const [isPending, startTransition] = useTransition()
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [supabase])

  const handleNav = (href: string) => {
    setNavigatingTo(href)
    startTransition(() => {
      router.push(href)
    })
  }

  // Clear navigating state when pathname changes
  useEffect(() => {
    setNavigatingTo(null)
  }, [pathname])

  const handleSignOut = async () => {
    if (!confirmSignOut) {
      setConfirmSignOut(true)
      setTimeout(() => setConfirmSignOut(false), 3000)
      return
    }
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      aria-label="Menu de navigation"
      className="print-hidden hidden lg:flex flex-col w-[200px] shrink-0 h-full border-r border-white/5 glass shadow-apple"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-[58px] border-b border-white/5 shrink-0">
        <div className="relative">
          <div className="w-8 h-8 rounded-[10px] bg-brand flex items-center justify-center shadow-glow-sm">
            <Zap className="w-4.5 h-4.5 text-black" strokeWidth={2.5} aria-hidden="true" />
          </div>
        </div>
        <div>
          <div className="text-[14px] font-bold text-text-primary tracking-tight leading-none">CrossFlow</div>
          <div className="text-[10px] font-bold text-text-muted mt-1 leading-none uppercase tracking-widest">Smart City</div>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Pages principales" className="flex-1 py-2 overflow-y-auto">
        <ul className="px-3 space-y-1" role="list">
          {NAV_ITEMS.map(({ href, icon: Icon, label, ariaLabel }) => {
            const active    = pathname === href || (href !== '/' && pathname.startsWith(href))
            const loading   = navigatingTo === href && isPending
            return (
              <li key={href} role="listitem">
                <button
                  onClick={() => handleNav(href)}
                  aria-label={ariaLabel}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm transition-all duration-300 group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                    active
                      ? 'bg-white/10 text-brand font-semibold shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5',
                  )}
                >
                  {active && (
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand shadow-glow animate-pulse" aria-hidden="true" />
                  )}
                  {loading ? (
                    <Loader2 className="w-4.5 h-4.5 shrink-0 text-brand animate-spin" aria-hidden="true" />
                  ) : (
                    <Icon
                      className={cn(
                        'w-4.5 h-4.5 shrink-0 transition-all duration-300',
                        active ? 'text-brand scale-110' : 'text-text-muted group-hover:text-text-secondary group-hover:scale-105',
                      )}
                      strokeWidth={active ? 2.25 : 1.75}
                      aria-hidden="true"
                    />
                  )}
                  <span className={cn('text-[13px] tracking-tight', active && 'translate-x-0.5 transition-transform')}>
                    {label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User & Settings */}
      <div className="px-3 pb-5 border-t border-white/5 pt-4 space-y-1">
        {user && (
          <div className="px-3 py-3 flex items-center gap-3 mb-2 rounded-[14px] bg-white/5 border border-white/5" aria-label="Informations utilisateur">
            <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center border border-white/10 shrink-0" aria-hidden="true">
              <UserCircle className="w-5 h-5 text-text-secondary" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-text-primary truncate uppercase tracking-tight">
                {user.email?.split('@')[0]}
              </div>
              <div className="text-[9px] font-medium text-text-muted truncate" title={user.email}>
                {user.email}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => handleNav('/settings')}
          aria-label="Accéder aux paramètres"
          aria-current={pathname === '/settings' ? 'page' : undefined}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm transition-all duration-300 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
            pathname === '/settings'
              ? 'bg-white/10 text-brand font-semibold shadow-sm'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/5',
          )}
        >
          {navigatingTo === '/settings' && isPending ? (
            <Loader2 className="w-4.5 h-4.5 shrink-0 text-brand animate-spin" aria-hidden="true" />
          ) : (
            <Settings
              className={cn(
                'w-4.5 h-4.5 shrink-0 transition-all duration-300',
                pathname === '/settings' ? 'text-brand scale-110' : 'text-text-muted group-hover:text-text-secondary group-hover:rotate-12',
              )}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          )}
          <span className="text-[13px] tracking-tight">Réglages</span>
        </button>

        <button
          onClick={handleSignOut}
          aria-label={confirmSignOut ? 'Confirmer la déconnexion — cliquez à nouveau' : 'Se déconnecter'}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm transition-all duration-300 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50',
            confirmSignOut
              ? 'bg-red-500/15 text-red-400 border border-red-500/30'
              : 'text-text-secondary hover:text-red-400 hover:bg-red-400/10',
          )}
        >
          <LogOut
            className={cn(
              'w-4.5 h-4.5 shrink-0 transition-all duration-300',
              confirmSignOut ? 'text-red-400' : 'text-text-muted group-hover:text-red-400 group-hover:-translate-x-0.5',
            )}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span className="text-[13px] tracking-tight">
            {confirmSignOut ? 'Confirmer ?' : 'Déconnexion'}
          </span>
        </button>
      </div>
    </aside>
  )
}
