'use client'

import React, { useEffect } from 'react'
import { cn } from '@/lib/utils/cn'

interface BottomSheetProps {
  isOpen: boolean
  title?: string
  children: React.ReactNode
  onClose: () => void
  sticky?: boolean
  className?: string
}

export function BottomSheet({
  isOpen,
  title,
  children,
  onClose,
  sticky = false,
  className,
}: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <div
        className="bottom-sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={cn('bottom-sheet', className)}>
        <div className="bottom-sheet-handle" />
        {title && (
          <div className="bottom-sheet-header">
            <h2 className="bottom-sheet-title">{title}</h2>
            <button
              onClick={onClose}
              className="btn-icon"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}
        <div className="bottom-sheet-content">
          {children}
        </div>
      </div>
    </>
  )
}
