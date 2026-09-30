'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'
import type { CashSummary } from '@/lib/financial-engine'

type Props = {
  balance: number | null | undefined
  openingBalance: number | null | undefined
  summary: CashSummary | null | undefined
  loading?: boolean
  referenceDate: string
  today: string
  selectedMonth: string
  plannedMonthResult: number
  actualMonthResult: number
  projectedRemainingCashMovement: number
  experimentalRemainingCashMovement?: number | null
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
  openingBalance,
  summary,
  loading,
  referenceDate,
  today,
  selectedMonth,
  plannedMonthResult,
  actualMonthResult,
  projectedRemainingCashMovement,
  experimentalRemainingCashMovement,
}: Props) {
  if (loading) {
    return <Card className="nf-card-hover"><CardContent className="p-4"><span className="loading loading-spinner loading-sm" /></CardContent></Card>
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
  const experimentalEndBalance = isCurrentMonth && balance != null && experimentalRemainingCashMovement != null
    ? Number(balance) + experimentalRemainingCashMovement
    : null
  const plannedPeriodEndBalance = openingBalance == null ? null : Number(openingBalance) + plannedMonthResult
  const actualCashMovement = summary?.netCashMovement ?? actualMonthResult
  const actualPeriodEndBalance = openingBalance == null ? null : Number(openingBalance) + actualCashMovement

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="nf-eyebrow">Situation actuelle</p>
          <h2 className="text-lg font-semibold">Où j&apos;en suis aujourd&apos;hui ?</h2>
        </div>
        <div className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400">
          {isCurrentMonth
            ? `${daysRemaining} ${daysRemaining === 1 ? 'jour restant' : 'jours restants'} dans le mois`
            : `Période analysée : ${periodLabel}`}
        </div>
      </div>

      {!isCurrentMonth && (
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/45/70 px-3 py-2 text-xs text-slate-400">
          Le disponible reste calculé à aujourd&apos;hui. Les indicateurs mensuels ci-dessous concernent <span className="font-medium text-slate-200">{periodLabel}</span>.
        </div>
      )}

      {isCurrentMonth ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="nf-card-hover">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Disponible aujourd&apos;hui</p>
              <p className="mt-1 text-2xl font-bold">{balance == null ? '—' : formatEuro(balance)}</p>
              <p className="mt-2 text-[11px] text-slate-500">
                Du {new Date(referenceDate + 'T12:00:00').toLocaleDateString('fr-FR')} au {todayDate.toLocaleDateString('fr-FR')}
              </p>
            </CardContent>
          </Card>
          <Card className="nf-card-hover">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Prévu fin de mois</p>
              <p className="mt-1 text-2xl font-bold">{plannedEndBalance == null ? '—' : formatEuro(plannedEndBalance)}</p>
              <p className="mt-2 text-[11px] text-slate-500">
                Basé sur les revenus, charges, budgets variables et épargne encore prévus.
              </p>
            </CardContent>
          </Card>
          <Card className="nf-glow border-indigo-400/20 bg-indigo-500/10">
            <CardContent className="p-4">
              <p className="text-xs text-indigo-300">Projection dynamique</p>
              <p className="mt-1 text-2xl font-bold text-indigo-100">{experimentalEndBalance == null ? '—' : formatEuro(experimentalEndBalance)}</p>
              <p className="mt-2 text-[11px] text-indigo-300/60">
                Remplace le budget variable restant par le rythme de dépenses observé depuis le début du mois. Indicateur estimatif, pas un solde comptable.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="nf-card-hover sm:col-span-1">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Disponible aujourd&apos;hui</p>
              <p className="mt-1 text-2xl font-bold">{balance == null ? '—' : formatEuro(balance)}</p>
            </CardContent>
          </Card>
          <Card className="nf-card-hover">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Revenus reçus · {periodLabel}</p>
              <p className="mt-1 text-lg font-bold text-emerald-400">{formatEuro(summary?.earnedIncome || 0)}</p>
            </CardContent>
          </Card>
          <Card className="nf-card-hover">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Dépenses réelles · {periodLabel}</p>
              <p className="mt-1 text-lg font-bold text-pink-400">{formatEuro(summary?.expenses || 0)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isCurrentMonth && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card className="nf-card-hover">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Revenus reçus · {periodLabel}</p>
              <p className="mt-1 text-lg font-bold text-emerald-400">{formatEuro(summary?.earnedIncome || 0)}</p>
            </CardContent>
          </Card>
          <Card className="nf-card-hover">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Dépenses réelles · {periodLabel}</p>
              <p className="mt-1 text-lg font-bold text-pink-400">{formatEuro(summary?.expenses || 0)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="nf-card-hover">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Variation prévue du mois · {periodLabel}</p>
            <p className="mt-1 text-xl font-bold">{formatEuro(plannedMonthResult)}</p>
            <p className="mt-1 text-[11px] text-slate-500">Revenus − charges fixes − budgets variables − épargne prévue.</p>
            {openingBalance != null && plannedPeriodEndBalance != null && (
              <p className="mt-2 border-t border-slate-800 pt-2 text-[11px] text-slate-400">
                {formatEuro(openingBalance)} au début + {formatEuro(plannedMonthResult)} = <span className="font-semibold text-slate-200">{formatEuro(plannedPeriodEndBalance)}</span> prévu en fin de mois
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="nf-card-hover">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Variation réelle du mois · {periodLabel}</p>
            <p className="mt-1 text-xl font-bold">{formatEuro(actualMonthResult)}</p>
            <p className="mt-1 text-[11px] text-slate-500">Le mouvement réel de trésorerie peut aussi inclure remboursements, dettes, créances et reprises d&apos;épargne.</p>
            {openingBalance != null && actualPeriodEndBalance != null && (
              <p className="mt-2 border-t border-slate-800 pt-2 text-[11px] text-slate-400">
                {formatEuro(openingBalance)} au début + {formatEuro(actualCashMovement)} = <span className="font-semibold text-slate-200">{formatEuro(actualPeriodEndBalance)}</span> calculé en fin de période
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/45 p-3"><p className="text-slate-500">Remb. de dépenses</p><p className="mt-1 font-semibold">{formatEuro(summary?.expenseReimbursements || 0)}</p></div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/45 p-3"><p className="text-slate-500">On me doit · reçu</p><p className="mt-1 font-semibold text-emerald-400">{formatEuro(summary?.debtRepaymentsIn || 0)}</p></div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/45 p-3"><p className="text-slate-500">Je dois · remboursé</p><p className="mt-1 font-semibold text-orange-400">{formatEuro(summary?.debtRepaymentsOut || 0)}</p></div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/45 p-3"><p className="text-slate-500">Reprises épargne</p><p className="mt-1 font-semibold">{formatEuro(summary?.savingsWithdrawals || 0)}</p></div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/45 p-3"><p className="text-slate-500">Épargne versée</p><p className="mt-1 font-semibold">{formatEuro(summary?.savingsDeposits || 0)}</p></div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/45 p-3"><p className="text-slate-500">Mouvement net de trésorerie</p><p className="mt-1 font-semibold">{formatEuro(summary?.netCashMovement || 0)}</p></div>
      </div>
    </section>
  )
}
