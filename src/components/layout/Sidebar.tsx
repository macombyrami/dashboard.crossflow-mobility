'use client'
import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import type { LucideIcon } from 'lucide-react'
import {
  Map, LayoutDashboard, TrendingUp, Activity,
  GitBranch, AlertTriangle, Settings, Zap,
  LogOut, UserCircle, Loader2, Rss, Bot,
  MousePointer2, Sparkles, ChevronRight,
} from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { useUIStore } from '@/store/uiStore'
import navGroups from '@/lib/data/navigation.json'
import appData from '@/lib/data/app.json'
import { useAuthStore } from '@/store/useAuthStore'

const ICON_MAP: Record<string, LucideIcon> = {
  Map, LayoutDashboard, TrendingUp, Activity,
  GitBranch, AlertTriangle, Rss, Bot,
}

export function Sidebar() {
  const pathname    = usePathname()
  const router      = useRouter()
  
  // 🛰️ STAFF ENGINEER: Use Global Session Cache
  const user           = useAuthStore(s => s.user)
  const signOutStore   = useAuthStore(s => s.signOut)

  const [isPending, startTransition] = useTransition()
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const supabase = createClient()

  const setMode = useMapStore(s => s.setMode)
  const { isSidebarOpen, setSidebarOpen } = useUIStore()

  const handleNav = (href: string) => {
    setNavigatingTo(href)
    if (window.innerWidth < 1024) setSidebarOpen(false)
    
    // Mode transitions
    if (href === '/map')        setMode('live')
    if (href === '/prediction') setMode('predict')
    if (href === '/simulation') setMode('simulate')

    startTransition(() => {
      if (['/prediction', '/simulation'].includes(href)) {
        router.push('/map')
      } else {
        router.push(href)
      }
    })
  }

  useEffect(() => {
    setNavigatingTo(null)
  }, [pathname])

  const handleSignOut = async () => {
    if (!confirmSignOut) {
      setConfirmSignOut(true)
      setTimeout(() => setConfirmSignOut(false), 3000)
      return
    }
    
    // 🛰️ STAFF ENGINEER: Concurrent SignOut Cleanup
    await supabase.auth.signOut()
    signOutStore()
    
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        aria-label="Menu opérationnel"
        className={cn(
          "print-hidden fixed inset-y-0 left-0 z-50 flex flex-col w-[var(--sidebar-w)] shrink-0 h-full border-r border-white/5 bg-bg-base/95 glass shadow-apple transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "lg:relative lg:translate-x-0 lg:z-0 lg:flex",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo Section */}
        <div className="flex items-center gap-2.5 px-5 h-[58px] border-b border-white/5 shrink-0">
          <div className="relative">
            <div className="w-8 h-8 rounded-[10px] bg-brand flex items-center justify-center shadow-glow-sm">
              <Zap className="w-4.5 h-4.5 text-black" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand rounded-full border-2 border-bg-base animate-pulse shadow-glow" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-black text-text-primary tracking-tighter leading-none uppercase italic">{appData.name}</div>
            <div className="text-[9px] font-bold text-text-muted mt-1 leading-none uppercase tracking-widest opacity-60">Mobility Hub</div>
          </div>
        </div>

        {/* Guided Navigation Steps */}
        <nav aria-label="Tunnel Opérationnel" className="flex-1 py-4 overflow-y-auto custom-scrollbar-thin">
          {navGroups.map((group, idx) => (
            <div key={idx} className="mb-6">
              <div className="px-5 mb-2 flex items-center gap-2">
                <span className="text-[10px] font-black text-brand tracking-[0.2em] italic">0{idx + 1}</span>
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-[0.15em] opacity-40">{group.group}</span>
              </div>
              <ul className="px-3 space-y-0.5" role="list">
                {group.items.map((item: any) => {
                  const Icon    = ICON_MAP[item.iconName] || MousePointer2
                  const active  = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                  const loading = navigatingTo === item.href && isPending

                  return (
                    <li key={item.href} role="listitem">
                      <button
                        onClick={() => handleNav(item.href)}
                        aria-label={item.ariaLabel}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm transition-all duration-300 group relative focus-visible:outline-none focus:bg-white/5',
                          active
                            ? 'bg-brand/10 text-brand font-black shadow-glow-sm'
                            : 'text-text-secondary hover:text-text-primary hover:bg-white/5',
                        )}
                      >
                        {active && (
                          <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-3 rounded-full bg-brand shadow-glow" aria-hidden="true" />
                        )}
                        
                        <div className="relative">
                          {loading ? (
                            <Loader2 className="w-4 h-4 shrink-0 text-brand animate-spin" aria-hidden="true" />
                          ) : (
                            <Icon
                              className={cn(
                                'w-4 h-4 shrink-0 transition-all duration-300',
                                active ? 'text-brand scale-110' : 'text-text-muted group-hover:text-text-secondary group-hover:scale-105',
                              )}
                              strokeWidth={active ? 2.5 : 1.75}
                              aria-hidden="true"
                            />
                          )}
                        </div>

                        <div className="flex flex-col items-start transition-transform group-hover:translate-x-0.5">
                          <span className={cn('text-[11px] uppercase font-black tracking-widest', active && 'text-brand')}>
                            {item.label}
                          </span>
                          <span className="text-[8px] font-bold text-text-muted uppercase tracking-tight opacity-50 group-hover:opacity-100 transition-opacity">
                            {item.description}
                          </span>
                        </div>
                        
                        {active && (
                          <ChevronRight className="w-3 h-3 ml-auto text-brand opacity-40 group-hover:translate-x-0.5 transition-transform" />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User Presence & Support */}
        <div className="px-3 pb-5 border-t border-white/5 pt-4 space-y-1">
          <div className="px-3 py-3 flex items-center gap-3 mb-2 rounded-[14px] bg-white/[0.03] border border-white/5 group group-hover:bg-brand/5 transition-colors duration-500">
             <div className="relative">
                <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center border border-white/10 shrink-0" aria-hidden="true">
                  <UserCircle className="w-5 h-5 text-text-secondary group-hover:text-brand" />
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-brand border-2 border-bg-base rounded-full" />
             </div>
             <div className="min-w-0">
                <div className="text-[11px] font-black text-text-primary truncate uppercase tracking-tight italic">
                  OPERATOR
                </div>
                <div className="text-[9px] font-bold text-text-muted truncate lowercase tracking-tight opacity-60">
                   {user?.email?.split('@')[0] || 'GUEST'}@idf.gov
                </div>
             </div>
          </div>

          <button
            onClick={() => handleNav('/settings')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm transition-all focus:outline-none',
              pathname === '/settings' ? 'bg-brand/10 text-brand font-black' : 'text-text-secondary hover:text-white hover:bg-white/5',
            )}
          >
            <Settings className={cn('w-4 h-4', pathname === '/settings' ? 'text-brand animate-spin-slow' : 'text-text-muted')} />
            <span className="text-[11px] uppercase font-black tracking-widest">Réglages Système</span>
          </button>

          <button
            onClick={handleSignOut}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-1.5 rounded-[12px] text-xs transition-colors mt-2',
              confirmSignOut ? 'bg-red-500/10 text-red-500' : 'text-text-muted hover:text-red-400'
            )}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="font-bold uppercase tracking-widest text-[9px]">{confirmSignOut ? 'Confirmer' : 'Déconnexion'}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
