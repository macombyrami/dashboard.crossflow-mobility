'use client'
import { cn } from '@/lib/utils/cn'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse rounded-md bg-white/5 border border-white/5", className)} />
  )
}

export function CardSkeleton() {
  return (
    <div className="p-5 space-y-4 bg-white/[0.03] border border-white/5 rounded-2xl">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="w-24 h-3" />
          <Skeleton className="w-16 h-2 opacity-50" />
        </div>
      </div>
      <div className="space-y-2 pt-2">
        <Skeleton className="w-full h-24 rounded-xl" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="w-1/2 h-8 rounded-lg" />
        <Skeleton className="w-1/2 h-8 rounded-lg" />
      </div>
    </div>
  )
}

export function MapSkeleton() {
  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0A0B0E]">
      {/* Fake Map Grid */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      {/* Fake Floating Panels */}
      <div className="absolute top-6 left-6 space-y-4 w-64 translate-x-[-100%] animate-in slide-in-from-left duration-1000 fill-mode-forwards">
         <Skeleton className="h-10 w-full rounded-xl" />
         <Skeleton className="h-48 w-full rounded-2xl" />
         <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
      
      {/* Fake HUD */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-96">
         <Skeleton className="h-14 w-full rounded-2xl shadow-2xl" />
      </div>

      {/* Loading Spinner in Center */}
      <div className="absolute inset-0 flex items-center justify-center">
         <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
            <p className="text-[10px] font-black text-brand uppercase tracking-[0.3em] animate-pulse">Initialisation du moteur spatial</p>
         </div>
      </div>
    </div>
  )
}
