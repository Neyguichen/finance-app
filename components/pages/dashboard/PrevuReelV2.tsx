'use client'

import { ArrowDownLeft, ArrowUpRight, PiggyBank, ReceiptText, RefreshCcw, TrendingUp, WalletCards } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'

type Props = {
  plannedIncome: number
  actualIncome: number
  expectedIncome: number
  plannedFixed: number
  actualFixed: number
  plannedVariable: number
  actualVariable: number
  plannedSavingsDeposits: number
  actualSavingsDeposits: number
  expenseReimbursements?: number
  debtRepaymentsIn?: number
  debtRepaymentsOut?: number
}

const rows = [
  { key: 'income', label: 'Revenus', icon: TrendingUp, tone: 'text-emerald-300', bar: 'bg-emerald-400' },
  { key: 'fixed', label: 'Dépenses fixes', icon: ReceiptText, tone: 'text-rose-300', bar: 'bg-rose-400' },
  { key: 'variable', label: 'Dépenses variables', icon: WalletCards, tone: 'text-cyan-300', bar: 'bg-cyan-400' },
  { key: 'savings', label: 'Épargne', icon: PiggyBank, tone: 'text-amber-300', bar: 'bg-amber-400' },
] as const

export default function PrevuReelV2(props: Props) {
  const values = {
    income: [props.plannedIncome, props.actualIncome],
    fixed: [props.plannedFixed, props.actualFixed],
    variable: [props.plannedVariable, props.actualVariable],
    savings: [props.plannedSavingsDeposits, props.actualSavingsDeposits],
  } as const

  const plannedResult = props.plannedIncome - props.plannedFixed - props.plannedVariable - props.plannedSavingsDeposits
  const actualResult = props.actualIncome - props.actualFixed - props.actualVariable - props.actualSavingsDeposits
  const reimbursements = [
    { label: 'Dépenses remboursées', value: props.expenseReimbursements || 0, icon: RefreshCcw, className: 'text-cyan-300' },
    { label: 'Créances remboursées', value: props.debtRepaymentsIn || 0, icon: ArrowDownLeft, className: 'text-emerald-300' },
    { label: 'Dettes remboursées', value: props.debtRepaymentsOut || 0, icon: ArrowUpRight, className: 'text-orange-300' },
  ]

  return (
    <Card className="nf-card-hover h-full">
      <CardHeader className="pb-2"><CardTitle className="text-base text-slate-100">Prévu vs Réel</CardTitle></CardHeader>
      <CardContent className="space-y-1 p-4 pt-1">
        <div className="hidden grid-cols-[1.4fr_.8fr_.8fr_.8fr_1fr] gap-3 border-b border-slate-800/80 px-2 pb-2 text-[11px] text-slate-500 md:grid">
          <span>Catégorie</span><span className="text-right">Prévu</span><span className="text-right">Réel</span><span className="text-right">Écart</span><span />
        </div>

        {rows.map(row => {
          const [planned, actual] = values[row.key]
          const delta = actual - planned
          const percent = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : actual > 0 ? 100 : 0
          const Icon = row.icon
          return (
            <div key={row.key} className="border-b border-slate-800/55 px-2 py-2.5 last:border-0">
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[1.4fr_.8fr_.8fr_.8fr_1fr]">
                <div className="flex min-w-0 items-center gap-2"><Icon className={`h-4 w-4 shrink-0 ${row.tone}`} /><span className="truncate text-sm font-medium">{row.label}</span></div>
                <span className="text-right text-xs text-slate-300 md:text-sm"><span className="md:hidden">{formatEuro(actual)} / </span><span className="md:hidden text-slate-500">{formatEuro(planned)}</span><span className="hidden md:inline">{formatEuro(planned)}</span></span>
                <span className="hidden text-right text-sm text-slate-200 md:block">{formatEuro(actual)}</span>
                <span className={`hidden text-right text-xs font-medium md:block ${delta > 0 && row.key !== 'income' ? 'text-rose-400' : delta < 0 && row.key !== 'income' ? 'text-emerald-400' : delta < 0 && row.key === 'income' ? 'text-rose-400' : 'text-emerald-400'}`}>{delta > 0 ? '+' : ''}{formatEuro(delta)}</span>
                <div className="col-span-2 mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800 md:col-span-1 md:mt-0"><div className={`h-full rounded-full ${row.bar}`} style={{ width: `${percent}%` }} /></div>
              </div>
            </div>
          )
        })}

        <div className="mt-2 rounded-xl border border-emerald-400/10 bg-emerald-500/[0.05] px-3 py-2.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-emerald-300">Résultat du mois</span>
            <span><span className="text-slate-500">Prévu {formatEuro(plannedResult)}</span><span className="mx-2 text-slate-700">•</span><strong className={actualResult >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{formatEuro(actualResult)}</strong></span>
          </div>
        </div>

        <div className="mt-3 border-t border-slate-800/70 pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-slate-400">Remboursements du mois</p>
            <span className="text-[10px] text-slate-600">Réalisé uniquement</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {reimbursements.map(item => {
              const Icon = item.icon
              return <div key={item.label} className="rounded-lg border border-slate-800/70 bg-slate-950/35 p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500"><Icon className={`h-3.5 w-3.5 ${item.className}`} />{item.label}</div>
                <p className={`mt-1 text-sm font-semibold ${item.className}`}>{formatEuro(item.value)}</p>
              </div>
            })}
          </div>
        </div>

        {props.expectedIncome > 0 && <p className="px-2 pt-1 text-[11px] text-slate-500">Revenus encore attendus : <span className="text-slate-300">{formatEuro(props.expectedIncome)}</span></p>}
      </CardContent>
    </Card>
  )
}
