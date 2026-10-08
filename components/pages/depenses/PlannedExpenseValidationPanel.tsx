'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ReceiptText } from 'lucide-react'
import { formatEuro, localDateISO } from '@/lib/utils'

type PendingExpense = {
  id: string
  title: string
  subtitle?: string | null
  amount: number
  recurring?: boolean
  plannedDate?: string | null
}

type Props = {
  entries: PendingExpense[]
  readOnly?: boolean
  busy?: boolean
  onValidate: (id: string, date: string, amount: number, scope: 'occurrence' | 'future') => Promise<void> | void
}

function defaultDate(item: PendingExpense) {
  return item.plannedDate ? String(item.plannedDate).slice(0,10) : localDateISO()
}

export default function PlannedExpenseValidationPanel({ entries, readOnly=false, busy=false, onValidate }: Props) {
  const [dates,setDates]=useState<Record<string,string>>({})
  const [amounts,setAmounts]=useState<Record<string,string>>({})
  const [scopePrompt,setScopePrompt]=useState<{id:string;date:string;amount:number}|null>(null)

  useEffect(()=>{
    setDates(current=>{
      const next={...current}
      for(const item of entries) if(!next[item.id]) next[item.id]=defaultDate(item)
      return next
    })
  },[entries])

  if(!entries.length) return null
  const total=entries.reduce((sum,item)=>sum+Number(item.amount),0)

  return (
    <section className="rounded-2xl border border-amber-400/15 bg-amber-500/[0.025]">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/70 px-4 py-3">
        <ReceiptText className="h-4 w-4 text-amber-300"/>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-200">Dépenses prévues à valider</h2>
          <p className="text-[10px] text-slate-500">Ces mouvements sont pris en compte dans le prévu mais pas encore dans le réel.</p>
        </div>
        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">{formatEuro(total)} en attente</span>
      </div>
      <div className="divide-y divide-slate-800/60">
        {entries.map(item=>{
          const date=dates[item.id]||defaultDate(item)
          const amountText=amounts[item.id] ?? String(item.amount)
          const amount=Number(amountText.replace(',', '.'))
          const validAmount=amountText.trim()!=='' && Number.isFinite(amount) && amount>=0
          return (
            <div key={item.id} className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_130px_150px_auto] md:items-end">
              <div>
                <p className="text-sm font-semibold text-slate-200">{item.title}</p>
                {item.subtitle && <p className="mt-0.5 text-[10px] text-slate-500">{item.subtitle}</p>}
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Montant</p>
                <input type="text" inputMode="decimal" aria-label={`Montant réel de ${item.title}`} value={amountText} disabled={readOnly||busy} onChange={e=>setAmounts(prev=>({...prev,[item.id]:e.target.value}))} className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs font-semibold text-slate-200 outline-none focus:border-emerald-500 disabled:opacity-60" />
              </div>
              <label className="text-[10px] text-slate-500">Date réelle
                <input type="date" value={date} disabled={readOnly||busy} onChange={e=>setDates(prev=>({...prev,[item.id]:e.target.value}))} className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200 outline-none disabled:opacity-60"/>
              </label>
              {!readOnly && <button type="button" disabled={busy||!date||!validAmount} onClick={()=>{if(item.recurring && Math.abs(amount-Number(item.amount))>=0.005) setScopePrompt({id:item.id,date,amount}); else void onValidate(item.id,date,amount,'occurrence')}} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-slate-950 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5"/>Valider</button>}
            </div>
          )
        })}
      </div>
      {scopePrompt && <div className="border-t border-slate-700 px-4 py-3" role="group" aria-label="Portée de la modification du montant">
        <p className="mb-2 text-xs text-slate-200">Appliquer le nouveau montant à :</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={async()=>{const x=scopePrompt;await onValidate(x.id,x.date,x.amount,'occurrence');setScopePrompt(null)}} className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 disabled:opacity-50">Cette occurrence uniquement</button>
          <button type="button" disabled={busy} onClick={async()=>{const x=scopePrompt;await onValidate(x.id,x.date,x.amount,'future');setScopePrompt(null)}} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50">Cette occurrence et les suivantes</button>
          <button type="button" disabled={busy} onClick={()=>setScopePrompt(null)} className="rounded-lg px-3 py-2 text-xs text-slate-400">Annuler</button>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">Les mois passés ne seront pas modifiés.</p>
      </div>}
    </section>
  )
}
