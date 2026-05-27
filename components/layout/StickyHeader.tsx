'use client'

import { useScrollDirection } from '@/lib/hooks/useScrollDirection'
import { useEffect, useState, CSSProperties } from 'react'

type Props = {
  children: React.ReactNode
}

export default function StickyHeader({ children }: Props) {
  const scrollDir = useScrollDirection()
  const [isMobileDevice, setIsMobileDevice] = useState(false)

  useEffect(() => {
    // Mobile = écran tactile + largeur < 768px (téléphone)
    // Desktop = souris OU largeur >= 768px (tablette/ordi)
    const check = () => {
      setIsMobileDevice(navigator.maxTouchPoints > 0 && window.innerWidth < 768)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Desktop / tablette : toujours visible. Téléphone : cache au scroll vers le bas.
  const shouldHide = isMobileDevice && scrollDir === 'down'

  const headerStyle: CSSProperties = {
    transition: 'transform 300ms ease-in-out',
    transform: shouldHide ? 'translateY(-100%)' : 'translateY(0)',
  }

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800"
        style={headerStyle}
      >
        {children}
      </header>
      {/* Spacer pour compenser le header fixed */}
      <div className="h-11" aria-hidden="true" />
    </>
  )
}