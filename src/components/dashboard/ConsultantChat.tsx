'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, Trash2 } from 'lucide-react'
import { ConsultantMessage } from './ConsultantMessage'
import { ConsultantQuickActions } from './ConsultantQuickActions'
import { askConsultant, type ConsultantContext } from '@/lib/api/ai/consultant'
import { cn } from '@/lib/utils/cn'

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
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px] sm:min-h-[600px] max-w-4xl mx-auto w-full relative">
      
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-4">
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

      {/* Persistence Controls */}
      <div className="absolute -top-12 right-0 flex items-center gap-2">
         <button 
           onClick={() => setMessages([messages[0]])}
           className="p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-rose-500/10 hover:border-rose-500/20 text-text-muted hover:text-rose-400 transition-all group"
           title="Effacer la conversation"
         >
           <Trash2 className="w-4 h-4 group-hover:scale-110" />
         </button>
      </div>

      {/* Input Section */}
      <div className="mt-4 pt-4 border-t border-white/10">
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
