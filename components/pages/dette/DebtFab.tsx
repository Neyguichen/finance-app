'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDownToLine, HandCoins, Plus, Wallet } from 'lucide-react'

type Props = { onDebt: () => void; onClaim: () => void; onRepayment: () => void }

export default function DebtFab({onDebt,onClaim,onRepayment}:Props) {
  const [mounted,setMounted] = useState(false)
  const [open,setOpen] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  const actions = [
    {name:'Nouvelle dette',icon:Wallet,onClick:onDebt},
    {name:'On me doit',icon:HandCoins,onClick:onClaim},
    {name:'Nouveau remboursement',icon:ArrowDownToLine,onClick:onRepayment},
  ] as const
  return createPortal(<>
    {open && <button type="button" aria-label="Fermer le menu des dettes" onClick={() => setOpen(false)}
      className="fixed inset-0 z-40 bg-black/35 md:hidden" />}
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-end gap-2 px-4 md:hidden">
      {open && actions.map(({name,icon:Icon,onClick}) =>
        <button key={name} type="button" onClick={() => {setOpen(false);onClick()}}
          className="pointer-events-auto flex min-h-11 items-center gap-2 rounded-full border border-slate-700/80 bg-[#101d30] py-1.5 pl-3 pr-2 text-sm font-medium text-slate-200 shadow-lg">
          {name}<span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300"><Icon className="h-4 w-4"/></span>
        </button>
      )}
      <button type="button" aria-label="Ajouter une dette ou un remboursement" aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-white shadow-xl transition active:scale-95">
        <Plus className={'h-6 w-6 transition-transform ' + (open ? 'rotate-45' : '')}/>
      </button>
    </div>
  </>,document.body)
}
