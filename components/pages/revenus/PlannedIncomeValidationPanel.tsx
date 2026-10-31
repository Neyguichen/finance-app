'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, EyeOff, RotateCcw, TrendingUp } from 'lucide-react'
import { formatEuro, localDateISO } from '@/lib/utils'

type Income = {
  id: string
  nom: string
  montant: number
  date_prevue?: string | null
  recu?: boolean
  recurrent_id?: string | null
  ignore_at?: string | null
}

type Props = {
  incomes: Income[]
  readOnly?: boolean
  busy?: boolean
  onValidate: (id: string, date: string, amount: number, scope: 'occurrence' | 'future') => Promise<void> | void
  onIgnore: (id: string) => Promise<void> | void
  onRestore: (id: string) => Promise<void> | void
}

function defaultDate(item: Income) {
  return item.date_prevue ? String(item.date_prevue).slice(0,10) : localDateISO()
}

export default function PlannedIncomeValidationPanel({ incomes, readOnly=false, busy=false, onValidate, onIgnore, onRestore }: Props) {
  const pending = incomes.filter(item => !item.recu && !item.ignore_at)
  const ignored = incomes.filter(item => !item.recu && !!item.ignore_at)
  const [dates,setDates] = useState<Record<string,string>>({})
  const [amounts,setAmounts] = useState<Record<string,string>>({})
  const [scopePrompt,setScopePrompt] = useState<{id:string;date:string;amount:number}|null>(null)

  useEffect(() => {
    setDates(current => {
      const next={...current}
      for (const item of pending) if (!next[item.id]) next[item.id]=defaultDate(item)
      return next
    })
  }, [incomes])

  if (!pending.length && !ignored.length) return null

  const total=pending.reduce((sum,item)=>sum+Number(item.montant),0)

  return (
    <section className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.025]">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/70 px-4 py-3">
        <TrendingUp className="h-4 w-4 text-emerald-300" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-200">Revenus prévus à valider</h2>
          <p className="text-[10px] text-slate-500">Ils restent prévisionnels tant qu’ils ne sont pas validés.</p>
        </div>
        {pending.length > 0 && <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">{formatEuro(total)} en attente</span>}
      </div>
      <div className="divide-y divide-slate-800/60">
        {pending.map(item => {
          const date=dates[item.id] || defaultDate(item)
          const amountText=amounts[item.id] ?? String(item.montant)
          const amount=Number(amountText.replace(',', '.'))
          const validAmount=amountText.trim()!=='' && Number.isFinite(amount) && amount>=0
          return (
            <div key={item.id} className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_130px_150px_auto] md:items-end">
              <div>
                <p className="text-sm font-semibold text-slate-200">{item.nom}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">{item.date_prevue ? 'Prévu le '+new Date(item.date_prevue+'T12:00:00').toLocaleDateString('fr-FR') : 'Date prévue non renseignée'}</p>
              </div>
              <label className="text-[10px] text-slate-500">Montant
                <input type="text" inputMode="decimal" aria-label={`Montant réel de ${item.nom}`} value={amountText} disabled={readOnly||busy} onChange={e=>setAmounts(prev=>({...prev,[item.id]:e.target.value}))} className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs font-semibold text-slate-200 outline-none focus:border-emerald-500 disabled:opacity-60" />
              </label>
              <label className="text-[10px] text-slate-500">Date réelle
                <input type="date" value={date} disabled={readOnly||busy} onChange={e=>setDates(prev=>({...prev,[item.id]:e.target.value}))} className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200 outline-none disabled:opacity-60" />
              </label>
              {!readOnly && <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy||!date||!validAmount} onClick={()=>{if(item.recurrent_id && Math.abs(amount-Number(item.montant))>=0.005) setScopePrompt({id:item.id,date,amount}); else void onValidate(item.id,date,amount,'occurrence')}} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-slate-950 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5"/>Valider</button>
                <button type="button" disabled={busy} onClick={()=>onIgnore(item.id)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 text-xs font-medium text-slate-400 transition hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-50"><EyeOff className="h-3.5 w-3.5"/>Ignorer ce mois</button>
              </div>}
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
      {ignored.length > 0 && <div className="border-t border-slate-800/60 bg-slate-950/20">
        <div className="px-4 py-2 text-[10px] font-medium uppercase tracking-wide text-slate-600">Ignorés ce mois</div>
        {ignored.map(item => <div key={item.id} className="flex flex-wrap items-center gap-2 border-t border-slate-800/50 px-4 py-2">
          <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{item.nom}</span>
          <span className="text-xs font-semibold text-slate-500">{formatEuro(Number(item.montant))}</span>
          {!readOnly && <button type="button" disabled={busy} onClick={()=>onRestore(item.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-slate-500 transition hover:bg-slate-800/50 hover:text-slate-300 disabled:opacity-50"><RotateCcw className="h-3 w-3"/>Réactiver</button>}
        </div>)}
      </div>}
    </section>
  )
}
