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
import { localDateISO } from '@/lib/utils'

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
    // Analytical month result: recorded variable expenses are intentionally included even when
    // not bank-validated yet. The dated cash balance remains the source of truth for real cash.
    const actualMonthResult = actualIncome + savingsWithdrawals - actualFixed - actualVariable - actualSavingsDeposits

    // Remaining cash movement used by the current-month end forecast.
    // It starts from today's verified balance, so only flows not yet reflected in that balance
    // belong here. Variable budgets assume the remaining budget is fully consumed.
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
    }
  }, [revenus, charges, transactions, mouvements, budgets, plannedSavings])
}
