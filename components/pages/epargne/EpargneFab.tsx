'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

type Props = {
  onOpenMouvement: () => void
  onOpenEnveloppe: () => void
}

export default function EpargneFab({ onOpenMouvement, onOpenEnveloppe }: Props) {
  const [fabOpen, setFabOpen] = useState(false)

  return (
    <>
      {fabOpen && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setFabOpen(false)} />
      )}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col-reverse items-center gap-3">
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className="w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className={`w-7 h-7 transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`} />
        </button>
        {fabOpen && (
          <>
            <button
              onClick={() => { setFabOpen(false); onOpenMouvement() }}
              className="flex items-center gap-2 animate-fade-in"
            >
              <span className="bg-slate-600 text-white text-xs px-2 py-1 rounded-lg shadow">Mouvement</span>
              <span className="w-11 h-11 rounded-full bg-primary text-white shadow-lg flex items-center justify-center text-lg">💰</span>
            </button>
            <button
              onClick={() => { setFabOpen(false); onOpenEnveloppe() }}
              className="flex items-center gap-2 animate-fade-in"
            >
              <span className="bg-slate-600 text-white text-xs px-2 py-1 rounded-lg shadow">Enveloppe</span>
              <span className="w-11 h-11 rounded-full bg-primary text-white shadow-lg flex items-center justify-center text-lg">✉️</span>
            </button>
          </>
        )}
      </div>
    </>
  )
}