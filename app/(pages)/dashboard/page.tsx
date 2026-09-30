'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

import { useApp } from '@/components/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import MonthSelector from '@/components/layout/MonthSelector'
import PageHeader from '@/components/layout/PageHeader'
import WelcomeScreen from '@/components/pages/dashboard/WelcomeScreen'
import SituationFinanciereV2 from '@/components/pages/dashboard/SituationFinanciereV2'
import PrevuReelV2 from '@/components/pages/dashboard/PrevuReelV2'
import BudgetsV2 from '@/components/pages/dashboard/BudgetsV2'
import EpargneDettesV2 from '@/components/pages/dashboard/EpargneDettesV2'
import ComprendreV2 from '@/components/pages/dashboard/ComprendreV2'
import TodoResumeV2 from '@/components/pages/dashboard/TodoResumeV2'
import EmptyMonthV2 from '@/components/pages/dashboard/EmptyMonthV2'
import MonthPreparationPreview from '@/components/pages/dashboard/MonthPreparationPreview'
import { useMois } from '@/lib/hooks/useMois'
import { useMonthPreparation, usePrepareMonth } from '@/lib/hooks/useMonthPreparation'
import { useHabits } from '@/lib/hooks/useHabits'

import { getMontantNet, localDateISO } from '@/lib/utils'
import { useDashboardInsights } from '@/lib/hooks/useDashboardInsights'
import { useActualCashSummary, useBalanceAtDate } from '@/lib/hooks/useBalanceAtDate'
import { useDashboardV2 } from '@/lib/hooks/useDashboardV2'

