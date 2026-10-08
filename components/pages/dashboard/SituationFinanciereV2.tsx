'use client'

import { CalendarDays, CircleDollarSign, Info, Landmark, Scale, Sparkles, TrendingDown, TrendingUp, WalletCards } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
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
  balance, openingBalance, summary, loading, today, selectedMonth, plannedMonthResult,
  projectedRemainingCashMovement, experimentalRemainingCashMovement,
}: Props) {
  const [helpPosition, setHelpPosition] = useState({ top: 0, left: 0 })
  const [help, setHelp] = useState<'available' | 'planned' | 'projection' | 'daily' | 'cashflow' | null>(null)
  const currentMonth = today.slice(0, 7)
  const isCurrentMonth = selectedMonth.slice(0, 7) === currentMonth
  const periodLabel = monthLabel(selectedMonth)
  const selectedDate = new Date(selectedMonth.slice(0, 7) + '-01T12:00:00')
  const todayDate = new Date(today + 'T12:00:00')
  const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 12)
  const daysRemaining = isCurrentMonth ? Math.max(0, Math.ceil((monthEnd.getTime() - todayDate.getTime()) / 86_400_000)) : 0
  const plannedEndBalance = isCurrentMonth && balance != null ? Number(balance) + projectedRemainingCashMovement : openingBalance == null ? null : Number(openingBalance) + plannedMonthResult
  const projectedEndBalance = isCurrentMonth && balance != null && experimentalRemainingCashMovement != null ? Number(balance) + experimentalRemainingCashMovement : null
  const dailyAvailable = isCurrentMonth && balance != null && daysRemaining > 0 ? Math.max(0, Number(balance)) / daysRemaining : null
  const actualResult = summary?.netCashMovement ?? 0

  const helpTexts = {
    available: 'Solde calculé à partir des mouvements réellement enregistrés jusqu’à aujourd’hui.',
    planned: 'Solde actuel + revenus encore attendus − charges fixes restantes − dépenses variables prévues restantes − épargne prévue restante.',
    projection: 'Estimation dynamique : rythme moyen des dépenses variables observé depuis le début du mois × jours restants, puis ajout des revenus attendus et retrait des charges fixes et de l’épargne encore à venir.',
    daily: 'Montant indicatif disponible par jour jusqu’à la fin du mois : disponible aujourd’hui ÷ nombre de jours restants. Il ne s’agit pas d’un budget à dépenser obligatoirement chaque jour.',
  }

  const HelpButton = ({ id }: { id: keyof typeof helpTexts | 'cashflow' }) => (
    <span className="relative inline-flex">
      <button type="button" aria-label="Afficher l'explication" onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); setHelpPosition({ top: rect.bottom + 8, left: Math.max(12, Math.min(rect.left, window.innerWidth - (id === 'cashflow' ? 340 : 280))) }); setHelp(help === id ? null : id) }} className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current/35 text-current/75 transition hover:bg-white/5">
        <Info className="h-2.5 w-2.5" />
      </button>
      {help === id && typeof document !== 'undefined' && createPortal(
        <span role="tooltip" style={{ top: helpPosition.top, left: helpPosition.left }} className={"fixed z-[9999] max-w-[calc(100vw-24px)] rounded-xl border border-slate-700 bg-slate-950 p-3 text-[11px] font-normal leading-4 text-slate-300 shadow-2xl " + (id === 'cashflow' ? 'w-80' : 'w-64')}>
          {id === 'cashflow' ? (
            <span className="block space-y-1.5">
              <span className="mb-2 block font-semibold text-slate-200">Calcul de la variation de trésorerie</span>
              <span className="flex justify-between gap-4"><span>+ Revenus réellement reçus</span><strong className="text-emerald-300">{formatEuro(summary?.earnedIncome || 0)}</strong></span>
              <span className="flex justify-between gap-4"><span>+ Reprises d’épargne</span><strong className="text-emerald-300">{formatEuro(summary?.savingsWithdrawals || 0)}</strong></span>
              <span className="flex justify-between gap-4"><span>+ Remboursements de dépenses encaissés</span><strong className="text-emerald-300">{formatEuro(summary?.expenseReimbursements || 0)}</strong></span>
              <span className="flex justify-between gap-4"><span>+ Remboursements de créances reçus</span><strong className="text-emerald-300">{formatEuro(summary?.debtRepaymentsIn || 0)}</strong></span>
              <span className="flex justify-between gap-4"><span>− Dépenses réellement payées</span><strong className="text-rose-300">{formatEuro(Math.max(0, (summary?.expenses || 0) - (summary?.debtRepaymentsOut || 0)))}</strong></span>
              <span className="flex justify-between gap-4"><span>− Remboursements de dettes payés</span><strong className="text-rose-300">{formatEuro(summary?.debtRepaymentsOut || 0)}</strong></span>
              <span className="flex justify-between gap-4"><span>− Sommes mises en épargne</span><strong className="text-rose-300">{formatEuro(summary?.savingsDeposits || 0)}</strong></span>
              {(summary?.internalSavingsTransfers || 0) > 0 && <span className="flex justify-between gap-4 text-slate-500"><span>Transferts internes d’épargne (neutres)</span><strong>{formatEuro(summary?.internalSavingsTransfers || 0)}</strong></span>}
              <span className="mt-2 flex justify-between gap-4 border-t border-slate-800 pt-2 font-semibold text-slate-100"><span>= Variation de trésorerie</span><strong className={actualResult >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{formatEuro(actualResult)}</strong></span>
            </span>
          ) : helpTexts[id]}
        </span>, document.body
      )}
    </span>
  )

  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">Ma situation</h1>
        <span className="text-xs text-slate-500">{isCurrentMonth ? 'Aujourd’hui' : periodLabel}</span>
      </div>

      {loading ? (
        <Card className="nf-card-hover"><CardContent className="p-5"><span className="loading loading-spinner loading-sm" /></CardContent></Card>
      ) : isCurrentMonth ? (
        <div className="grid gap-2.5 lg:grid-cols-[1fr_1fr_1fr_.48fr]">
          <Card className="nf-card-hover border-emerald-400/30 bg-gradient-to-br from-emerald-500/[0.13] to-emerald-950/[0.18]">
            <CardContent className="flex min-h-[118px] items-start gap-4 p-4">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300"><WalletCards className="h-6 w-6" /></div>
              <div className="min-w-0 text-center"><div className="flex items-center gap-1.5 text-xs font-medium text-emerald-300">Disponible aujourd&apos;hui <HelpButton id="available" /></div><p className="mt-1.5 text-2xl font-bold text-emerald-300 sm:text-[27px]">{balance == null ? '—' : formatEuro(balance)}</p><p className="mt-1.5 text-[11px] leading-4 text-slate-400">Ce que vous pouvez encore dépenser jusqu&apos;à aujourd&apos;hui.</p>
                <Link href="/verification-solde" className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-300/80 hover:text-emerald-200">
                  <Scale className="h-3 w-3" />Vérifier le solde
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="nf-card-hover border-blue-400/30 bg-gradient-to-br from-blue-500/[0.12] to-blue-950/[0.18]">
            <CardContent className="flex min-h-[118px] items-start gap-4 p-4">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-400/10 text-blue-300"><Landmark className="h-6 w-6" /></div>
              <div className="min-w-0 text-center"><div className="flex items-center gap-1.5 text-xs font-medium text-blue-300">Prévu fin de mois <HelpButton id="planned" /></div><p className="mt-1.5 text-2xl font-bold text-blue-300 sm:text-[27px]">{plannedEndBalance == null ? '—' : formatEuro(plannedEndBalance)}</p><p className="mt-1.5 text-[11px] leading-4 text-slate-400">Selon votre budget initial. Si tout se déroule comme prévu.</p></div>
            </CardContent>
          </Card>

          <Card className="nf-card-hover border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/[0.12] to-purple-950/[0.2]">
            <CardContent className="flex min-h-[118px] items-start gap-4 p-4">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-400/10 text-fuchsia-300"><Sparkles className="h-6 w-6" /></div>
              <div className="min-w-0 text-center"><div className="flex items-center gap-1.5 text-xs font-medium text-fuchsia-300">Projection fin de mois <HelpButton id="projection" /></div><p className="mt-1.5 text-2xl font-bold text-fuchsia-300 sm:text-[27px]">{projectedEndBalance == null ? '—' : '≈ ' + formatEuro(projectedEndBalance)}</p><p className="mt-1.5 text-[11px] leading-4 text-slate-400">Estimation basée sur votre rythme actuel de dépenses.</p></div>
            </CardContent>
          </Card>

          <div className="grid grid-rows-2 gap-2.5">
            <Card className="nf-card-hover h-full">
              <CardContent className="grid h-full min-h-[54px] grid-cols-[28px_1fr] items-center gap-2 !px-3 !py-2.5">
                <CalendarDays className="h-5 w-5 justify-self-start text-slate-300" />
                <div className="min-w-0 text-center">
                  <p className="text-sm font-semibold leading-none text-slate-100">{daysRemaining} jours</p>
                  <p className="mt-1 text-[10px] leading-none text-slate-500">restants</p>
                </div>
              </CardContent>
            </Card>

            <Card className="nf-card-hover h-full">
              <CardContent className="grid h-full min-h-[54px] grid-cols-[28px_1fr] items-center gap-2 !px-3 !py-2.5">
                <CircleDollarSign className="h-5 w-5 justify-self-start text-slate-300" />
                <div className="min-w-0 text-center">
                  <p className="text-sm font-semibold leading-none text-slate-100">{dailyAvailable == null ? '—' : formatEuro(dailyAvailable)}</p>
                  <div className="mt-1 flex items-center justify-center gap-1 text-[10px] leading-none text-slate-500"><span>par jour</span><HelpButton id="daily" /></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Card className="nf-card-hover border-blue-400/15 bg-blue-500/[0.05]"><CardContent className="flex min-h-[98px] items-center gap-3 p-4"><Landmark className="h-6 w-6 shrink-0 text-blue-300" /><div><p className="text-[11px] text-slate-400">Solde fin de mois</p><p className="mt-1 text-xl font-bold text-blue-300">{balance == null ? '—' : formatEuro(balance)}</p></div></CardContent></Card>
          <Card className="nf-card-hover"><CardContent className="flex min-h-[98px] items-center gap-3 p-4">{actualResult >= 0 ? <TrendingUp className="h-6 w-6 shrink-0 text-emerald-400" /> : <TrendingDown className="h-6 w-6 shrink-0 text-rose-400" />}<div><div className="flex items-center gap-1.5 text-[11px] text-slate-400">Variation de trésorerie <HelpButton id="cashflow" /></div><p className={'mt-1 text-xl font-bold ' + (actualResult >= 0 ? 'text-emerald-400' : 'text-rose-400')}>{formatEuro(actualResult)}</p></div></CardContent></Card>
          <Card className="nf-card-hover"><CardContent className="flex min-h-[98px] items-center gap-3 p-4"><TrendingUp className="h-6 w-6 shrink-0 text-emerald-400" /><div><p className="text-[11px] text-slate-400">Revenus reçus</p><p className="mt-1 text-xl font-bold text-emerald-400">{formatEuro(summary?.earnedIncome || 0)}</p></div></CardContent></Card>
          <Card className="nf-card-hover"><CardContent className="flex min-h-[98px] items-center gap-3 p-4"><TrendingDown className="h-6 w-6 shrink-0 text-rose-400" /><div><p className="text-[11px] text-slate-400">Dépenses réelles</p><p className="mt-1 text-xl font-bold text-rose-400">{formatEuro(summary?.expenses || 0)}</p></div></CardContent></Card>
        </div>
      )}
    </section>
  )
}
