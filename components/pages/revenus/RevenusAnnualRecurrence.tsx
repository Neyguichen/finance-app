'use client'

import { Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'
import type { IncomeRecurrenceRow, IncomeHistoryOccurrence } from '@/lib/hooks/useIncomeHistory'

type Props = {
  currentMonth: string
  rows: IncomeRecurrenceRow[]
  onEditOccurrence: (occurrence: IncomeHistoryOccurrence) => void
}

const monthLabels = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc']

export default function RevenusAnnualRecurrence({ currentMonth, rows, onEditOccurrence }: Props) {
  const year = Number(currentMonth.slice(0,4))
  const yearRows = rows.filter(row => Object.keys(row.occurrences).some(month => month.startsWith(String(year))))

  return (
    <Card className="nf-card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-end justify-between gap-3 text-base text-slate-100">
          <div>
            <p>Calendrier des récurrences</p>
            <p className="mt-1 text-[11px] font-normal text-slate-500">Vérifiez les occurrences générées sur l’année et cliquez sur un montant pour le modifier.</p>
          </div>
          <span className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs font-normal text-slate-400">{year}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        {yearRows.length === 0 ? <div className="py-8 text-center text-sm text-slate-600">Aucune récurrence de revenus à afficher cette année.</div> :
        <div className="overflow-x-auto rounded-xl border border-slate-800/70">
          <div className="min-w-[1050px]">
            <div className="grid grid-cols-[220px_repeat(12,1fr)] border-b border-slate-800 bg-slate-950/35 text-[10px] text-slate-500">
              <div className="px-3 py-2">Revenu récurrent</div>
              {monthLabels.map(label => <div key={label} className="border-l border-slate-800/60 px-2 py-2 text-center">{label}</div>)}
            </div>
            {yearRows.map(row => (
              <div key={row.key} className="grid grid-cols-[220px_repeat(12,1fr)] border-b border-slate-800/60 last:border-b-0">
                <div className="px-3 py-2.5">
                  <p className="truncate text-xs font-medium text-slate-200">{row.nom}</p>
                  <p className="mt-1 text-[10px] text-slate-600">{row.type === 'actif' ? 'Actif' : 'Passif'} · {row.frequency === 1 ? 'Tous les mois' : 'Tous les ' + row.frequency + ' mois'}</p>
                </div>
                {monthLabels.map((label,index) => {
                  const key = year + '-' + String(index+1).padStart(2,'0')
                  const occurrence = row.occurrences[key]
                  return <div key={key} className="flex min-h-[48px] items-center justify-center border-l border-slate-800/60 px-1">
                    {occurrence ? <button type="button" onClick={() => onEditOccurrence(occurrence)} className="group flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-200">
                      <span>{formatEuro(occurrence.montant)}</span><Pencil className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                    </button> : <span className="text-xs text-slate-800">—</span>}
                  </div>
                })}
              </div>
            ))}
          </div>
        </div>}
      </CardContent>
    </Card>
  )
}
