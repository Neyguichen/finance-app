'use client'

import { useMemo } from 'react'
import { useApp } from '@/components/AppContext'
import { useRevenus } from '@/lib/hooks/useRevenus'
import { useChargesFixes } from '@/lib/hooks/useChargesFixes'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { useMouvements } from '@/lib/hooks/useEpargne'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { useEnveloppesAtMonth } from '@/lib/hooks/useEnveloppesAtMonth'
import { useDettes } from '@/lib/hooks/useDettes'
import { summarizeAnalyticalExpenses } from '@/lib/expense-summary'
import { usePlannedSavings } from '@/lib/hooks/usePlannedSavings'
import { summarizeIncome } from '@/lib/income-summary'
import { getMontantNet, localDateISO } from '@/lib/utils'

function normalizeMovementDate(date: string) {
  return date.length === 7 ? `${date}-01` : date
}

export function useDashboardV2() {
  const { moisId, month, espace } = useApp()
  const { data: revenus = [] } = useRevenus(moisId)
  const { data: charges = [] } = useChargesFixes(moisId)
  const { allFlat: transactions = [] } = useTransactions(moisId)
  const { data: mouvements = [] } = useMouvements(moisId)
  const { data: budgets = [] } = useBudgets(moisId)
  const { data: plannedSavings = [] } = usePlannedSavings(moisId)
  const enveloppesQuery = useEnveloppesAtMonth(espace?.id, month)
  const detteModel = useDettes(espace?.id)
  const enveloppes = enveloppesQuery.data || []
  const dettes = detteModel.data || []
  const remboursementsDette = detteModel.remboursements.data || []

  return useMemo(() => {
    const today = localDateISO()
    const { plannedIncome, receivedIncome: actualIncome, expectedIncome } = summarizeIncome(revenus)

    const parentBudgets = budgets.filter(budget => !budget.categorie?.parent_id)
    const { plannedFixed, actualFixed, plannedVariable, actualVariable } =
      summarizeAnalyticalExpenses(charges, parentBudgets, transactions)

    const plannedSavingsDeposits = plannedSavings.reduce((sum, item) => sum + Number(item.montant), 0)
    const actualSavingsDeposits = mouvements.filter(item => item.type === 'epargne').reduce((sum, item) => sum + Number(item.montant), 0)
    const savingsWithdrawals = mouvements.filter(item => item.type === 'reprise').reduce((sum, item) => sum + Number(item.montant), 0)
    const plannedMonthResult = plannedIncome - plannedFixed - plannedVariable - plannedSavingsDeposits
    const actualMonthResult = actualIncome + savingsWithdrawals - actualFixed - actualVariable - actualSavingsDeposits

    const remainingIncomeCash = revenus
      .filter(item => !item.recu || Boolean(item.date_reelle && item.date_reelle > today))
      .reduce((sum, item) => sum + Number(item.montant), 0)

    const remainingFixedCash = charges
      .filter(item => !item.payee || Boolean(item.date_reelle && item.date_reelle > today))
      .reduce((sum, item) => sum + Number(item.payee ? (item.montant_reel ?? item.montant) : item.montant), 0)

    const pendingVariableCash = transactions
      .filter(item => !item.date_validation || item.date_validation > today)
      .reduce((sum, item) => sum + Number(item.montant), 0)

    const remainingVariableBudget = Math.max(0, plannedVariable - actualVariable)

    const futureRecordedSavings = mouvements
      .filter(item => item.type === 'epargne' && normalizeMovementDate(item.date) > today)
      .reduce((sum, item) => sum + Number(item.montant), 0)
    const remainingPlannedSavings = Math.max(0, plannedSavingsDeposits - actualSavingsDeposits)
    const remainingSavingsCash = futureRecordedSavings + remainingPlannedSavings

    const projectedRemainingCashMovement =
      remainingIncomeCash
      - remainingFixedCash
      - pendingVariableCash
      - remainingVariableBudget
      - remainingSavingsCash

    const isCurrentMonth = month === today.slice(0, 7)
    let experimentalVariableForecast: number | null = null
    let experimentalRemainingCashMovement: number | null = null

    if (isCurrentMonth) {
      const [year, monthNumber] = month.split('-').map(Number)
      const elapsedDays = Math.max(1, Number(today.slice(8, 10)))
      const daysInMonth = new Date(year, monthNumber, 0).getDate()
      const daysRemaining = Math.max(0, daysInMonth - elapsedDays)
      const actualVariableToDate = transactions
        .filter(transaction => transaction.date <= today)
        .reduce((sum, transaction) => sum + getMontantNet(transaction), 0)
      const dailyVariablePace = actualVariableToDate / elapsedDays
      experimentalVariableForecast = Math.max(0, dailyVariablePace * daysRemaining)
      experimentalRemainingCashMovement =
        remainingIncomeCash
        - remainingFixedCash
        - pendingVariableCash
        - experimentalVariableForecast
        - remainingSavingsCash
    }

    const budgetProgress = parentBudgets
      .filter(budget => Number(budget.prevu || 0) > 0)
      .map(budget => {
        const planned = Number(budget.prevu || 0)
        const actual = transactions
          .filter(transaction => transaction.categorie_id === budget.categorie_id)
          .reduce((sum, transaction) => sum + getMontantNet(transaction), 0)
        return {
          id: budget.id,
          categoryId: budget.categorie_id,
          name: budget.categorie?.nom || 'Budget',
          icon: budget.categorie?.icone || '💳',
          planned,
          actual,
          remaining: planned - actual,
          order: budget.categorie?.ordre ?? 999,
        }
      })
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fr'))

    const repaidByDebt = remboursementsDette.reduce<Record<string, number>>((acc, repayment) => {
      acc[repayment.dette_id] = (acc[repayment.dette_id] || 0) + Number(repayment.montant)
      return acc
    }, {})

    const savingsAvailable = enveloppes
      .filter(envelope => !envelope.archived)
      .reduce((sum, envelope) => sum + Number(envelope.solde), 0)

    const debtRemaining = dettes
      .filter(debt => !debt.archived && debt.type === 'je_dois')
      .reduce((sum, debt) => sum + Math.max(0, Number(debt.montant) - (repaidByDebt[debt.id] || 0)), 0)

    const receivableRemaining = dettes
      .filter(debt => !debt.archived && debt.type === 'jai_prete')
      .reduce((sum, debt) => sum + Math.max(0, Number(debt.montant) - (repaidByDebt[debt.id] || 0)), 0)

    return {
      plannedIncome,
      actualIncome,
      expectedIncome,
      plannedFixed,
      actualFixed,
      plannedVariable,
      actualVariable,
      plannedSavingsDeposits,
      actualSavingsDeposits,
      savingsWithdrawals,
      plannedOutflows: plannedFixed + plannedVariable + plannedSavingsDeposits,
      actualOutflows: actualFixed + actualVariable + actualSavingsDeposits,
      plannedMonthResult,
      actualMonthResult,
      projectedRemainingCashMovement,
      experimentalRemainingCashMovement,
      projectionDetails: {
        remainingIncomeCash,
        remainingFixedCash,
        pendingVariableCash,
        remainingVariableBudget,
        remainingSavingsCash,
        experimentalVariableForecast,
      },
      budgetProgress,
      savingsDebtSummary: {
        savingsAvailable,
        debtRemaining,
        receivableRemaining,
      },
      savingsDebtLoading: enveloppesQuery.isLoading || detteModel.isLoading || detteModel.remboursements.isLoading,
    }
  }, [
    month,
    revenus,
    charges,
    transactions,
    mouvements,
    budgets,
    plannedSavings,
    enveloppes,
    dettes,
    remboursementsDette,
    enveloppesQuery.isLoading,
    detteModel.isLoading,
    detteModel.remboursements.isLoading,
  ])
}
