'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'

type BudgetProgress = {
  id: string
  name: string
  icon: string
  planned: number
  actual: number
  remaining: number
}

type Props = { budgets: BudgetProgress[] }

export default function BudgetsV2({ budgets }: Props) {
  const visible = budgets.slice(0, 6)

  return (
    <Card className="nf-card-hover h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-3 text-base text-slate-100">
          <span>Mes budgets</span>
          <Link href="/depenses?view=planned&plannedFilter=variable" className="inline-flex items-center gap-1 text-xs font-normal text-slate-400 hover:text-indigo-300">
            Voir tous les budgets <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/20 p-5 text-center">
            <p className="text-sm text-slate-400">Aucun budget variable prévu pour ce mois.</p>
            <Link href="/depenses?view=planned&plannedFilter=variable" className="mt-2 inline-block text-xs text-indigo-300 hover:text-indigo-200">Gérer mes budgets →</Link>
          </div>
        ) : (
          <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
            {visible.map(budget => {
              const percent = budget.planned > 0 ? Math.round((budget.actual / budget.planned) * 100) : 0
              const barPercent = Math.max(0, Math.min(100, percent))
              const exceeded = budget.remaining < 0
              return (
                <div key={budget.id} className="rounded-xl border border-slate-800/70 bg-slate-950/25 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2"><span className="text-base" aria-hidden="true">{budget.icon}</span><span className="truncate text-sm font-semibold text-slate-200">{budget.name}</span></div>
                    <span className={'text-xs font-semibold ' + (exceeded ? 'text-rose-400' : 'text-slate-400')}>{percent}%</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-2">
                    <p className="text-xs text-slate-300">{formatEuro(budget.actual)} <span className="text-slate-600">/ {formatEuro(budget.planned)}</span></p>
                    <p className={'text-[11px] font-medium ' + (exceeded ? 'text-rose-400' : 'text-emerald-400')}>
                      {exceeded ? formatEuro(Math.abs(budget.remaining)) + ' dépassés' : formatEuro(budget.remaining) + ' restants'}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className={'h-full rounded-full ' + (exceeded ? 'bg-rose-400' : percent >= 80 ? 'bg-amber-400' : 'bg-indigo-400')} style={{ width: String(barPercent) + '%' }} /></div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
