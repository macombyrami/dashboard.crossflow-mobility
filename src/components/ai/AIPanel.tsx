'use client'
import React, { useState, useEffect, useRef } from 'react'
import { BrainCircuit, Send, Loader2, X, Sparkles, ChevronDown, Zap, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { cn } from '@/lib/utils/cn'
import { isPointInPolygon, isSegmentInPolygon } from '@/lib/utils/spatial'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { DecisionHub } from './DecisionHub'
import appData from '@/lib/data/app.json'
import { useKPIHistoryStore } from '@/store/kpiHistoryStore'
import { useSimulationStore } from '@/store/simulationStore'

interface Message {
  id:      string
  role:    'user' | 'assistant'
  content: string
  status?: 'thinking' | 'typing' | 'done'
}

export function AIPanel({ onClose }: { onClose?: () => void }) {
  const { t, locale } = useTranslation()
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [activeTab, setActiveTab] = useState<'assistant' | 'intelligence'>('assistant')
  
  const city               = useMapStore(s => s.city)
  const zonePolygon        = useMapStore(s => s.zonePolygon)
  const kpis               = useTrafficStore(s => s.kpis)
  const snapshot           = useTrafficStore(s => s.snapshot)
  const incidents          = useTrafficStore(s => s.incidents)
  const openMeteoWeather   = useTrafficStore(s => s.openMeteoWeather)
  const dataSource         = useTrafficStore(s => s.dataSource)
  const setAIPanelOpen     = useMapStore(s => s.setAIPanelOpen)
  
  const getHistory      = useKPIHistoryStore(s => s.getForCity)
  const currentSimResult = useSimulationStore(s => s.currentResult)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages])

  const buildContext = () => {
    let zoneContext = undefined
    if (zonePolygon && snapshot) {
      const zoneSegments = snapshot.segments.filter(s => isSegmentInPolygon(s.coordinates, zonePolygon))
      const zoneIncidents = incidents.filter(i => isPointInPolygon([i.location.lng, i.location.lat], zonePolygon))
      const avgCongestion = zoneSegments.length > 0
        ? zoneSegments.reduce((sum, s) => sum + s.congestionScore, 0) / zoneSegments.length
        : 0

      zoneContext = {
        active:      true,
        segmentCount: zoneSegments.length,
        incidentCount: zoneIncidents.length,
        avgCongestion,
        topIncidents: zoneIncidents.slice(0, 3).map(i => `${i.severity}: ${i.title}`),
        streets: Array.from(new Set(zoneSegments.map(s => s.name).filter(Boolean))).slice(0, 10)
      }
    }

    // Capture recent history trends (last 10 indices)
    const recentHistory = getHistory(city.id, 10).map(h => ({
      time: h.time,
      congestion: h.congestion
    }))

    return {
      cityName:        city.name,
      country:         city.country,
      congestionRate:  kpis?.congestionRate,
      avgTravelMin:    kpis?.avgTravelMin,
      pollutionIndex:  kpis?.pollutionIndex,
      activeIncidents: kpis?.activeIncidents,
      dataSource:      dataSource === 'live' ? 'Lecture consolidée' : `${appData.name} Engine`,
      zone:            zoneContext,
      history:         recentHistory,
      prediction:      currentSimResult?.predictive ? {
        scenario: currentSimResult.scenarioName,
        impact:   currentSimResult.predictive.delta,
      } : undefined,
      weather: openMeteoWeather ? {
        emoji:         openMeteoWeather.weatherEmoji,
        description:   openMeteoWeather.weatherLabel,
        temp:          openMeteoWeather.temp,
        trafficImpact: openMeteoWeather.trafficImpact,
      } : undefined,
      topIncidents: incidents.slice(0, 3).map(i => `${i.severity}: ${i.title} (${i.address})`),
    }
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userText = text.trim()
    setInput('')
    setLoading(true)

    // 1. Add User Message
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userText }
    setMessages(prev => [...prev, userMsg])

    try {
      const res = await fetch('/api/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages:    [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          cityContext: buildContext(),
        }),
      })
      const data = await res.json()
      
      if (!res.ok || data.error) {
        setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          role: 'assistant', 
          content: data.error || "Une erreur est survenue lors de l'analyse." 
        }])
        return
      }

      // 2. Add Assistant Message with Typing Simulation
      const aiId = (Date.now() + 1).toString()
      const fullContent = data.content
      
      // Initial "thinking" state
      setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '', status: 'typing' }])

      // Typing simulation (ChatGPT feel)
      let currentContent = ''
      const words = fullContent.split(' ')
      let i = 0
      const interval = setInterval(() => {
        if (i < words.length) {
          currentContent += (i === 0 ? '' : ' ') + words[i]
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: currentContent } : m))
          i++
        } else {
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, status: 'done' } : m))
          clearInterval(interval)
        }
      }, 40) // ~25 words per second (fast but readable)

    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Erreur de connexion au moteur d'intelligence." }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg-surface border-l border-bg-border overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-green/5 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <div className="px-5 py-4 border-b border-bg-border flex items-center justify-between flex-shrink-0 bg-bg-surface/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center shadow-inner group">
            <BrainCircuit className="w-5 h-5 text-brand-green group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <p className="text-sm font-black text-text-primary uppercase tracking-tighter leading-none mb-1">Assistant de pilotage</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">En ligne · {city.name}</p>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-white transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex px-4 py-2 bg-bg-elevated/30 border-b border-bg-border z-10">
        <div className="flex-1 flex bg-black/20 rounded-xl p-1 border border-white/5">
          <button
            onClick={() => setActiveTab('assistant')}
            className={cn(
              "flex-1 py-2 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-2 tracking-[0.1em]",
              activeTab === 'assistant' ? "bg-bg-surface text-brand-green shadow-lg border border-white/5" : "text-text-muted hover:text-text-secondary"
            )}
          >
            <Sparkles className="w-3 h-3" /> ASSISTANT
          </button>
          <button
            onClick={() => setActiveTab('intelligence')}
            className={cn(
              "flex-1 py-2 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-2 tracking-[0.1em]",
              activeTab === 'intelligence' ? "bg-bg-surface text-brand-green shadow-lg border border-white/5" : "text-text-muted hover:text-text-secondary"
            )}
          >
            <Zap className="w-3 h-3" /> INTELLIGENCE
          </button>
        </div>
      </div>

      {activeTab === 'intelligence' ? (
        <DecisionHub />
      ) : (
        <div className="flex flex-col flex-1 min-h-0 z-10">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-thin">
            <AnimatePresence initial={false}>
              {messages.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6 py-10"
                >
                  <div className="text-center space-y-4">
                     <div className="w-16 h-16 rounded-3xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center mx-auto shadow-glow">
                        <Zap className="w-8 h-8 text-brand-green animate-pulse" />
                     </div>
                     <div>
                       <h3 className="text-lg font-black text-white">{t('ai.welcome_title') || 'Expert Mobilité IA'}</h3>
                       <p className="text-xs text-text-muted max-w-[200px] mx-auto mt-1 leading-relaxed">Analyses basées sur les données réelles de congestion et météo.</p>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {['Analyse la zone', 'Pourquoi cette congestion ?', 'Prévision +30min'].map(p => (
                      <button 
                        key={p} 
                        onClick={() => sendMessage(p)} 
                        className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-text-secondary text-left hover:bg-white/10 hover:border-brand-green/30 transition-all flex items-center justify-between group"
                      >
                        {p}
                        <ChevronDown className="w-3 h-3 rotate-[-90deg] opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  layout
                  className={cn('flex gap-4 items-start', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg border mt-1',
                    msg.role === 'user' ? 'bg-brand-green/20 border-brand-green/30 text-brand-green' : 'bg-bg-elevated border-white/10 text-text-muted'
                  )}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <BrainCircuit className="w-4 h-4" />}
                  </div>
                  <div className={cn(
                    'max-w-[85%] rounded-3xl px-5 py-3.5 text-sm leading-relaxed shadow-xl border relative',
                    msg.role === 'user' 
                      ? 'bg-brand-green text-bg-base border-brand-green/50 font-medium rounded-tr-sm selection:bg-black/20' 
                      : 'bg-bg-elevated/60 backdrop-blur-md border-white/5 text-text-secondary rounded-tl-sm selection:bg-brand-green/20'
                  )}>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <FormattedMessage content={msg.content} />
                      {msg.status === 'typing' && <span className="inline-block w-1.5 h-4 ml-1 bg-brand-green animate-pulse align-middle" />}
                    </div>
                  </div>
                </motion.div>
              ))}

              {loading && !messages.some(m => m.status === 'typing') && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-4 items-center pl-1"
                >
                  <div className="w-8 h-8 rounded-xl bg-bg-elevated border border-white/5 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-brand-green animate-spin" />
                  </div>
                  <span className="text-[10px] font-bold text-brand-green uppercase tracking-widest animate-pulse">Intelligence en cours...</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input Area */}
          <div className="px-5 pb-6 pt-2 bg-gradient-to-t from-bg-surface via-bg-surface to-transparent">
            <div className="relative group">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={t('ai.input_placeholder')}
                rows={1}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pr-14 text-sm text-text-primary placeholder-text-muted outline-none focus:border-brand-green/50 focus:bg-white/10 transition-all resize-none overflow-hidden max-h-32 shadow-2xl"
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = `${target.scrollHeight}px`
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className={cn(
                  'absolute right-3 bottom-3 w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                  input.trim() && !loading 
                    ? 'bg-brand-green text-bg-base hover:scale-105 shadow-[0_0_20px_rgba(0,230,118,0.3)]' 
                    : 'bg-white/5 text-text-muted border border-white/10 cursor-not-allowed opacity-50'
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[9px] text-center text-text-muted mt-3 font-medium uppercase tracking-widest opacity-50">Expert Mobilité · Données Grounded</p>
          </div>
        </div>
      )}
    </div>
  )
}

