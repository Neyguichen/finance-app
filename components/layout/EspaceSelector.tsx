'use client'

import { useApp } from '@/components/AppContext'
import { usePathname } from 'next/navigation'

export default function EspaceSelector() {
  const { espaces, espace, setEspaceId } = useApp()
  const pathname = usePathname()

  // Masquer sur la page login
  if (pathname === '/login') return null

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      {espaces.map(e => {
        const active = espace?.id === e.id
        return (
          <button
            key={e.id}
            onClick={() => setEspaceId(e.id)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              active
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {e.icone} {e.nom}
          </button>
        )
      })}
    </div>
  )
}