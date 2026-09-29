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
  selectedMonth: string
  plannedMonthResult: number
  actualMonthResult: number
  projectedRemainingCashMovement: number
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(year, monthNumber - 1, 1, 12).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
}

export default function SituationFinanciereV2({
  balance,
  summary,
  loading,
  referenceDate,
  today,
  selectedMonth,
  plannedMonthResult,
  actualMonthResult,
  projectedRemainingCashMovement,
}: Props) {
  if (loading) {
    return <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4"><span className="loading loading-spinner loading-sm" /></CardContent></Card>
  }

  const currentMonth = today.slice(0, 7)
  const isCurrentMonth = selectedMonth === currentMonth
  const periodLabel = monthLabel(selectedMonth)
  const todayDate = new Date(today + 'T12:00:00')
  const monthEnd = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0, 12)
  const daysRemaining = isCurrentMonth
    ? Math.max(0, Math.ceil((monthEnd.getTime() - todayDate.getTime()) / 86_400_000))
    : null
  const plannedEndBalance = isCurrentMonth && balance != null
    ? Number(balance) + projectedRemainingCashMovement
    : null

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Situation actuelle · moteur V2</p>
          <h2 className="text-lg font-semibold">Où j&apos;en suis aujourd&apos;hui ?</h2>
        </div>
        <div className="text-xs text-slate-400 rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
          {isCurrentMonth
            ? `${daysRemaining} ${daysRemaining === 1 ? 'jour restant' : 'jours restants'} dans le mois`
            : `Période analysée : ${periodLabel}`}
        </div>
      </div>

      {!isCurrentMonth && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-400">
          Le disponible reste calculé à aujourd&apos;hui. Les indicateurs mensuels ci-dessous concernent <span className="font-medium text-slate-200">{periodLabel}</span>.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="col-span-2 bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Disponible aujourd&apos;hui</p>
            <p className="text-2xl font-bold mt-1">{balance == null ? '—' : formatEuro(balance)}</p>
            <p className="text-[11px] text-slate-500 mt-2">
              Solde de trésorerie calculé du {new Date(referenceDate + 'T12:00:00').toLocaleDateString('fr-FR')} au {todayDate.toLocaleDateString('fr-FR')}
            </p>
          </CardContent>
        </Card>
        {isCurrentMonth ? (
          <Card className="col-span-2 bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Prévu fin de mois</p>
              <p className="text-2xl font-bold mt-1">{plannedEndBalance == null ? '—' : formatEuro(plannedEndBalance)}</p>
              <p className="text-[11px] text-slate-500 mt-2">
                Disponible actuel + revenus encore attendus − flux restant prévu. Hors nouveaux flux exceptionnels non planifiés.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <p className="text-xs text-slate-400">Revenus reçus · {periodLabel}</p>
                <p className="text-lg font-bold text-emerald-400 mt-1">{formatEuro(summary?.earnedIncome || 0)}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <p className="text-xs text-slate-400">Dépenses réelles · {periodLabel}</p>
                <p className="text-lg font-bold text-pink-400 mt-1">{formatEuro(summary?.expenses || 0)}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {isCurrentMonth && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Revenus reçus · {periodLabel}</p>
              <p className="text-lg font-bold text-emerald-400 mt-1">{formatEuro(summary?.earnedIncome || 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Dépenses réelles · {periodLabel}</p>
              <p className="text-lg font-bold text-pink-400 mt-1">{formatEuro(summary?.expenses || 0)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Résultat prévu · {periodLabel}</p>
            <p className="text-xl font-bold mt-1">{formatEuro(plannedMonthResult)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Revenus − charges fixes − budgets variables − épargne prévue.</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Résultat réel enregistré · {periodLabel}</p>
            <p className="text-xl font-bold mt-1">{formatEuro(actualMonthResult)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Indicateur analytique distinct du mouvement réel de trésorerie, qui inclut aussi dettes et créances.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-3"><p className="text-slate-500">Remb. de dépenses</p><p className="font-semibold mt-1">{formatEuro(summary?.expenseReimbursements || 0)}</p></div>
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-3"><p className="text-slate-500">On me doit · reçu</p><p className="font-semibold text-emerald-400 mt-1">{formatEuro(summary?.debtRepaymentsIn || 0)}</p></div>
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-3"><p className="text-slate-500">Je dois · remboursé</p><p className="font-semibold text-orange-400 mt-1">{formatEuro(summary?.debtRepaymentsOut || 0)}</p></div>
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-3"><p className="text-slate-500">Reprises épargne</p><p className="font-semibold mt-1">{formatEuro(summary?.savingsWithdrawals || 0)}</p></div>
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-3"><p className="text-slate-500">Épargne versée</p><p className="font-semibold mt-1">{formatEuro(summary?.savingsDeposits || 0)}</p></div>
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-3"><p className="text-slate-500">Mouvement net de trésorerie</p><p className="font-semibold mt-1">{formatEuro(summary?.netCashMovement || 0)}</p></div>
      </div>
    </section>
  )
}
