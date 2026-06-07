'use client'

import { useRef, useState, useEffect, CSSProperties } from 'react'
import EspaceSelector from '@/components/layout/EspaceSelector'
import AppMenu from '@/components/layout/AppMenu'
import AdminBanner from '@/components/layout/AdminBanner'
import MobileNav from '@/components/layout/MobileNav'

const HEADER_H = 44 // hauteur du header en px
const SCROLL_THRESHOLD = 10
const TOP_THRESHOLD = 10
const BOTTOM_THRESHOLD = 4

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const mainRef = useRef<HTMLDivElement>(null)

  const [headerVisible, setHeaderVisible] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  // Détecte téléphone (tactile + petit écran)
  useEffect(() => {
    const check = () => {
      const mobile =
        navigator.maxTouchPoints > 0 && window.innerWidth < 768

      setIsMobile(mobile)

      // Sur desktop, l'en-tête doit toujours rester visible
      if (!mobile) {
        setHeaderVisible(true)
      }
    }

    check()
    window.addEventListener('resize', check)

    return () => {
      window.removeEventListener('resize', check)
    }
  }, [])

  // Écoute le scroll sur <main> (pas window)
  useEffect(() => {
    const main = mainRef.current

    if (!main || !isMobile) {
      setHeaderVisible(true)
      lastScrollY.current = 0
      return
    }

    // Synchronise la position initiale lors de l'activation mobile
    lastScrollY.current = main.scrollTop

    const updateHeaderVisibility = () => {
      const currentY = Math.max(0, main.scrollTop)
      const maxScrollY = Math.max(
        0,
        main.scrollHeight - main.clientHeight,
      )

      const diff = currentY - lastScrollY.current
      const isNearTop = currentY <= TOP_THRESHOLD
      const isNearBottom =
        maxScrollY > 0 &&
        currentY >= maxScrollY - BOTTOM_THRESHOLD

      // Toujours afficher l'en-tête en haut de la page
      if (isNearTop) {
        setHeaderVisible(true)
        lastScrollY.current = currentY
        ticking.current = false
        return
      }

      // Ignore les petits mouvements parasites
      if (Math.abs(diff) < SCROLL_THRESHOLD) {
        ticking.current = false
        return
      }

      if (diff > 0) {
        // L'utilisateur descend : cacher l'en-tête
        setHeaderVisible(false)
      } else if (!isNearBottom) {
        /*
         * L'utilisateur remonte : afficher l'en-tête.
         *
         * À proximité du bas de page, Chrome mobile peut ajuster légèrement
         * scrollTop pendant le rebond ou le redimensionnement de son interface.
         * On ignore donc ces faux mouvements vers le haut.
         */
        setHeaderVisible(true)
      }

      lastScrollY.current = currentY
      ticking.current = false
    }

    const onScroll = () => {
      if (ticking.current) {
        return
      }

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

  /*
   * Le conteneur conserve toujours une hauteur fixe.
   * Seul le contenu visuel du header est déplacé.
   *
   * La hauteur de <main> ne change donc jamais pendant le scroll,
   * ce qui évite la boucle visible/caché au bas de la page.
   */
  const headerContainerStyle: CSSProperties = {
    height: `${HEADER_H}px`,
    overflow: 'hidden',
    flexShrink: 0,
  }

  const headerStyle: CSSProperties = {
    height: `${HEADER_H}px`,
    transform: shouldHide
      ? `translateY(-${HEADER_H}px)`
      : 'translateY(0)',
    transition: 'transform 250ms ease-in-out',
    willChange: 'transform',
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <AdminBanner />

      <div style={headerContainerStyle}>
        <header
          className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800"
          style={headerStyle}
        >
          <EspaceSelector />
          <AppMenu />
        </header>
      </div>

      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto pb-20 isolate"
      >
        {children}
      </main>

      <MobileNav />
    </div>
  )
}