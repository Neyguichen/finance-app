'use client'

import { useRef, useState, useEffect, CSSProperties } from 'react'
import EspaceSelector from '@/components/layout/EspaceSelector'
import AppMenu from '@/components/layout/AppMenu'
import AdminBanner from '@/components/layout/AdminBanner'
import MobileNav from '@/components/layout/MobileNav'
import BrandMark from '@/components/brand/BrandMark'
import { ReferenceBalanceSetup } from '@/components/ReferenceBalanceSetup'
import FinancialAlertEngine from '@/components/notifications/FinancialAlertEngine'
import OnboardingGuide from '@/components/onboarding/OnboardingGuide'

const HEADER_H = 60
const SCROLL_THRESHOLD = 10
const TOP_THRESHOLD = 10
const BOTTOM_THRESHOLD = 4

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const mainRef = useRef<HTMLDivElement>(null)
  const [headerVisible, setHeaderVisible] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    const check = () => {
      const mobile = navigator.maxTouchPoints > 0 && window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setHeaderVisible(true)
    }

    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const main = mainRef.current
    if (!main || !isMobile) {
      setHeaderVisible(true)
      lastScrollY.current = 0
      return
    }

    lastScrollY.current = main.scrollTop

    const updateHeaderVisibility = () => {
      const currentY = Math.max(0, main.scrollTop)
      const maxScrollY = Math.max(0, main.scrollHeight - main.clientHeight)
      const diff = currentY - lastScrollY.current
      const isNearTop = currentY <= TOP_THRESHOLD
      const isNearBottom = maxScrollY > 0 && currentY >= maxScrollY - BOTTOM_THRESHOLD

      if (isNearTop) {
        setHeaderVisible(true)
      } else if (Math.abs(diff) >= SCROLL_THRESHOLD) {
        if (diff > 0) setHeaderVisible(false)
        else if (!isNearBottom) setHeaderVisible(true)
      }

      lastScrollY.current = currentY
      ticking.current = false
    }

    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      window.requestAnimationFrame(updateHeaderVisibility)
    }

    main.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      main.removeEventListener('scroll', onScroll)
      ticking.current = false
    }
  }, [isMobile])

  const shouldHide = isMobile && !headerVisible

  const headerContainerStyle: CSSProperties = {
    height: `${HEADER_H}px`,
    overflow: 'hidden',
    flexShrink: 0,
  }

  const headerStyle: CSSProperties = {
    height: `${HEADER_H}px`,
    transform: shouldHide ? `translateY(-${HEADER_H}px)` : 'translateY(0)',
    transition: 'transform 250ms ease-in-out',
    willChange: 'transform',
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <FinancialAlertEngine />
      <OnboardingGuide />
      <AdminBanner />

      <div style={headerContainerStyle}>
        <header
          className="flex items-center gap-3 border-b border-slate-800/70 bg-[#08111f]/92 px-3 backdrop-blur-xl sm:px-4"
          style={headerStyle}
        >
          <BrandMark compact={isMobile} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <EspaceSelector />
          </div>
          <AppMenu />
        </header>
      </div>

      <main
        ref={mainRef}
        className="isolate flex-1 overflow-y-auto pb-20"
      >
        <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-4 sm:pt-4">
          <ReferenceBalanceSetup />
        </div>
        {children}
      </main>

      <MobileNav />
    </div>
  )
}
