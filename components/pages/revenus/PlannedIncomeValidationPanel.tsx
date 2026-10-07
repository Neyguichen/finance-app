'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, TrendingUp } from 'lucide-react'
import { formatEuro, localDateISO } from '@/lib/utils'

type Income = {
  id: string
  nom: string
  montant: number
  date_prevue?: string | null
  recu?: boolean
}

type Props = {
  incomes: Income[]
  readOnly?: boolean
  busy?: boolean
  onValidate: (id: string, date: string) => Promise<void> | void
}

function defaultDate(item: Income) {
  return item.date_prevue ? String(item.date_prevue).slice(0,10) : localDateISO()
}

export default function PlannedIncomeValidationPanel({ incomes, readOnly=false, busy=false, onValidate }: Props) {
  const pending = incomes.filter(item => !item.recu)
  const [dates,setDates] = useState<Record<string,string>>({})

  useEffect(() => {
    setDates(current => {
      const next={...current}
      for (const item of pending) if (!next[item.id]) next[item.id]=defaultDate(item)
      return next
    })
  }, [incomes])

  if (!pending.length) return null

  const total=pending.reduce((sum,item)=>sum+Number(item.montant),0)

  return (
    <section className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.025]">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/70 px-4 py-3">
        <TrendingUp className="h-4 w-4 text-emerald-300" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-200">Revenus prévus à valider</h2>
          <p className="text-[10px] text-slate-500">Ils restent prévisionnels tant qu’ils ne sont pas validés.</p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">{formatEuro(total)} en attente</span>
      </div>
      <div className="divide-y divide-slate-800/60">
        {pending.map(item => {
          const date=dates[item.id] || defaultDate(item)
          return (
            <div key={item.id} className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_130px_150px_auto] md:items-end">
              <div>
                <p className="text-sm font-semibold text-slate-200">{item.nom}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">{item.date_prevue ? 'Prévu le '+new Date(item.date_prevue+'T12:00:00').toLocaleDateString('fr-FR') : 'Date prévue non renseignée'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Montant prévu</p>
                <div className="mt-1 h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200">{formatEuro(Number(item.montant))}</div>
              </div>
              <label className="text-[10px] text-slate-500">Date réelle
                <input type="date" value={date} disabled={readOnly||busy} onChange={e=>setDates(prev=>({...prev,[item.id]:e.target.value}))} className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200 outline-none disabled:opacity-60" />
              </label>
              {!readOnly && <button type="button" disabled={busy||!date} onClick={()=>onValidate(item.id,date)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-slate-950 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5"/>Valider</button>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
