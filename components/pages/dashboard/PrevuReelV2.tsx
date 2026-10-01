'use client'

import { PiggyBank, ReceiptText, RefreshCcw, TrendingUp, WalletCards } from 'lucide-react'
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

  const progress = (planned: number, actual: number) => {
    if (planned <= 0) return actual > 0 ? 100 : 0
    return Math.max(0, Math.min(100, (actual / planned) * 100))
  }

  return (
    <Card className="nf-card-hover h-full">
      <CardHeader className="pb-2"><CardTitle className="text-base text-slate-100">Prévu vs Réel</CardTitle></CardHeader>
      <CardContent className="space-y-0 p-4 pt-1">
        <div className="hidden grid-cols-[1.45fr_.72fr_.72fr_.72fr_1fr] gap-3 border-b border-slate-800/80 px-2 pb-2 text-[11px] text-slate-500 md:grid">
          <span>Catégorie</span><span className="text-right">Prévu</span><span className="text-right">Réel</span><span className="text-right">Écart</span><span />
        </div>

        {rows.map(row => {
          const [planned, actual] = values[row.key]
          const delta = actual - planned
          const percent = progress(planned, actual)
          const Icon = row.icon
          return (
            <div key={row.key}>
              <div className={(row.key === 'savings' ? '' : 'border-b border-slate-800/55 ') + 'px-2 py-2.5'}>
                <div className="grid grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[1.45fr_.72fr_.72fr_.72fr_1fr]">
                  <div className="flex min-w-0 items-center gap-2"><Icon className={'h-4 w-4 shrink-0 ' + row.tone} /><span className="truncate text-sm font-semibold">{row.label}</span></div>
                  <span className="text-right text-xs text-slate-300 md:text-sm"><span className="md:hidden">{formatEuro(actual)} / </span><span className="md:hidden text-slate-500">{formatEuro(planned)}</span><span className="hidden md:inline">{formatEuro(planned)}</span></span>
                  <span className="hidden text-right text-sm text-slate-100 md:block">{formatEuro(actual)}</span>
                  <span className={'hidden text-right text-xs font-semibold md:block ' + (delta > 0 && row.key !== 'income' ? 'text-rose-400' : delta < 0 && row.key !== 'income' ? 'text-emerald-400' : delta < 0 && row.key === 'income' ? 'text-rose-400' : 'text-emerald-400')}>{delta > 0 ? '+' : ''}{formatEuro(delta)}</span>
                  <div className="col-span-2 mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800/90 md:col-span-1 md:mt-0"><div className={'h-full rounded-full transition-[width] duration-500 ' + row.bar} style={{ width: String(percent) + '%' }} /></div>
                </div>
              </div>

              {row.key === 'income' && (
                <div className="border-b border-slate-800/55 bg-slate-950/20 px-2 py-2">
                  <div className="grid grid-cols-[1fr_auto] items-center gap-3 pl-6 md:grid-cols-[1.45fr_.72fr_.72fr_.72fr_1fr]">
                    <div className="flex min-w-0 items-center gap-2 text-xs text-slate-400"><RefreshCcw className="h-3.5 w-3.5 shrink-0 text-cyan-300" /><span>Remboursements de dépenses</span></div>
                    <span className="text-right text-xs text-cyan-300 md:hidden">{formatEuro(props.expenseReimbursements || 0)}</span>
                    <span className="hidden text-right text-xs text-slate-600 md:block">—</span>
                    <span className="hidden text-right text-xs font-medium text-cyan-300 md:block">{formatEuro(props.expenseReimbursements || 0)}</span>
                    <span className="hidden text-right text-xs text-slate-600 md:block">—</span>
                    <span className="hidden md:block" />
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {props.expectedIncome > 0 && <p className="px-2 pt-2 text-[11px] text-slate-500">Revenus encore attendus : <span className="font-medium text-slate-300">{formatEuro(props.expectedIncome)}</span></p>}
      </CardContent>
    </Card>
  )
}
