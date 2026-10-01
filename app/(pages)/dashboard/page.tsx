'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/components/AppContext'
import MonthSelector from '@/components/layout/MonthSelector'
import WelcomeScreen from '@/components/pages/dashboard/WelcomeScreen'
import SituationFinanciereV2 from '@/components/pages/dashboard/SituationFinanciereV2'
import PrevuReelV2 from '@/components/pages/dashboard/PrevuReelV2'
import RepartitionDepensesV2 from '@/components/pages/dashboard/RepartitionDepensesV2'
import BudgetsV2 from '@/components/pages/dashboard/BudgetsV2'
import EpargneDettesV2 from '@/components/pages/dashboard/EpargneDettesV2'
import ASurveillerV2 from '@/components/pages/dashboard/ASurveillerV2'
import TendancesFinancieresV2 from '@/components/pages/dashboard/TendancesFinancieresV2'
import TodoResumeV2 from '@/components/pages/dashboard/TodoResumeV2'
import EmptyMonthV2 from '@/components/pages/dashboard/EmptyMonthV2'
import MonthPreparationPreview from '@/components/pages/dashboard/MonthPreparationPreview'
import DashboardQuickAdd from '@/components/pages/dashboard/DashboardQuickAdd'
import { useMois } from '@/lib/hooks/useMois'
import { useMonthPreparation, usePrepareMonth } from '@/lib/hooks/useMonthPreparation'
import { useHabits } from '@/lib/hooks/useHabits'
import { localDateISO } from '@/lib/utils'
import { useDashboardInsights } from '@/lib/hooks/useDashboardInsights'
import { useActualCashSummary, useBalanceAtDate } from '@/lib/hooks/useBalanceAtDate'
import { useDashboardV2 } from '@/lib/hooks/useDashboardV2'

