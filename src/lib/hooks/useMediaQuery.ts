'use client'
import { useState, useEffect } from 'react'

/**
 * 📱 useMediaQuery (Responsive Hook)
 * 
 * Performance Optimized: Standard breakpoint detection for Mobile/Desktop branching.
 * 10-minute cache on Sytadin proxy.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [matches, query])

  return matches
}
