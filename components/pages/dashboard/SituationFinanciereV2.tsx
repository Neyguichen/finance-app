'use client'

import { CalendarDays, Info, Landmark, Sparkles, WalletCards } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'
import type { CashSummary } from '@/lib/financial-engine'

type Props = {
  balance: number | null | undefined
  openingBalance: number | null | undefined
  summary: CashSummary | null | undefined
  loading?: boolean
  referenceDate?: string | null
  today: string
  selectedMonth: string
  plannedMonthResult: number
  projectedRemainingCashMovement: number
  experimentalRemainingCashMovement?: number | null
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(year, monthNumber - 1, 1, 12).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export default function SituationFinanciereV2({
  balance,
  openingBalance,
  summary,
  loading,
  today,
  selectedMonth,
  plannedMonthResult,
  projectedRemainingCashMovement,
  experimentalRemainingCashMovement,
}: Props) {
  const currentMonth = today.slice(0, 7)
  const isCurrentMonth = selectedMonth.slice(0, 7) === currentMonth
  const periodLabel = monthLabel(selectedMonth)
  const selectedDate = new Date(selectedMonth.slice(0, 7) + '-01T12:00:00')
  const todayDate = new Date(today + 'T12:00:00')
  const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 12)
  const daysRemaining = isCurrentMonth ? Math.max(0, Math.ceil((monthEnd.getTime() - todayDate.getTime()) / 86_400_000)) : 0

  const plannedEndBalance = isCurrentMonth && balance != null
    ? Number(balance) + projectedRemainingCashMovement
    : openingBalance == null
      ? null
      : Number(openingBalance) + plannedMonthResult

  const projectedEndBalance = isCurrentMonth && balance != null && experimentalRemainingCashMovement != null
    ? Number(balance) + experimentalRemainingCashMovement
    : null

  const dailyAvailable = isCurrentMonth && balance != null && daysRemaining > 0
    ? Math.max(0, Number(balance)) / daysRemaining
    : null

  const actualResult = summary?.netCashMovement ?? 0

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">Ma situation</h1>
        <span className="text-xs text-slate-500">{isCurrentMonth ? 'Aujourd’hui' : periodLabel}</span>
      </div>

      {loading ? (
        <Card className="nf-card-hover"><CardContent className="p-5"><span className="loading loading-spinner loading-sm" /></CardContent></Card>
      ) : isCurrentMonth ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_.68fr]">
          <Card className="nf-card-hover border-emerald-400/20 bg-emerald-500/[0.08]">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                <WalletCards className="h-4 w-4" />
                Disponible aujourd&apos;hui
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-300 sm:text-3xl">{balance == null ? '—' : formatEuro(balance)}</p>
              <p className="mt-2 text-[11px] leading-4 text-slate-500">Solde calculé à partir des mouvements réellement enregistrés à ce jour.</p>
            </CardContent>
          </Card>

          <Card className="nf-card-hover border-blue-400/20 bg-blue-500/[0.07]">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 text-xs font-medium text-blue-300">
                <Landmark className="h-4 w-4" />
                Prévu fin de mois
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-300 sm:text-3xl">{plannedEndBalance == null ? '—' : formatEuro(plannedEndBalance)}</p>
              <p className="mt-2 text-[11px] leading-4 text-slate-500">Solde actuel + revenus attendus − sorties et épargne encore prévues.</p>
            </CardContent>
          </Card>

          <Card className="nf-card-hover border-indigo-400/20 bg-indigo-500/[0.08]">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 text-xs font-medium text-indigo-300">
                <Sparkles className="h-4 w-4" />
                Projection fin de mois
                <Info className="h-3.5 w-3.5 text-indigo-300/70" aria-hidden="true" />
              </div>
              <p className="mt-2 text-2xl font-bold text-indigo-200 sm:text-3xl">{projectedEndBalance == null ? '—' : formatEuro(projectedEndBalance)}</p>
              <p className="mt-2 text-[11px] leading-4 text-slate-500">
                Estimation : rythme moyen de dépenses variables observé × jours restants, puis + revenus attendus − charges fixes − épargne à venir.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <Card className="nf-card-hover">
              <CardContent className="flex h-full min-h-24 flex-col justify-center p-4">
                <div className="flex items-center gap-2 text-xs text-slate-400"><CalendarDays className="h-4 w-4" />Jours restants</div>
                <p className="mt-2 text-xl font-bold text-slate-100">{daysRemaining}</p>
              </CardContent>
            </Card>
            <Card className="nf-card-hover">
              <CardContent className="flex h-full min-h-24 flex-col justify-center p-4">
                <p className="text-xs text-slate-400">Disponible / jour</p>
                <p className="mt-2 text-xl font-bold text-slate-100">{dailyAvailable == null ? '—' : formatEuro(dailyAvailable)}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="nf-card-hover border-blue-400/15 bg-blue-500/[0.05]">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Solde fin de mois</p>
              <p className="mt-1 text-2xl font-bold text-blue-300">{balance == null ? '—' : formatEuro(balance)}</p>
            </CardContent>
          </Card>
          <Card className="nf-card-hover">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Résultat réel du mois</p>
              <p className={`mt-1 text-xl font-bold ${actualResult >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatEuro(actualResult)}</p>
            </CardContent>
          </Card>
          <Card className="nf-card-hover">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Revenus reçus</p>
              <p className="mt-1 text-xl font-bold text-emerald-400">{formatEuro(summary?.earnedIncome || 0)}</p>
            </CardContent>
          </Card>
          <Card className="nf-card-hover">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Dépenses réelles</p>
              <p className="mt-1 text-xl font-bold text-rose-400">{formatEuro(summary?.expenses || 0)}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  )
}
