'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'
import type { CashSummary } from '@/lib/financial-engine'

type Props = {
  balance: number | null | undefined
  summary: CashSummary | null | undefined
  loading?: boolean
  referenceDate: string
  today: string
}

export default function SituationFinanciereV2({ balance, summary, loading, referenceDate, today }: Props) {
  if (loading) {
    return <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><span className="loading loading-spinner loading-sm" /></CardContent></Card>
  }

  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Situation actuelle · moteur V2</p>
        <h2 className="text-lg font-semibold">Où j&apos;en suis aujourd&apos;hui ?</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="col-span-2 bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Solde réel calculé</p>
            <p className="text-2xl font-bold mt-1">{balance == null ? '—' : formatEuro(balance)}</p>
            <p className="text-[11px] text-slate-500 mt-2">Du {new Date(referenceDate + 'T12:00:00').toLocaleDateString('fr-FR')} au {new Date(today + 'T12:00:00').toLocaleDateString('fr-FR')}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><p className="text-xs text-slate-400">Revenus reçus ce mois</p><p className="text-lg font-bold text-emerald-400 mt-1">{formatEuro(summary?.earnedIncome || 0)}</p></CardContent></Card>
        <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><p className="text-xs text-slate-400">Dépenses réelles ce mois</p><p className="text-lg font-bold text-pink-400 mt-1">{formatEuro(summary?.expenses || 0)}</p></CardContent></Card>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-3"><p className="text-slate-500">Remboursements reçus</p><p className="font-semibold mt-1">{formatEuro(summary?.expenseReimbursements || 0)}</p></div>
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-3"><p className="text-slate-500">Reprises épargne</p><p className="font-semibold mt-1">{formatEuro(summary?.savingsWithdrawals || 0)}</p></div>
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-3"><p className="text-slate-500">Épargne versée</p><p className="font-semibold mt-1">{formatEuro(summary?.savingsDeposits || 0)}</p></div>
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-3"><p className="text-slate-500">Mouvement net du mois</p><p className="font-semibold mt-1">{formatEuro(summary?.netCashMovement || 0)}</p></div>
      </div>
    </section>
  )
}
