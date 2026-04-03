'use client'
import React, { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, AlertTriangle, Zap, CheckCircle2, MapPin, Trash2, ArrowRight } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useTrafficStore } from '@/store/trafficStore'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'

export function NotificationHub() {
  const isOpen             = useUIStore(s => s.isNotificationOpen)
  const setOpen            = useUIStore(s => s.setNotificationOpen)
  const incidents          = useTrafficStore(s => s.incidents)
  const socialIncidents    = useTrafficStore(s => s.socialIncidents)
  const clearIncidents     = useTrafficStore(s => s.clearIncidents)
  const setViewState       = useMapStore(s => s.setViewState)
  
  const allIncidents = [...incidents, ...socialIncidents]
  const count = allIncidents.length

  const ref = useRef<HTMLDivElement>(null)

  // Handle outside click to close
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[990]"
          />

          {/* Sidebar */}
          <motion.div
            ref={ref}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-[400px] bg-bg-surface border-l border-bg-border shadow-2xl z-[1000] flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-bg-border flex items-center justify-between bg-bg-surface/80 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-brand-green" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-text-primary uppercase tracking-tighter leading-none mb-1">Centre de Alertes</h3>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest leading-none">{count} Signalements Actifs</p>
                </div>
              </div>
              <button 
                onClick={() => setOpen(false)}
                className="p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 scrollbar-thin">
              {allIncidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-xs font-bold text-white uppercase tracking-widest">Tout est sous contrôle</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Category: Critical */}
                  {allIncidents.some(i => i.severity === 'critical') && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" /> Priorité Immédiate
                      </p>
                      {allIncidents.filter(i => i.severity === 'critical').map(inc => (
                        <NotificationItem 
                          key={inc.id} 
                          incident={inc} 
                          onLocationClick={() => {
                            setViewState({ latitude: inc.location.lat, longitude: inc.location.lng, zoom: 16, pitch: 30, bearing: 0 })
                            setOpen(false)
                          }} 
                        />
                      ))}
                    </div>
                  )}

                  {/* Category: Standard */}
                  {allIncidents.some(i => i.severity !== 'critical') && (
                    <div className="space-y-3 pt-4">
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Flux Info Trafic</p>
                      {allIncidents.filter(i => i.severity !== 'critical').map(inc => (
                        <NotificationItem 
                          key={inc.id} 
                          incident={inc} 
                          onLocationClick={() => {
                            setViewState({ latitude: inc.location.lat, longitude: inc.location.lng, zoom: 15.5, pitch: 0, bearing: 0 })
                            setOpen(false)
                          }} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {count > 0 && (
              <div className="p-6 border-t border-bg-border bg-bg-surface/50">
                <button 
                  onClick={clearIncidents}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 text-[10px] font-black text-text-muted hover:text-white uppercase tracking-widest transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Tout acquitter
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function NotificationItem({ incident, onLocationClick }: { incident: any; onLocationClick: () => void }) {
  const isCritical = incident.severity === 'critical'
  
  return (
    <div className={cn(
      "group relative p-4 rounded-3xl border transition-all shadow-lg overflow-hidden",
      isCritical ? "bg-red-500/10 border-red-500/20" : "bg-white/5 border-white/5 hover:border-white/15"
    )}>
      <div className="flex items-start gap-4 relative z-10">
        <div className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border",
          isCritical ? "bg-red-500/20 border-red-500/30 text-red-500" : "bg-bg-elevated border-white/10 text-brand-green"
        )}>
          {isCritical ? <AlertTriangle className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
        </div>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-black text-text-primary leading-tight">{incident.title}</h4>
            <span className="text-[10px] text-text-muted font-bold tabular-nums">12m</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{incident.description}</p>
          
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
             <button 
               onClick={onLocationClick}
               className="flex items-center gap-1.5 text-[10px] font-black text-text-muted hover:text-brand-green uppercase tracking-widest transition-all"
             >
               <MapPin className="w-3 h-3" /> Zoom Carte
             </button>
             <button className="flex items-center gap-1.5 text-[10px] font-black text-text-muted hover:text-white uppercase tracking-widest transition-all">
               <ArrowRight className="w-3 h-3" /> Détails
             </button>
          </div>
        </div>
      </div>
    </div>
  )
}
