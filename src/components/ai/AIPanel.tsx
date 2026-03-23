'use client'
import { useState, useRef, useEffect } from 'react'
import { BrainCircuit, Send, Loader2, X, Sparkles, ChevronDown, Zap } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { cn } from '@/lib/utils/cn'

import { useTranslation } from '@/lib/hooks/useTranslation'

interface Message {
  role:    'user' | 'assistant'
  content: string
}

export function AIPanel({ onClose }: { onClose?: () => void }) {
  const { t, locale } = useTranslation()
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  
  const MODELS = [
    { id: 'openai/gpt-oss-120b:free',              label: 'GPT OSS 120B',      note: t('ai.model_note_powerful') },
    { id: 'google/gemini-flash-1.5',               label: 'Gemini Flash 1.5',  note: t('ai.model_note_fast') },
    { id: 'anthropic/claude-haiku',                label: 'Claude Haiku',      note: t('ai.model_note_balanced') },
    { id: 'openai/gpt-4o-mini',                    label: 'GPT-4o mini',       note: t('ai.model_note_fast') },
    { id: 'meta-llama/llama-3.1-8b-instruct:free', label: 'Llama 3.1 8B',     note: t('ai.model_note_free') },
  ]

  const QUICK_PROMPTS = locale === 'fr' ? [
    'Analyse le trafic actuel',
    'Quelles optimisations suggères-tu ?',
    'Pourquoi cette congestion ?',
    'Prédis le trafic dans 1h',
    'Propose un scénario de simulation',
  ] : [
    'Analyze current traffic',
    'What optimizations do you suggest?',
    'Why this congestion?',
    'Predict traffic in 1h',
    'Propose a simulation scenario',
  ]

  const [model,     setModel]     = useState(MODELS[0].id)
  const [showModel, setShowModel] = useState(false)
  const [apiError,  setApiError]  = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  const city               = useMapStore(s => s.city)
  const kpis               = useTrafficStore(s => s.kpis)
  const incidents          = useTrafficStore(s => s.incidents)
  const openMeteoWeather   = useTrafficStore(s => s.openMeteoWeather)
  const airQuality         = useTrafficStore(s => s.airQuality)
  const dataSource         = useTrafficStore(s => s.dataSource)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const buildContext = () => ({
    cityName:        city.name,
    country:         city.country,
    congestionRate:  kpis?.congestionRate,
    avgTravelMin:    kpis?.avgTravelMin,
    pollutionIndex:  kpis?.pollutionIndex,
    activeIncidents: kpis?.activeIncidents,
    dataSource:      dataSource === 'live' ? 'TomTom Live' : 'CrossFlow Engine',
    weather: openMeteoWeather ? {
      emoji:         openMeteoWeather.weatherEmoji,
      description:   openMeteoWeather.weatherLabel,
      temp:          openMeteoWeather.temp,
      windKmh:       openMeteoWeather.windSpeedKmh,
      visibilityKm:  Math.round(openMeteoWeather.visibilityM / 100) / 10,
      precipMm:      openMeteoWeather.precipitationMm,
      snowDepthCm:   openMeteoWeather.snowDepthCm,
      trafficImpact: openMeteoWeather.trafficImpact,
    } : undefined,
    airQuality: airQuality ? {
      aqiEU:         airQuality.aqiEuropean,
      level:         airQuality.level,
      pm25:          airQuality.pm25,
      no2:           airQuality.no2,
      trafficImpact: airQuality.trafficImpact,
    } : undefined,
    topIncidents: incidents.slice(0, 3).map(i => `${i.severity}: ${i.title} (${i.address})`),
  })

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    setApiError(null)

    const userMsg: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages:    newMessages,
          model,
          cityContext: buildContext(),
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setApiError(data.error ?? t('ai.error_request'))
        return
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch (e) {
      setApiError(t('ai.error_server'))
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
    <div className="flex flex-col h-full bg-bg-surface border-l border-bg-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-bg-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-green-dim border border-brand-green/30 flex items-center justify-center">
            <BrainCircuit className="w-3.5 h-3.5 text-brand-green" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">CrossFlow AI</p>
            <p className="text-[10px] text-text-muted">via OpenRouter</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Model selector */}
          <div className="relative">
            <button
              onClick={() => setShowModel(s => !s)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-elevated border border-bg-border text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              <span className="max-w-[80px] truncate">{MODELS.find(m => m.id === model)?.label ?? 'Model'}</span>
              <ChevronDown className={cn('w-3 h-3 transition-transform', showModel && 'rotate-180')} />
            </button>
            {showModel && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-bg-elevated border border-bg-border rounded-xl shadow-panel z-50 overflow-hidden animate-fade-in">
                {MODELS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setModel(m.id); setShowModel(false) }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-bg-surface transition-colors',
                      model === m.id && 'bg-brand-green-dim',
                    )}
                  >
                    <span className={cn('text-xs font-medium', model === m.id ? 'text-brand-green' : 'text-text-primary')}>
                      {m.label}
                    </span>
                    <span className="text-[10px] text-text-muted">{m.note}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* City context badge */}
      <div className="px-4 py-2 border-b border-bg-border flex items-center gap-2 flex-shrink-0">
        <span className="text-lg">{city.flag ?? '🌍'}</span>
        <span className="text-xs text-text-secondary">{city.name}</span>
        {kpis && (
          <span className="ml-auto text-xs text-text-muted">
            {t('dashboard.congestion')}: <span className={cn(
              'font-semibold',
              kpis.congestionRate > 0.7 ? 'text-[#FF1744]' :
              kpis.congestionRate > 0.5 ? 'text-[#FF6D00]' : 'text-[#00E676]',
            )}>{Math.round(kpis.congestionRate * 100)}%</span>
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-10 h-10 rounded-xl bg-brand-green-dim border border-brand-green/20 flex items-center justify-center mx-auto mb-3">
                <Zap className="w-5 h-5 text-brand-green" />
              </div>
              <p className="text-sm text-text-secondary">{t('ai.ask_question')}</p>
              <p className="text-xs text-text-muted mt-1">{t('ai.quick_prompts')}</p>
            </div>

            <div className="space-y-2">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-bg-elevated border border-bg-border text-xs text-text-secondary hover:text-text-primary hover:border-text-muted transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-2.5', msg.role === 'user' && 'flex-row-reverse')}>
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5',
              msg.role === 'user'
                ? 'bg-brand-green-dim border border-brand-green/30 text-brand-green'
                : 'bg-bg-elevated border border-bg-border text-text-secondary',
            )}>
              {msg.role === 'user' ? (locale === 'fr' ? 'V' : 'M') : '⚡'}
            </div>
            <div className={cn(
              'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed',
              msg.role === 'user'
                ? 'bg-brand-green-dim border border-brand-green/20 text-text-primary rounded-tr-sm'
                : 'bg-bg-elevated border border-bg-border text-text-secondary rounded-tl-sm',
            )}>
              <FormattedMessage content={msg.content} />
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-3 h-3 text-brand-green animate-spin" />
            </div>
            <div className="bg-bg-elevated border border-bg-border rounded-2xl rounded-tl-sm px-3.5 py-2.5">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {apiError && (
          <div className="bg-[rgba(255,23,68,0.08)] border border-[rgba(255,23,68,0.3)] rounded-xl p-3 text-xs text-[#FF1744]">
            <p className="font-semibold mb-1">{t('common.incidents')}</p>
            <p className="text-[rgba(255,23,68,0.8)]">{apiError}</p>
            {apiError.includes('OPENROUTER_API_KEY') && (
              <p className="mt-2 text-text-muted">
                Add your key in <code className="bg-bg-subtle px-1 rounded">.env.local</code> → <code>OPENROUTER_API_KEY=...</code>
              </p>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-3 border-t border-bg-border flex-shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={t('ai.input_placeholder')}
            rows={2}
            className="flex-1 bg-bg-elevated border border-bg-border rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder-text-muted outline-none focus:border-brand-green/50 transition-colors resize-none"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className={cn(
              'w-9 h-9 self-end rounded-xl flex items-center justify-center transition-all flex-shrink-0',
              input.trim() && !loading
                ? 'bg-brand-green text-bg-base hover:bg-brand-green-hover shadow-glow'
                : 'bg-bg-elevated text-text-muted border border-bg-border cursor-not-allowed',
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Simple markdown renderer for AI responses
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith('## '))  return <p key={i} className="font-bold text-text-primary mt-2 first:mt-0">{line.slice(3)}</p>
        if (line.startsWith('# '))   return <p key={i} className="font-bold text-text-primary mt-2 first:mt-0 text-sm">{line.slice(2)}</p>
        if (line.startsWith('**') && line.endsWith('**'))
          return <p key={i} className="font-semibold text-text-primary">{line.slice(2, -2)}</p>
        if (line.startsWith('- '))   return <p key={i} className="flex gap-1.5 mt-0.5"><span className="text-brand-green flex-shrink-0">·</span><span>{formatInline(line.slice(2))}</span></p>
        if (line.startsWith('• '))   return <p key={i} className="flex gap-1.5 mt-0.5"><span className="text-brand-green flex-shrink-0">·</span><span>{formatInline(line.slice(2))}</span></p>
        if (line === '')             return <br key={i} />
        return <p key={i} className="mt-0.5">{formatInline(line)}</p>
      })}
    </>
  )
}

function formatInline(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} className="text-text-primary font-semibold">{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>,
  )
}
