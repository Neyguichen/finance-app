'use client'

import { Card, CardContent } from '@/components/ui/card'
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
}

function Line({ label, planned, actual }: { label: string; planned: number; actual: number }) {
  const percent = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : actual > 0 ? 100 : 0
  const delta = actual - planned
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="text-slate-400">{formatEuro(actual)} / {formatEuro(planned)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full" style={{ width: `${percent}%` }} /></div>
      {planned > 0 && delta !== 0 && (
        <p className="text-[11px] text-slate-500 text-right">Écart : {delta > 0 ? '+' : ''}{formatEuro(delta)}</p>
      )}
    </div>
  )
}

export default function PrevuReelV2(props: Props) {
  return (
    <section className="space-y-3">
      <div>
        <p className="nf-eyebrow">Prévu vs réel</p>
        <h2 className="text-lg font-semibold">Comment se déroule le mois ?</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="nf-card-hover">
          <CardContent className="p-4 space-y-4">
            <div>
              <p className="font-medium">Revenus</p>
              <p className="text-xs text-slate-500">Le report et les reprises d&apos;épargne sont exclus.</p>
            </div>
            <Line label="Reçus" planned={props.plannedIncome} actual={props.actualIncome} />
            <p className="text-xs text-slate-400">Encore attendus : <span className="font-semibold text-slate-200">{formatEuro(props.expectedIncome)}</span></p>
          </CardContent>
        </Card>
        <Card className="nf-card-hover">
          <CardContent className="p-4 space-y-4">
            <Line label="Charges fixes" planned={props.plannedFixed} actual={props.actualFixed} />
            <Line label="Dépenses variables" planned={props.plannedVariable} actual={props.actualVariable} />
            <Line label="Épargne versée" planned={props.plannedSavingsDeposits} actual={props.actualSavingsDeposits} />
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
