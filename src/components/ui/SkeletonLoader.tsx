'use client'

import React from 'react'
import { cn } from '@/lib/utils/cn'

interface SkeletonLoaderProps {
  type: 'card' | 'text' | 'chart' | 'map' | 'line' | 'avatar'
  count?: number
  className?: string
}

const skeletonTypeClasses = {
  card: 'h-32 rounded-lg',
  text: 'h-4 rounded',
  chart: 'h-48 rounded-lg',
  map: 'h-96 rounded-lg',
  line: 'h-20 rounded-lg',
  avatar: 'h-10 w-10 rounded-full',
}

export function SkeletonLoader({
  type,
  count = 1,
  className,
}: SkeletonLoaderProps) {
  const items = Array.from({ length: count }, (_, i) => i)

  if (type === 'text') {
    return (
      <div className="space-y-2">
        {items.map((i) => (
          <div
            key={i}
            className={cn(
              'skeleton skeleton-text',
              i === items.length - 1 && 'w-4/5',
              className
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn(
      type === 'card' ? 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4' : 'space-y-4'
    )}>
      {items.map((i) => (
        <div
          key={i}
          className={cn(
            'skeleton',
            skeletonTypeClasses[type as keyof typeof skeletonTypeClasses],
            className
          )}
        />
      ))}
    </div>
  )
}
