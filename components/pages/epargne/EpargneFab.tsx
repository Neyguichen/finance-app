'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useVisualViewport } from '@/lib/hooks/useVisualViewport'
import { Plus } from 'lucide-react'

export default function EpargneFab({ onOpenMouvement }: { onOpenMouvement: () => void }) {
  const [mounted, setMounted] = useState(false)
  const visualViewport = useVisualViewport()

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return createPortal(
    <div className="pointer-events-none fixed bottom-20 z-50 flex justify-end" style={{ left: visualViewport.offsetLeft, width: visualViewport.width ?? undefined, paddingRight: 16 }}>
      <button
        type="button"
        onClick={onOpenMouvement}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-white shadow-xl transition active:scale-95"
        aria-label="Ajouter un mouvement d’épargne"
        title="Ajouter un mouvement"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>,
    document.body
  )
}
