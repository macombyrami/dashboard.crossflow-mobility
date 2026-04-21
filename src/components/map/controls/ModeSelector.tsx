'use client'

import { Radio } from 'lucide-react'

export function ModeSelector() {
  return (
    <div className="flex rounded-2xl border border-black/8 bg-white/92 px-4 py-2 shadow-lg backdrop-blur-xl items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50">
        <Radio className="h-4 w-4 text-emerald-600" strokeWidth={2.2} />
      </div>
      <div className="flex flex-col items-start leading-none">
        <span className="text-[13px] font-semibold tracking-tight text-slate-900">Navigation en temps réel</span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">
          Réseau routier + trafic superposé
        </span>
      </div>
    </div>
  )
}
