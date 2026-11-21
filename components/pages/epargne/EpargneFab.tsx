'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Plus, WalletCards } from 'lucide-react'

type Props = {
  onEnvelope: () => void
  onSave: () => void
  onWithdraw: () => void
  onTransfer: () => void
}

export default function EpargneFab({ onEnvelope, onSave, onWithdraw, onTransfer }: Props) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => setMounted(true), [])

  const choose = (action: () => void) => {
    setOpen(false)
    action()
  }

  if (!mounted) return null
  return createPortal(
    <>
      {open && (
        <button type="button" aria-label="Fermer les actions d’épargne"
          className="fixed inset-0 z-40 bg-black/35 md:hidden" onClick={() => setOpen(false)} />
      )}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-end gap-2 px-4 md:hidden">
        {open && ([
          { label: 'Nouvelle enveloppe', icon: WalletCards, action: onEnvelope },
          { label: 'Épargner', icon: ArrowDownToLine, action: onSave },
          { label: 'Reprendre', icon: ArrowUpFromLine, action: onWithdraw },
          { label: 'Transférer', icon: ArrowLeftRight, action: onTransfer },
        ] as const).map(({ label, icon: Icon, action }) => (
          <button key={label} type="button" onClick={() => choose(action)}
            className="pointer-events-auto flex min-h-11 items-center gap-2 rounded-full border border-slate-700/80 bg-[#101d30] py-1.5 pl-3 pr-2 text-sm font-medium text-slate-200 shadow-lg">
            {label}
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
              <Icon className="h-4 w-4" />
            </span>
          </button>
        ))}
        <button type="button" onClick={() => setOpen(value => !value)}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-white shadow-xl transition active:scale-95"
          aria-label="Actions d’épargne" aria-expanded={open}>
          <Plus className={`h-6 w-6 transition-transform ${open ? 'rotate-45' : ''}`} />
        </button>
      </div>
    </>,
    document.body,
  )
}
