'use client'

import { AlertTriangle, CheckCircle2, CircleStop, Pencil, Plus, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'
import type { IncomeRecurrenceRow, IncomeHistoryOccurrence } from '@/lib/hooks/useIncomeHistory'

type Props = {
  currentMonth: string
  rows: IncomeRecurrenceRow[]
  preparedMonths: Record<string, string>
  onEditOccurrence: (occurrence: IncomeHistoryOccurrence) => void
  onCreateMissing: (row: IncomeRecurrenceRow, monthKey: string, monthId: string) => void
}

const monthLabels = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc']

function monthDiff(from: string, to: string) {
  const [fy,fm] = from.split('-').map(Number)
  const [ty,tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

function isExpected(row: IncomeRecurrenceRow, monthKey: string) {
  if (!row.startMonth || monthKey < row.startMonth) return false
  const diff = monthDiff(row.startMonth, monthKey)
  return diff >= 0 && diff % Math.max(1, row.frequency) === 0
}

function statusLabel(row: IncomeRecurrenceRow) {
  if (row.active) return 'Active'
  if (!row.stoppedAt) return 'Stoppée'
  const [year, month] = row.stoppedAt.split('-').map(Number)
  return 'Stoppée en ' + new Date(year, month - 1, 1, 12).toLocaleDateString('fr-FR', { month:'long', year:'numeric' })
}

export default function RevenusAnnualRecurrence({ currentMonth, rows, preparedMonths, onEditOccurrence, onCreateMissing }: Props) {
  const year = Number(currentMonth.slice(0,4))
  const yearStart = year + '-01'
  const yearEnd = year + '-12'

  const yearRows = rows.filter(row => {
    const hasOccurrence = Object.keys(row.occurrences).some(month => month.startsWith(String(year)))
    const started = !row.startMonth || row.startMonth <= yearEnd
    const notStoppedBeforeYear = !row.stoppedAt || row.stoppedAt >= yearStart
    return hasOccurrence || (started && notStoppedBeforeYear)
  })

  return (
    <Card className="nf-card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-end justify-between gap-3 text-base text-slate-100">
          <div>
            <p>Contrôle des récurrences</p>
            <p className="mt-1 text-[11px] font-normal text-slate-500">Repérez en un coup d’œil les occurrences présentes, manquantes ou stoppées.</p>
          </div>
          <span className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs font-normal text-slate-400">{year}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 p-3 pt-1">
        {yearRows.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-600">Aucune récurrence à contrôler cette année.</div>
        ) : yearRows.map(row => {
          const TypeIcon = row.type === 'actif' ? TrendingUp : TrendingDown
          return (
            <div key={row.key} className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/20">
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-800/60 px-3 py-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className={'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ' + (row.type === 'actif' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-indigo-500/10 text-indigo-300')}>
                    <TypeIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-200">{row.nom}</p>
                    <p className="mt-0.5 text-[10px] text-slate-600">{row.type === 'actif' ? 'Actif' : 'Passif'} · {row.frequency === 1 ? 'Tous les mois' : 'Tous les ' + row.frequency + ' mois'}</p>
                  </div>
                </div>
                <span className={'rounded-full px-2.5 py-1 text-[10px] font-medium ' + (row.active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-400')}>
                  {statusLabel(row)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-12">
                {monthLabels.map((label,index) => {
                  const monthKey = year + '-' + String(index+1).padStart(2,'0')
                  const occurrence = row.occurrences[monthKey]
                  const expected = isExpected(row, monthKey)
                  const preparedMonthId = preparedMonths[monthKey]
                  const stopped = !!row.stoppedAt && monthKey >= row.stoppedAt
                  const beforeStart = !!row.startMonth && monthKey < row.startMonth
                  const amountChanged = !!occurrence && Math.abs(occurrence.montant - row.baseAmount) >= 0.01

                  if (occurrence) {
                    return (
                      <button key={monthKey} type="button" onClick={() => onEditOccurrence(occurrence)} className={'group rounded-xl border p-2 text-left transition ' + (amountChanged ? 'border-amber-400/25 bg-amber-500/[0.05] hover:bg-amber-500/[0.09]' : 'border-slate-800 bg-slate-900/55 hover:border-indigo-500/35 hover:bg-indigo-500/[0.06]')}>
                        <div className="flex items-center justify-between gap-1"><span className="text-[10px] font-medium text-slate-500">{label}</span><CheckCircle2 className="h-3 w-3 text-emerald-400/80" /></div>
                        <p className="mt-1 truncate text-[11px] font-semibold text-slate-200">{formatEuro(occurrence.montant)}</p>
                        <p className={'mt-1 text-[9px] ' + (amountChanged ? 'text-amber-300' : occurrence.recu ? 'text-emerald-400' : 'text-slate-600')}>{amountChanged ? 'Montant modifié' : occurrence.recu ? 'Reçu' : 'Prévu'}</p>
                        <Pencil className="mt-1 h-3 w-3 text-slate-700 opacity-0 transition group-hover:opacity-100" />
                      </button>
                    )
                  }

                  if (stopped) {
                    return (
                      <div key={monthKey} className="rounded-xl border border-slate-800/60 bg-slate-950/45 p-2 text-slate-700">
                        <div className="flex items-center justify-between"><span className="text-[10px] font-medium">{label}</span><CircleStop className="h-3 w-3" /></div>
                        <p className="mt-2 text-[10px] font-medium">Stoppée</p>
                      </div>
                    )
                  }

                  if (expected && preparedMonthId) {
                    return (
                      <button key={monthKey} type="button" onClick={() => onCreateMissing(row, monthKey, preparedMonthId)} className="rounded-xl border border-amber-400/20 bg-amber-500/[0.05] p-2 text-left transition hover:bg-amber-500/[0.1]">
                        <div className="flex items-center justify-between"><span className="text-[10px] font-medium text-amber-300">{label}</span><AlertTriangle className="h-3 w-3 text-amber-300" /></div>
                        <p className="mt-2 text-[10px] font-semibold text-amber-300">Manquante</p>
                        <p className="mt-1 flex items-center gap-1 text-[9px] text-amber-400/70"><Plus className="h-3 w-3" />Créer</p>
                      </button>
                    )
                  }

                  if (expected && !preparedMonthId && !beforeStart) {
                    return (
                      <div key={monthKey} className="rounded-xl border border-slate-800/50 bg-slate-950/20 p-2">
                        <span className="text-[10px] font-medium text-slate-700">{label}</span>
                        <p className="mt-2 text-[10px] text-slate-700">À venir</p>
                      </div>
                    )
                  }

                  return (
                    <div key={monthKey} className="rounded-xl border border-transparent p-2">
                      <span className="text-[10px] font-medium text-slate-800">{label}</span>
                      <p className="mt-2 text-[10px] text-slate-800">—</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
