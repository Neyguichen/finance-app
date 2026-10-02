'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'

export default function RevenusFab({ onAdd }: { onAdd: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-end px-4 md:hidden">
      <button
        type="button"
        onClick={onAdd}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-white shadow-xl transition active:scale-95"
        aria-label="Ajouter un revenu"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>,
    document.body,
  )
}
