'use client'
import { Bell, Clock, BrainCircuit, Wifi, WifiOff, Menu, Globe } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { useLocaleStore } from '@/store/localeStore'
import { useUIStore } from '@/store/uiStore'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { CitySearch } from '@/components/map/controls/CitySearch'
import { hasKey } from '@/lib/api/tomtom'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils/cn'

export function Header() {
  const { t, locale } = useTranslation()
  const setLocale    = useLocaleStore(s => s.setLocale)
  const toggleSidebar = useUIStore(s => s.toggleSidebar)
  
  const setAIPanelOpen = useMapStore(s => s.setAIPanelOpen)
  const isAIPanelOpen  = useMapStore(s => s.isAIPanelOpen)
  const incidents      = useTrafficStore(s => s.incidents)
  const weather        = useTrafficStore(s => s.weather)
  const dataSource     = useTrafficStore(s => s.dataSource)
  const [now, setNow]  = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const criticalCount = incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length
  const isLive        = hasKey() && dataSource === 'live'

  return (
    <header className="h-16 flex items-center justify-between px-6 sm:px-8 glass-light border-b border-white/5 flex-shrink-0 z-30 gap-4">
      {/* Left: Mobile Menu + City search */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2.5 rounded-apple hover:bg-white/5 text-text-secondary hover:text-white transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden xs:block">
          <CitySearch />
        </div>
      </div>

      {/* Center: time + data status */}
      <div className="flex items-center gap-5 flex-1 justify-center">
        <div className="hidden sm:flex items-center gap-2 text-text-secondary">
          <Clock className="w-4 h-4 opacity-50" />
          <span className="text-[13px] font-medium tracking-tight">
            {format(now, "EEE d MMM · HH:mm", { locale: locale === 'fr' ? fr : enUS })}
          </span>
        </div>

        {/* Data source badge */}
        <div className={cn(
          'flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[9px] font-bold tracking-[0.2em] transition-all',
          isLive
            ? 'glass-light border-brand-green/30 text-brand-green shadow-glow'
            : 'glass-light border-white/10 text-text-muted opacity-60',
        )}>
          {isLive
            ? <><div className="w-1.5 h-1.5 rounded-full bg-brand-green shadow-glow animate-pulse" /> {t('common.live').toUpperCase()} </>
            : <><WifiOff className="w-3 h-3" /> {t('common.demo').toUpperCase()}</>
          }
        </div>

        {/* Weather (Minimal) */}
        {weather && (
          <div className="hidden md:flex items-center gap-2.5 text-[13px] font-medium text-text-secondary glass-light px-3.5 py-1.5 rounded-full border border-white/5">
            <span className="text-lg leading-none">{weather.icon}</span>
            <span>{weather.temp}°</span>
            {weather.trafficImpact !== 'none' && (
              <span className={cn(
                'text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider',
                weather.trafficImpact === 'severe'   ? 'bg-[#FF3B30]/10 text-[#FF3B30]' :
                weather.trafficImpact === 'moderate' ? 'bg-[#FF9F0A]/10 text-[#FF9F0A]' :
                                                        'bg-[#FFD600]/10 text-[#FFD600]',
              )}>
                {weather.trafficImpact}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: alerts + localization + AI */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Language switch */}
        <button
          onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
          className="flex items-center justify-center w-9 h-9 rounded-apple glass-light hover:bg-white/10 text-text-secondary hover:text-white transition-all text-[11px] font-bold tracking-tight"
        >
          {locale === 'fr' ? 'EN' : 'FR'}
        </button>

        {/* Alerts */}
        <button
          title={criticalCount > 0 ? `${criticalCount} incident(s)` : `${t('common.incidents')} — OK`}
          className="relative p-2.5 rounded-apple glass-light hover:bg-white/10 transition-all text-text-secondary hover:text-white"
        >
          <Bell className="w-4.5 h-4.5" />
          {criticalCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#FF3B30] text-white text-[9px] font-bold flex items-center justify-center shadow-lg border-2 border-bg-surface">
              {criticalCount}
            </span>
          )}
        </button>

        {/* AI toggle */}
        <button
          onClick={() => setAIPanelOpen(!isAIPanelOpen)}
          title={t('common.ai_assistant')}
          className={cn(
            'flex items-center gap-2.5 px-4 py-2 rounded-apple border text-[13px] font-semibold transition-all shadow-apple',
            isAIPanelOpen
              ? 'bg-brand-green text-bg-base border-brand-green shadow-glow'
              : 'glass-light border-white/10 text-text-secondary hover:text-white hover:border-white/20',
          )}
        >
          <BrainCircuit className="w-4 h-4" />
          <span className="hidden lg:inline">{t('common.ai_assistant')}</span>
        </button>

        <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full glass border border-brand-green/20 shadow-glow cursor-default overflow-hidden">
          <div className="absolute inset-0 bg-brand-green/10" />
          <span className="text-[11px] font-bold text-brand-green relative z-10">CF</span>
        </div>
      </div>
    </header>
  )
}
