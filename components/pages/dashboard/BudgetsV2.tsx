'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'

type BudgetProgress = {
  id: string
  name: string
  icon: string
  planned: number
  actual: number
  remaining: number
}

type Props = {
  budgets: BudgetProgress[]
}

export default function BudgetsV2({ budgets }: Props) {
  if (budgets.length === 0) return null

  return (
    <section className="space-y-3">
      <div>
        <p className="nf-eyebrow">Budgets variables</p>
        <h2 className="text-lg font-semibold">Où en sont mes enveloppes ?</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {budgets.map((budget) => {
          const percent = budget.planned > 0 ? Math.round((budget.actual / budget.planned) * 100) : 0
          const barPercent = Math.max(0, Math.min(100, percent))
          const exceeded = budget.remaining < 0

          return (
            <Card key={budget.id} className="nf-card-hover">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg" aria-hidden="true">{budget.icon}</span>
                    <p className="font-medium truncate">{budget.name}</p>
                  </div>
                  <span className={`text-xs font-semibold whitespace-nowrap ${exceeded ? 'text-red-400' : 'text-slate-300'}`}>
                    {percent}%
                  </span>
                </div>

                <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" style={{ width: `${barPercent}%` }} />
                </div>

                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-slate-500">Consommé</p>
                    <p className="font-semibold">{formatEuro(budget.actual)} <span className="text-xs font-normal text-slate-500">/ {formatEuro(budget.planned)}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-500">{exceeded ? 'Dépassement' : 'Reste'}</p>
                    <p className={`font-semibold ${exceeded ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatEuro(Math.abs(budget.remaining))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
