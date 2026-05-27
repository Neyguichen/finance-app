'use client'

import { useScrollDirection } from '@/lib/hooks/useScrollDirection'
import { useEffect, useState } from 'react'

type Props = {
  children: React.ReactNode
}

export default function StickyHeader({ children }: Props) {
  const scrollDir = useScrollDirection()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Desktop : toujours visible. Mobile : cache au scroll vers le bas.
  const shouldHide = isMobile && scrollDir === 'down'

  return (
    <>
      <header
        className={[
          'fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2',
          'bg-slate-900 border-b border-slate-800',
          'transition-transform duration-300 ease-in-out',
          shouldHide ? '-translate-y-full' : 'translate-y-0',
        ].join(' ')}
      >
        {children}
      </header>
      {/* Spacer pour compenser le header fixed */}
      <div className="h-11" aria-hidden="true" />
    </>
  )
}