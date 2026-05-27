'use client'

import { useState, useEffect, useRef } from 'react'

export function useScrollDirection() {
  const [scrollDir, setScrollDir] = useState<'up' | 'down'>('up')
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    const threshold = 10 // pixels minimum avant de changer de direction

    const updateScrollDir = () => {
      const currentY = window.scrollY
      const diff = currentY - lastScrollY.current

      if (Math.abs(diff) < threshold) {
        ticking.current = false
        return
      }

      setScrollDir(diff > 0 ? 'down' : 'up')
      lastScrollY.current = currentY > 0 ? currentY : 0
      ticking.current = false
    }

    const onScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollDir)
        ticking.current = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return scrollDir
}