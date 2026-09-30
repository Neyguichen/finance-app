'use client'

import { useEffect, useState } from 'react'

type VisualViewportBounds = {
  width: number | null
  height: number | null
  offsetLeft: number
  offsetTop: number
}

export function useVisualViewport() {
  const [bounds, setBounds] = useState<VisualViewportBounds>({
    width: null,
    height: null,
    offsetLeft: 0,
    offsetTop: 0,
  })

  useEffect(() => {
    const update = () => {
      const viewport = window.visualViewport
      setBounds({
        width: viewport?.width ?? window.innerWidth,
        height: viewport?.height ?? window.innerHeight,
        offsetLeft: viewport?.offsetLeft ?? 0,
        offsetTop: viewport?.offsetTop ?? 0,
      })
    }

    update()

    const viewport = window.visualViewport
    window.addEventListener('resize', update)
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)

    return () => {
      window.removeEventListener('resize', update)
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
    }
  }, [])

  return bounds
}
