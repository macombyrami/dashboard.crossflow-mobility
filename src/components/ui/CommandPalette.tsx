'use client'
import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Zap, Sparkles, X, Command, ChevronRight } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useMapStore } from '@/store/mapStore'
import { CITIES } from '@/config/cities.config'
import { cn } from '@/lib/utils/cn'

export function CommandPalette() {
  const isOpen  = useUIStore(s => s.isCommandPaletteOpen)
  const setOpen = useUIStore(s => s.setCommandPaletteOpen)
  const setCity = useMapStore(s => s.setCity)
  const setAIPanelOpen = useMapStore(s => s.setAIPanelOpen)
  
  const [query, setQuery]   = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keyboard trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto-focus
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setActiveIdx(0)
    }
  }, [isOpen])

  const filteredCities = CITIES.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5)

  const commands = [
    { id: 'ai', title: 'Demander à l\'IA Advisor', icon: Sparkles, action: () => { setAIPanelOpen(true); setOpen(false) } },
    { id: 'sim', title: 'Lancer une simulation', icon: Zap, action: () => { /* Logic to open sim panel if applicable */ setOpen(false) } },
  ].filter(cmd => cmd.title.toLowerCase().includes(query.toLowerCase()))

  const totalResults = filteredCities.length + commands.length

  const handleSelect = (idx: number) => {
    if (idx < filteredCities.length) {
      setCity(filteredCities[idx])
    } else {
      commands[idx - filteredCities.length].action()
    }
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-start justify-center pt-[15vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            className="relative w-full max-w-[640px] bg-[#121418] border border-white/10 rounded-2xl shadow-2xl overflow-hidden shadow-brand/10"
          >
             <div className="flex items-center px-4 py-4 border-b border-white/5 bg-white/2">
                <Search className="w-5 h-5 text-white/40 mr-3" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActiveIdx(0) }}
                  placeholder="Rechercher une ville, une commande ou un rapport..."
                  className="flex-1 bg-transparent border-none outline-none text-white text-base placeholder:text-white/20"
                />
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-white/10 bg-white/5 text-[10px] text-white/40 font-black">
                   ESC
                </div>
             </div>

             <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
                {totalResults === 0 && (
                  <div className="py-12 text-center text-white/20 text-sm font-bold uppercase tracking-widest">
                    Aucun résultat pour "{query}"
                  </div>
                )}

                {filteredCities.length > 0 && (
                  <div>
                    <p className="px-3 py-2 text-[10px] font-black text-white/30 uppercase tracking-[0.15em]">Villes & Districts</p>
                    {filteredCities.map((city, i) => (
                      <CommandItem 
                         key={city.id}
                         active={activeIdx === i}
                         onClick={() => handleSelect(i)}
                         icon={MapPin}
                         title={city.name}
                         subtitle={`${city.countryCode} · ${city.country}`}
                         badge={city.flag}
                      />
                    ))}
                  </div>
                )}

                {commands.length > 0 && (
                  <div className="pt-2">
                    <p className="px-3 py-2 text-[10px] font-black text-white/30 uppercase tracking-[0.15em]">Actions Rapides</p>
                    {commands.map((cmd, i) => {
                      const idx = i + filteredCities.length
                      return (
                        <CommandItem 
                           key={cmd.id}
                           active={activeIdx === idx}
                           onClick={() => handleSelect(idx)}
                           icon={cmd.icon}
                           title={cmd.title}
                           subtitle="Commande système"
                        />
                      )
                    })}
                  </div>
                )}
             </div>

             <div className="px-4 py-3 border-t border-white/5 bg-black/40 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-black uppercase tracking-widest">
                      <ChevronRight className="w-3 h-3" /> Navigation
                   </div>
                   <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-black uppercase tracking-widest">
                      <Command className="w-3 h-3" /> Exécuter
                   </div>
                </div>
                <div className="text-[10px] text-brand-green/40 font-black uppercase tracking-widest">
                   CrossFlow Intelligence Command
                </div>
             </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function CommandItem({ active, onClick, icon: Icon, title, subtitle, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all text-left",
        active ? "bg-brand/10 border border-brand/20" : "bg-transparent border border-transparent hover:bg-white/5"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center border",
        active ? "bg-brand/20 border-brand/30 text-brand" : "bg-white/5 border-white/10 text-white/40"
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
           <h4 className={cn("text-sm font-black transition-colors", active ? "text-brand" : "text-white")}>{title}</h4>
           {badge && <span className="text-lg">{badge}</span>}
        </div>
        <p className="text-[11px] text-white/30 font-bold uppercase tracking-wider">{subtitle}</p>
      </div>
    </button>
  )
}
