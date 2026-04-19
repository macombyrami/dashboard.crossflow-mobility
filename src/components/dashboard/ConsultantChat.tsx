'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, Trash2, Download, Sparkles, FileJson, FileText, Share2, PlusCircle } from 'lucide-react'
import { ConsultantMessage } from './ConsultantMessage'
import { ConsultantQuickActions } from './ConsultantQuickActions'
import { askConsultant, type ConsultantContext } from '@/lib/api/ai/consultant'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'
import jsPDF from 'jspdf'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Props {
  initialContext: ConsultantContext
}

export function ConsultantChat({ initialContext }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Bonjour. Je suis CrossFlow AI Consultant. Comment puis-je vous aider à optimiser la mobilité de **${initialContext.city}** aujourd'hui ?`,
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPredictiveMode, setIsPredictiveMode] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleExportPDF = () => {
    const doc = jsPDF ? new jsPDF() : null
    if (!doc) return
    doc.setFontSize(16)
    doc.text(`Conversation IA CrossFlow - ${initialContext.city}`, 10, 10)
    doc.setFontSize(10)
    messages.forEach((m, i) => {
      const y = 20 + (i * 15)
      doc.text(`${m.role.toUpperCase()}: ${m.content.slice(0, 80)}...`, 10, y)
    })
    doc.save('conversation_ia.pdf')
    toast.success('Rapport PDF généré')
  }

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'conversation-ai.json'
    link.click()
    toast.success('Données JSON exportées')
  }

  const handleSend = async (text: string) => {
    if (!text.trim()) return
    setIsLoading(true)
    
    // Append user message
    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    try {
      const { content } = await askConsultant(text, initialContext)
      const assistantMsg: Message = { role: 'assistant', content, timestamp: new Date() }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      console.error('AI Error:', err)
      const errorMsg: Message = { 
        role: 'assistant', 
        content: "🚨 Une erreur est survenue lors de la consultation. Veuillez vérifier votre connexion au moteur d'intelligence.",
        timestamp: new Date() 
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn(
      "flex flex-col h-[calc(100dvh-120px)] max-w-5xl mx-auto w-full relative transition-all duration-500",
      isPredictiveMode && "ring-2 ring-brand/20 rounded-3xl p-1 bg-brand/5"
    )}>
      
      {/* Integrated Action Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setIsPredictiveMode(!isPredictiveMode)}
             className={cn(
               "px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
               isPredictiveMode 
                ? "bg-brand text-black border-brand shadow-glow" 
                : "bg-white/5 border-white/10 text-text-muted hover:text-brand hover:border-brand/40"
             )}
           >
             <Sparkles className="w-3 h-3" />
             {isPredictiveMode ? 'Prédictions ON' : 'Prédictions OFF'}
           </button>
        </div>

        <div className="flex items-center gap-2">
           <div className="relative group/export items-center flex">
             <button className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-text-muted hover:text-white transition-all">
                <Download className="w-3.5 h-3.5" />
             </button>
             <div className="absolute right-0 top-full mt-2 w-36 p-2 bg-[#0B0C10] glass rounded-xl border border-white/10 opacity-0 group-hover/export:opacity-100 transition-all pointer-events-none group-hover/export:pointer-events-auto z-50">
                <button onClick={handleExportPDF} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-white">
                  <FileText className="w-3.5 h-3.5 text-brand" /> PDF
                </button>
                <button onClick={handleExportJSON} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-white">
                  <FileJson className="w-3.5 h-3.5 text-brand" /> JSON
                </button>
             </div>
           </div>
           <button 
             onClick={() => setMessages([messages[0]])}
             className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-rose-500/10 hover:border-rose-500/20 text-text-muted hover:text-rose-400 transition-all"
           >
             <Trash2 className="w-3.5 h-3.5" />
           </button>
        </div>
      </div>
      
      {/* Top Banner for Predictive Mode */}
      {isPredictiveMode && (
        <div className="mx-4 mb-4 p-4 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
           <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-brand animate-pulse" />
              <div>
                 <p className="text-[11px] font-black text-brand uppercase tracking-widest italic">Insights Prédictifs Activés</p>
                 <p className="text-[9px] text-brand/60 uppercase tracking-tight">Analyse anticipée J+7 & Recommandations prioritaires</p>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-lg bg-brand/20 text-[9px] font-black text-brand uppercase border border-brand/20">Confiance 92%</span>
           </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-6 px-4">
        <ConsultantQuickActions onAction={handleSend} disabled={isLoading} />
        
        {messages.map((m, i) => (
          <ConsultantMessage 
            key={i} 
            role={m.role} 
            content={m.content} 
            timestamp={m.timestamp} 
          />
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 animate-pulse mb-8 ml-4">
             <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-brand animate-spin" />
             </div>
             <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em]">Consultant IA en train de réfléchir...</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Section */}
      <div className="p-4 bg-[#08090B] border-t border-white/5 rounded-b-3xl">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input) }}
          className="relative group lg:px-4"
        >
          <div className="absolute inset-0 bg-brand/5 blur-3xl opacity-0 group-focus-within:opacity-40 transition-opacity duration-1000" />
          <div className="relative glass p-2 rounded-[28px] border border-white/10 bg-[#141519]/60 shadow-2xl focus-within:border-brand/40 transition-all flex items-center gap-2">
             <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6 text-text-muted" />
             </div>
             <input
               value={input}
               onChange={(e) => setInput(e.target.value)}
               disabled={isLoading}
               placeholder="Posez votre question sur la mobilité..."
               className="flex-1 bg-transparent border-none focus:ring-0 text-base text-white placeholder:text-text-muted/60 pl-2 py-4"
             />
             <button
               type="submit"
               disabled={isLoading || !input.trim()}
               className={cn(
                 "w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0",
                 input.trim() ? "bg-brand text-black shadow-glow" : "bg-white/5 text-text-muted opacity-50"
               )}
             >
               <Send className="w-5 h-5" />
             </button>
          </div>
        </form>
        <p className="text-[10px] text-center text-text-muted/40 font-bold uppercase tracking-[0.2em] mt-6 select-none">
           IA décisionnelle · Analyse basée sur des données probantes · CrossFlow 2026
        </p>
      </div>
    </div>
  )
}
