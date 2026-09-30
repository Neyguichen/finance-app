'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarClock, Plus, ReceiptText } from 'lucide-react'

export default function DepensesFab({
  onFixed,
  onVariable,
}: {
  onFixed: () => void
  onVariable: () => void
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const choose = (action: () => void) => {
    setOpen(false)
    action()
  }

  if (!mounted) return null

  return createPortal(
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/35"
          aria-label="Fermer les actions"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
        {open && (
          <>
            <button
              type="button"
              onClick={() => choose(onFixed)}
              className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-[#101d30] py-1.5 pl-3 pr-2 text-sm font-medium text-slate-200 shadow-lg"
            >
              Charge fixe
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
                <CalendarClock className="h-4 w-4" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => choose(onVariable)}
              className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-[#101d30] py-1.5 pl-3 pr-2 text-sm font-medium text-slate-200 shadow-lg"
            >
              Dépense variable
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300">
                <ReceiptText className="h-4 w-4" />
              </span>
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-white shadow-xl transition active:scale-95"
          aria-label="Ajouter une dépense"
          aria-expanded={open}
        >
          <Plus className={`h-6 w-6 transition-transform ${open ? 'rotate-45' : ''}`} />
        </button>
      </div>
    </>,
    document.body
  )
}
