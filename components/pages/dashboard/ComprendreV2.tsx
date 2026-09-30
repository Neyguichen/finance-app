'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, BarChart3, Gauge, Lightbulb, PiggyBank, WalletCards } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatEuro } from '@/lib/utils'

type BudgetProgress = { planned: number; actual: number; remaining: number }

type Props = {
  plannedIncome: number
  plannedFixed: number
  plannedVariable: number
  actualVariable: number
  projectedRemainingCashMovement: number
  experimentalRemainingCashMovement: number | null
  budgetProgress: BudgetProgress[]
  topCategory?: { nom?: string; icone?: string | null; depense?: number } | null
}

export default function ComprendreV2({
  plannedIncome, plannedFixed, plannedVariable, actualVariable,
  projectedRemainingCashMovement, experimentalRemainingCashMovement, budgetProgress, topCategory,
}: Props) {
  const fixedWeight = plannedIncome > 0 ? Math.round((plannedFixed / plannedIncome) * 100) : null
  const variableUsage = plannedVariable > 0 ? Math.round((actualVariable / plannedVariable) * 100) : null
  const remainingVariable = Math.max(0, plannedVariable - actualVariable)
  const atRiskBudgets = budgetProgress.filter(budget => budget.planned > 0 && budget.actual / budget.planned >= 0.8).length
  const projected = experimentalRemainingCashMovement ?? projectedRemainingCashMovement

  return (
    <Card className="nf-card-hover">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-slate-300">
          <Lightbulb className="h-4 w-4 text-amber-300" /> Comprendre mon mois
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <InsightCard icon={WalletCards} label="Poids des charges fixes" value={fixedWeight == null ? '—' : fixedWeight + '%'} help="Part des revenus prévus absorbée par les charges fixes." />
          <InsightCard icon={Gauge} label="Budgets consommés" value={variableUsage == null ? '—' : variableUsage + '%'} help={formatEuro(remainingVariable) + ' encore disponibles sur les budgets variables.'} />
          <InsightCard icon={AlertTriangle} label="Budgets à surveiller" value={String(atRiskBudgets)} help={atRiskBudgets === 0 ? 'Aucun budget n’a atteint 80 %.' : 'Budget(s) à 80 % ou plus de consommation.'} valueClass={atRiskBudgets > 0 ? 'text-amber-300' : 'text-emerald-300'} />
          <InsightCard icon={PiggyBank} label="Projection restante" value={formatEuro(projected)} help={experimentalRemainingCashMovement != null ? 'Projection basée sur le rythme réel de dépenses du mois.' : 'Mouvement de trésorerie restant selon le prévu.'} valueClass={projected >= 0 ? 'text-emerald-300' : 'text-rose-300'} />
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/35 p-3">
            <p className="text-[11px] text-slate-500">Catégorie principale</p>
            {topCategory ? <>
              <p className="mt-1 truncate text-sm font-medium text-slate-200">{topCategory.icone || '📂'} {topCategory.nom || 'Catégorie'}</p>
              <p className="mt-0.5 text-base font-semibold text-indigo-300">{formatEuro(Number(topCategory.depense || 0))}</p>
              <p className="mt-1 text-[10px] leading-4 text-slate-600">Plus forte dépense variable cumulée du mois.</p>
            </> : <p className="mt-1 text-lg font-semibold text-slate-600">—</p>}
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-indigo-400/10 bg-indigo-500/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-slate-200"><BarChart3 className="h-4 w-4 text-indigo-300" /> Prendre du recul</p>
            <p className="mt-1 text-xs text-slate-500">Le bilan annuel permet de comparer les mois, les flux réels et l’évolution de tes catégories.</p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0 whitespace-nowrap">
            <Link href="/bilan-annuel" className="inline-flex items-center gap-1.5"><span>Voir le bilan annuel</span><ArrowRight className="h-3.5 w-3.5 shrink-0" /></Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function InsightCard({ icon: Icon, label, value, help, valueClass = 'text-slate-100' }: { icon: any; label: string; value: string; help: string; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-slate-800/70 bg-slate-950/35 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500"><Icon className="h-3.5 w-3.5" /><span>{label}</span></div>
      <p className={'mt-1 text-lg font-semibold ' + valueClass}>{value}</p>
      <p className="mt-1 text-[10px] leading-4 text-slate-600">{help}</p>
    </div>
  )
}