export default function DashboardPage() {
  const router = useRouter()
  const { month, setMonth, moisId, userId, espaces, espace, loading, addEspace, isAdminViewing } = useApp()
  const monthModel = useMois(espace?.id)
  const habitsModel = useHabits(!moisId ? espace?.id : undefined)
  const [openEspace, setOpenEspace] = useState(false)
  const [newNom, setNewNom] = useState('')
  const [newIcone, setNewIcone] = useState('🏠')
  const [preparationMode, setPreparationMode] = useState<'previous' | 'habits' | null>(null)
  const preparationPreview = useMonthPreparation(espace?.id, month, preparationMode)
  const prepareMonth = usePrepareMonth(espace?.id, month, userId ?? undefined)

  const insights = useDashboardInsights()
  const v2 = useDashboardV2()
  const today = localDateISO()
  const [year, monthNumber] = month.split('-').map(Number)
  const monthStart = `${month}-01`
  const monthEnd = localDateISO(new Date(year, monthNumber, 0))
  const monthOpeningDate = localDateISO(new Date(year, monthNumber - 1, 0))
  const summaryEnd = today < monthEnd ? today : monthEnd
  const v2OpeningBalance = useBalanceAtDate(
    espace?.id,
    espace?.solde_reference ?? null,
    espace?.date_solde_reference ?? null,
    monthOpeningDate,
    espace?.double_date ?? false
  )
  const v2Balance = useBalanceAtDate(
    espace?.id,
    espace?.solde_reference ?? null,
    espace?.date_solde_reference ?? null,
    today,
    espace?.double_date ?? false
  )
  const v2Summary = useActualCashSummary(espace?.id, monthStart, summaryEnd, espace?.double_date ?? false)

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><span className="loading loading-spinner loading-lg" /></div>
  }

  if (espaces.length === 0) {
    return <WelcomeScreen onCreateEspace={async (nom, icone) => { await addEspace(nom, icone) }} />
  }

  const hasPreviousMonth = (monthModel.data || []).some(item => item.mois.slice(0, 7) < month.slice(0, 7))
  const hasHabits = (habitsModel.data || []).some(item => item.actif)

  const prepareEmptyMonth = async (mode: 'previous' | 'habits' | 'empty') => {
    if (!espace || !userId) return
    if (mode === 'empty') {
      await monthModel.createMonth.mutateAsync({ espace_id: espace.id, mois: month, user_id: userId })
      return
    }
    setPreparationMode(mode)
  }

  const confirmPreparation = async (selectedIds: string[]) => {
    const items = (preparationPreview.data?.items || []).filter(item => selectedIds.includes(item.id))
    await prepareMonth.mutateAsync(items)
    setPreparationMode(null)
  }

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />
      <div className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 pb-24 sm:px-4">
        <PageHeader
          eyebrow="Vue d’ensemble"
          title="Résumé"
          description="Une lecture claire de ta situation, de ce qui était prévu et de ce qui s’est réellement passé."
          action={!isAdminViewing ? (
            <Dialog open={openEspace} onOpenChange={setOpenEspace}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" />Nouveau Budget</Button>
              </DialogTrigger>
              <DialogContent className="mx-auto w-11/12 max-w-sm">
                <DialogHeader><DialogTitle>Nouveau Budget</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Nom (ex. Foyer)" value={newNom} onChange={e => setNewNom(e.target.value)} />
                  <EmojiPicker value={newIcone} onChange={setNewIcone} />
                  <Button className="w-full" onClick={async () => {
                    if (!newNom.trim()) return
                    await addEspace(newNom.trim(), newIcone || undefined)
                    setNewNom('')
                    setNewIcone('🏠')
                    setOpenEspace(false)
                  }}>Créer le Budget</Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : undefined}
        />

        {!moisId && (
          <EmptyMonthV2
            month={month}
            onPrepare={prepareEmptyMonth}
            onDefineHabits={() => router.push('/parametres?section=habitudes')}
            hasPreviousMonth={hasPreviousMonth}
            hasHabits={hasHabits}
            loading={monthModel.isLoading || habitsModel.isLoading || monthModel.createMonth.isPending || prepareMonth.isPending}
          />
        )}

        <MonthPreparationPreview
          open={preparationMode !== null}
          onOpenChange={open => { if (!open) setPreparationMode(null) }}
          espaceId={espace?.id}
          month={month}
          mode={preparationMode}
          onConfirm={confirmPreparation}
        />

        {espace?.solde_reference != null && espace?.date_solde_reference && today >= espace.date_solde_reference && (
          <SituationFinanciereV2
            balance={v2Balance.data}
            openingBalance={v2OpeningBalance.data}
            summary={v2Summary.data}
            loading={v2Balance.isLoading || v2OpeningBalance.isLoading || v2Summary.isLoading}
            referenceDate={espace.date_solde_reference}
            today={today}
            selectedMonth={month}
            plannedMonthResult={v2.plannedMonthResult}
            actualMonthResult={v2.actualMonthResult}
            projectedRemainingCashMovement={v2.projectedRemainingCashMovement}
            experimentalRemainingCashMovement={v2.experimentalRemainingCashMovement}
          />
        )}

        <PrevuReelV2
          plannedIncome={v2.plannedIncome}
          actualIncome={v2.actualIncome}
          expectedIncome={v2.expectedIncome}
          plannedFixed={v2.plannedFixed}
          actualFixed={v2.actualFixed}
          plannedVariable={v2.plannedVariable}
          actualVariable={v2.actualVariable}
          plannedSavingsDeposits={v2.plannedSavingsDeposits}
          actualSavingsDeposits={v2.actualSavingsDeposits}
        />

        <BudgetsV2 budgets={v2.budgetProgress} />

        <EpargneDettesV2
          savingsAvailable={v2.savingsDebtSummary.savingsAvailable}
          plannedSavings={v2.plannedSavingsDeposits}
          actualSavings={v2.actualSavingsDeposits}
          savingsWithdrawals={v2.savingsWithdrawals}
          debtRemaining={v2.savingsDebtSummary.debtRemaining}
          receivableRemaining={v2.savingsDebtSummary.receivableRemaining}
          loading={v2.savingsDebtLoading}
        />

        <ComprendreV2
          ratioChargesRevenus={insights.ratioChargesRevenus}
          tauxMaitrise={insights.tauxMaitrise}
          topExpense={insights.topExpense}
          topCategory={insights.topCategory}
          getNetAmount={getMontantNet}
        />

        <TodoResumeV2 />

      </div>
    </div>
  )
}
