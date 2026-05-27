'use client'

import { useRef, useState, useEffect, CSSProperties } from 'react'
import EspaceSelector from '@/components/layout/EspaceSelector'
import AppMenu from '@/components/layout/AppMenu'
import AdminBanner from '@/components/layout/AdminBanner'
import MobileNav from '@/components/layout/MobileNav'

const HEADER_H = 44 // hauteur du header en px

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const mainRef = useRef<HTMLDivElement>(null)
  const [headerVisible, setHeaderVisible] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const lastScrollY = useRef(0)

  // Détecte téléphone (tactile + petit écran)
  useEffect(() => {
    const check = () => setIsMobile(navigator.maxTouchPoints > 0 && window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Écoute le scroll sur <main> (pas window)
  useEffect(() => {
    const main = mainRef.current
    if (!main || !isMobile) {
      setHeaderVisible(true)
      return
    }

    const onScroll = () => {
      const currentY = main.scrollTop
      const diff = currentY - lastScrollY.current
      if (Math.abs(diff) > 10) {
        setHeaderVisible(diff < 0 || currentY < 10)
        lastScrollY.current = currentY
      }
    }

    main.addEventListener('scroll', onScroll, { passive: true })
    return () => main.removeEventListener('scroll', onScroll)
  }, [isMobile])

  const shouldHide = isMobile && !headerVisible

  const headerWrapStyle: CSSProperties = {
    transition: 'margin-top 300ms ease-in-out',
    marginTop: shouldHide ? `-${HEADER_H}px` : '0px',
    height: `${HEADER_H}px`,
    overflow: 'hidden',
    flexShrink: 0,
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <AdminBanner />
      <header
        className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800"
        style={headerWrapStyle}
      >
        <EspaceSelector />
        <AppMenu />
      </header>
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-20 isolate">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}