function FormattedMessage({ content }: { content: string }) {
  if (!content) return null
  const lines = content.split('\n')
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />
        if (line.startsWith('## ')) return <p key={i} className="font-black text-white text-base mt-4 mb-2">{line.slice(3)}</p>
        if (line.startsWith('### ')) return <p key={i} className="font-bold text-white text-sm mt-3 mb-1.5 border-l-4 border-brand-green pl-3">{line.slice(4)}</p>
        if (line.startsWith('- '))  return (
          <div key={i} className="flex gap-2.5 items-start py-0.5">
            <span className="text-brand-green font-bold text-lg leading-none mt-1">·</span>
            <span className="flex-1">{formatInline(line.slice(2))}</span>
          </div>
        )
        return <p key={i} className="leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string): React.ReactNode {
  // Bold, Highlight (ctx:), Code
  const parts = text.split(/(\*\*[^*]+\*\*|ctx:[a-zA-Z._0-9]+|`[^`]+`)/)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) 
      return <strong key={i} className="text-white font-black">{p.slice(2, -2)}</strong>
    if (p.startsWith('ctx:'))
      return <span key={i} className="px-1.5 py-0.5 bg-brand-green/20 text-brand-green rounded text-[10px] font-mono font-bold leading-none inline-block border border-brand-green/30">{p}</span>
    if (p.startsWith('`') && p.endsWith('`'))
      return <code key={i} className="px-1.5 py-0.5 bg-black/40 text-brand-green rounded text-[11px] font-mono border border-white/5">{p.slice(1, -1)}</code>
    return <span key={i}>{p}</span>
  })
}
