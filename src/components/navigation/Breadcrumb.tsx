'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home, LayoutDashboard, Map as MapIcon, GitBranch, Settings, History } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const ROUTE_MAP: Record<string, { label: string, icon: any }> = {
  'dashboard': { label: 'Tableau de bord', icon: LayoutDashboard },
  'map':       { label: 'Carte Live', icon: MapIcon },
  'simulation':{ label: 'Simulation', icon: GitBranch },
  'history':   { label: 'Historique', icon: History },
  'settings':  { label: 'Réglages', icon: Settings },
  'prediction':{ label: 'Prédictions', icon: LayoutDashboard },
}

export function Breadcrumb() {
  const pathname = usePathname()
  const pathSegments = pathname.split('/').filter(Boolean)

  if (pathname === '/' || pathname === '/login') return null

  return (
    <nav aria-label="Breadcrumb" className="px-5 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap bg-[#08090B]/40 backdrop-blur-sm border-b border-white/5 animate-in fade-in slide-in-from-top-1 duration-500">
      <Link 
        href="/dashboard"
        className="text-[10px] font-bold text-text-muted hover:text-brand transition-colors flex items-center gap-1.5 uppercase tracking-widest"
      >
        <Home className="w-3 h-3" />
        CrossFlow
      </Link>

      {pathSegments.map((segment, idx) => {
        const route = ROUTE_MAP[segment]
        const label = route?.label || segment.charAt(0).toUpperCase() + segment.slice(1)
        const Icon = route?.icon
        const isLast = idx === pathSegments.length - 1
        const href = `/${pathSegments.slice(0, idx + 1).join('/')}`

        return (
          <div key={href} className="flex items-center gap-2">
            <ChevronRight className="w-2.5 h-2.5 text-text-muted opacity-30" />
            <Link 
              href={href}
              className={cn(
                "text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all",
                isLast 
                  ? "text-brand cursor-default" 
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              {Icon && <Icon className={cn("w-3 h-3", isLast ? "text-brand" : "text-text-muted")} />}
              {label}
            </Link>
          </div>
        )
      })}
    </nav>
  )
}
