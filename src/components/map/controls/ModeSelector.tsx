'use client'

import { Radio } from 'lucide-react'

export function ModeSelector() {
  return (
    <div className="glass-card flex rounded-2xl px-4 py-2 items-center gap-2 border border-brand/20 bg-[linear-gradient(135deg,rgba(43,213,118,0.14),rgba(10,14,20,0.82))]">
      <div className="w-8 h-8 rounded-xl bg-brand/15 border border-brand/20 flex items-center justify-center">
        <Radio className="w-4 h-4 text-brand" strokeWidth={2.2} />
      </div>
      <div className="flex flex-col items-start leading-none">
        <span className="tracking-tight text-[13px] font-semibold text-text-primary">Temps réel</span>
        <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 text-brand">Marquage trafic au sol</span>
      </div>
    </div>
  )
}
