'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpCircle, CalendarClock, PiggyBank, Plus, ReceiptText } from 'lucide-react'
import { useRouter } from 'next/navigation'

const actions = [
  { label: 'Revenu', icon: ArrowUpCircle, href: '/revenus?add=1', tone: 'text-emerald-300 bg-emerald-500/10' },
  { label: 'Charge fixe', icon: CalendarClock, href: '/depenses?add=fixed', tone: 'text-indigo-300 bg-indigo-500/10' },
  { label: 'Dépense variable', icon: ReceiptText, href: '/depenses?add=variable', tone: 'text-cyan-300 bg-cyan-500/10' },
  { label: 'Mouvement d’épargne', icon: PiggyBank, href: '/epargne?add=movement', tone: 'text-amber-300 bg-amber-500/10' },
]

export default function DashboardQuickAdd() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return createPortal(
    <>
      {open && (
        <button
          type="button"
          aria-label="Fermer les actions rapides"
          className="fixed inset-0 z-40 bg-black/25"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="pointer-events-none fixed bottom-20 left-0 z-50 flex w-[100dvw] flex-col items-end gap-2 px-4">
        {open && actions.map(({ label, icon: Icon, href, tone }) => (
          <button
            key={href}
            type="button"
            onClick={() => {
              setOpen(false)
              router.push(href)
            }}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-700/80 bg-[#101d30] py-1.5 pl-3 pr-2 text-sm font-medium text-slate-200 shadow-lg"
          >
            {label}
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${tone}`}>
              <Icon className="h-4 w-4" />
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-white shadow-xl transition active:scale-95"
          aria-label="Ajouter"
          aria-expanded={open}
        >
          <Plus className={`h-6 w-6 transition-transform ${open ? 'rotate-45' : ''}`} />
        </button>
      </div>
    </>,
    document.body
  )
}