export default function DashboardPage() {
  const router = useRouter()
  const { month, setMonth, moisId, userId, espaces, espace, loading, addEspace } = useApp()
  const monthModel = useMois(espace?.id)
  const habitsModel = useHabits(!moisId ? espace?.id : undefined)
  const [preparationMode, setPreparationMode] = useState<'previous' | 'habits' | null>(null)
  const preparationPreview = useMonthPreparation(espace?.id, month, preparationMode)
  const prepareMonth = usePrepareMonth(espace?.id, month, userId ?? undefined)
  const insights = useDashboardInsights()
  const v2 = useDashboardV2()
  const today = localDateISO()
  const monthKey = month.slice(0, 7)
  const [year, monthNumber] = monthKey.split('-').map(Number)
  const monthStart = `${monthKey}-01`
  const monthEnd = localDateISO(new Date(year, monthNumber, 0))
  const monthOpeningDate = localDateISO(new Date(year, monthNumber - 1, 0))
  const isCurrentMonth = monthKey === today.slice(0, 7)
  const balanceTargetDate = isCurrentMonth ? today : monthEnd
  const summaryEnd = isCurrentMonth && today < monthEnd ? today : monthEnd
  const v2OpeningBalance = useBalanceAtDate(espace?.id, espace?.solde_reference ?? null, espace?.date_solde_reference ?? null, monthOpeningDate, espace?.double_date ?? false)
  const v2Balance = useBalanceAtDate(espace?.id, espace?.solde_reference ?? null, espace?.date_solde_reference ?? null, balanceTargetDate, espace?.double_date ?? false)
  const v2Summary = useActualCashSummary(espace?.id, monthStart, summaryEnd, espace?.double_date ?? false)

  if (loading) return <div className="flex min-h-screen items-center justify-center"><span className="loading loading-spinner loading-lg" /></div>
  if (espaces.length === 0) return <WelcomeScreen onCreateEspace={async (nom, icone) => { await addEspace(nom, icone) }} />

  const hasPreviousMonth = (monthModel.data || []).some(item => item.mois.slice(0, 7) < month.slice(0, 7))
  const hasHabits = (habitsModel.data || []).some(item => item.actif)
  const prepareEmptyMonth = async (mode: 'previous' | 'habits' | 'empty') => {
    if (!espace || !userId) return
    if (mode === 'empty') { await monthModel.createMonth.mutateAsync({ espace_id: espace.id, mois: month, user_id: userId }); return }
    setPreparationMode(mode)
  }
  const confirmPreparation = async (selectedIds: string[]) => {
    const items = (preparationPreview.data?.items || []).filter(item => selectedIds.includes(item.id))
    await prepareMonth.mutateAsync(items)
    setPreparationMode(null)
  }

  return <div>
    <MonthSelector currentMonth={month} onChange={setMonth} />
    <div className="mx-auto w-full max-w-7xl space-y-3 px-3 py-4 pb-24 sm:px-4">
      {!moisId && <EmptyMonthV2 month={month} onPrepare={prepareEmptyMonth} onDefineHabits={()=>router.push('/parametres?section=recurrences')} hasPreviousMonth={hasPreviousMonth} hasHabits={hasHabits} loading={monthModel.isLoading||habitsModel.isLoading||monthModel.createMonth.isPending||prepareMonth.isPending} />}
      <MonthPreparationPreview open={preparationMode!==null} onOpenChange={open=>{if(!open)setPreparationMode(null)}} espaceId={espace?.id} month={month} mode={preparationMode} onConfirm={confirmPreparation} />

      <SituationFinanciereV2 balance={v2Balance.data} openingBalance={v2OpeningBalance.data} summary={v2Summary.data} loading={v2Balance.isLoading||v2OpeningBalance.isLoading||v2Summary.isLoading} referenceDate={espace?.date_solde_reference} today={today} selectedMonth={month} plannedMonthResult={v2.plannedMonthResult} projectedRemainingCashMovement={v2.projectedRemainingCashMovement} experimentalRemainingCashMovement={v2.experimentalRemainingCashMovement} />

      <div className="grid gap-3 xl:grid-cols-[1.45fr_.9fr]">
        <PrevuReelV2 plannedIncome={v2.plannedIncome} actualIncome={v2.actualIncome} expectedIncome={v2.expectedIncome} plannedFixed={v2.plannedFixed} actualFixed={v2.actualFixed} plannedVariable={v2.plannedVariable} actualVariable={v2.actualVariable} plannedSavingsDeposits={v2.plannedSavingsDeposits} actualSavingsDeposits={v2.actualSavingsDeposits} expenseReimbursements={v2Summary.data?.expenseReimbursements || 0} debtRepaymentsIn={v2Summary.data?.debtRepaymentsIn || 0} debtRepaymentsOut={v2Summary.data?.debtRepaymentsOut || 0} />
        <RepartitionDepensesV2 />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.45fr_.9fr]">
        <BudgetsV2 budgets={v2.budgetProgress} />
        <EpargneDettesV2 savingsAvailable={v2.savingsDebtSummary.savingsAvailable} plannedSavings={v2.plannedSavingsDeposits} actualSavings={v2.actualSavingsDeposits} savingsWithdrawals={v2.savingsWithdrawals} debtRemaining={v2.savingsDebtSummary.debtRemaining} receivableRemaining={v2.savingsDebtSummary.receivableRemaining} loading={v2.savingsDebtLoading} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.2fr_.8fr]">
        <ASurveillerV2 budgetProgress={v2.budgetProgress} expectedIncome={v2.expectedIncome} plannedSavings={v2.plannedSavingsDeposits} actualSavings={v2.actualSavingsDeposits} today={today} selectedMonth={month} />
        <TodoResumeV2 />
      </div>

      <TendancesFinancieresV2 espaceId={espace?.id} plannedIncome={v2.plannedIncome} plannedFixed={v2.plannedFixed} plannedVariable={v2.plannedVariable} actualVariable={v2.actualVariable} topCategory={insights.topCategory} />
    </div>
    <DashboardQuickAdd />
  </div>
}
