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
    <header className="h-14 flex items-center justify-between px-4 sm:px-5 bg-bg-surface border-b border-bg-border flex-shrink-0 z-30 gap-3 sm:gap-4">
      {/* Left: Mobile Menu + City search */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden xs:block">
          <CitySearch />
        </div>
      </div>

      {/* Center: time + data status */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 justify-center">
        <div className="hidden sm:flex items-center gap-1.5 text-text-muted">
          <Clock className="w-3 h-3" />
          <span className="text-xs font-mono">
            {format(now, "EEE d MMM · HH:mm", { locale: locale === 'fr' ? fr : enUS })}
          </span>
        </div>

        {/* Data source badge */}
        <div className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold tracking-widest',
          isLive
            ? 'bg-[rgba(0,230,118,0.08)] border-brand-green/30 text-brand-green'
            : 'bg-bg-elevated border-bg-border text-text-muted',
        )}>
          {isLive
            ? <><Wifi className="w-2.5 h-2.5" /> {t('common.live')}</>
            : <><WifiOff className="w-2.5 h-2.5" /> {t('common.demo')}</>
          }
        </div>

        {/* Weather */}
        {weather && (
          <div className="hidden md:flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="text-base leading-none">{weather.icon}</span>
            <span>{weather.temp}°C</span>
            {weather.trafficImpact !== 'none' && (
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full',
                weather.trafficImpact === 'severe'   ? 'bg-[rgba(255,23,68,0.12)] text-[#FF1744]' :
                weather.trafficImpact === 'moderate' ? 'bg-[rgba(255,109,0,0.12)] text-[#FF6D00]' :
                                                        'bg-[rgba(255,214,0,0.12)] text-[#FFD600]',
              )}
                title={`${t('common.weather')} : ${weather.trafficImpact}`}
              >
                ⚠ {t('common.weather').toLowerCase()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: alerts + localization + AI */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Language switch */}
        <button
          onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors text-[10px] font-bold"
        >
          {locale === 'fr' ? 'EN' : 'FR'}
        </button>

        {/* Alerts */}
        <button
          title={criticalCount > 0 ? `${criticalCount} incident(s)` : `${t('common.incidents')} — OK`}
          className="relative p-2 rounded-lg hover:bg-bg-elevated transition-colors text-text-secondary hover:text-text-primary"
        >
          <Bell className="w-4 h-4" />
          {criticalCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#FF1744] text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
              {criticalCount}
            </span>
          )}
        </button>

        {/* AI toggle */}
        <button
          onClick={() => setAIPanelOpen(!isAIPanelOpen)}
          title={t('common.ai_assistant')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
            isAIPanelOpen
              ? 'bg-brand-green text-bg-base border-brand-green'
              : 'bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary hover:border-text-muted',
          )}
        >
          <BrainCircuit className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">{t('common.ai_assistant')}</span>
        </button>

        <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-brand-green-dim border border-brand-green/30 cursor-default">
          <span className="text-xs font-bold text-brand-green">CF</span>
        </div>
      </div>
    </header>
  )
}
