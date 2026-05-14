'use client'

import { useApp } from '@/lib/contexts/AppContext'

export default function AdminBanner() {
  const { isAdminViewing, exitAdminView } = useApp()

  if (!isAdminViewing) return null

  return (
    <div className="bg-red-900/80 text-red-200 text-center text-xs py-1.5 px-3 flex items-center justify-center gap-2 sticky top-0 z-50">
      <span>👁️ Mode Admin — Vue sur l'espace d'un autre utilisateur</span>
      <button
        onClick={exitAdminView}
        className="bg-red-700 hover:bg-red-600 px-2 py-0.5 rounded text-xs font-medium transition"
      >
        ✕ Quitter
      </button>
    </div>
  )
}