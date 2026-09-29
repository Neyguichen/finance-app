'use client'

import { useMemo } from 'react'
import { useApp } from '@/components/AppContext'
import { useRevenus } from '@/lib/hooks/useRevenus'
import { useChargesFixes } from '@/lib/hooks/useChargesFixes'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { useMouvements } from '@/lib/hooks/useEpargne'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { summarizeAnalyticalExpenses } from '@/lib/expense-summary'
import { usePlannedSavings } from '@/lib/hooks/usePlannedSavings'
import { summarizeIncome } from '@/lib/income-summary'
import { getMontantNet, localDateISO } from '@/lib/utils'

function normalizeMovementDate(date: string) {
  return date.length === 7 ? `${date}-01` : date
}

export function useDashboardV2() {
  const { moisId } = useApp()
  const { data: revenus = [] } = useRevenus(moisId)
  const { data: charges = [] } = useChargesFixes(moisId)
  const { allFlat: transactions = [] } = useTransactions(moisId)
  const { data: mouvements = [] } = useMouvements(moisId)
  const { data: budgets = [] } = useBudgets(moisId)
  const { data: plannedSavings = [] } = usePlannedSavings(moisId)

  return useMemo(() => {
    const today = localDateISO()
    const { plannedIncome, receivedIncome: actualIncome, expectedIncome } = summarizeIncome(revenus)

    const { plannedFixed, actualFixed, plannedVariable, actualVariable } =
      summarizeAnalyticalExpenses(charges, budgets, transactions)

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

    const budgetProgress = budgets
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
      projectionDetails: {
        remainingIncomeCash,
        remainingFixedCash,
        pendingVariableCash,
        remainingVariableBudget,
        remainingSavingsCash,
      },
      budgetProgress,
    }
  }, [revenus, charges, transactions, mouvements, budgets, plannedSavings])
}
