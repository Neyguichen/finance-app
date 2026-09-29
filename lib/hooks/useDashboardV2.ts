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

export function useDashboardV2() {
  const { moisId } = useApp()
  const { data: revenus = [] } = useRevenus(moisId)
  const { data: charges = [] } = useChargesFixes(moisId)
  const { allFlat: transactions = [] } = useTransactions(moisId)
  const { data: mouvements = [] } = useMouvements(moisId)
  const { data: budgets = [] } = useBudgets(moisId)
  const { data: plannedSavings = [] } = usePlannedSavings(moisId)

  return useMemo(() => {
    const plannedIncome = revenus.reduce((sum, item) => sum + Number(item.montant), 0)
    const actualIncome = revenus.filter(item => item.recu).reduce((sum, item) => sum + Number(item.montant), 0)
    const expectedIncome = Math.max(0, plannedIncome - actualIncome)

    const { plannedFixed, actualFixed, plannedVariable, actualVariable } =
      summarizeAnalyticalExpenses(charges, budgets, transactions)

    const plannedSavingsDeposits = plannedSavings.reduce((sum, item) => sum + Number(item.montant), 0)
    const actualSavingsDeposits = mouvements.filter(item => item.type === 'epargne').reduce((sum, item) => sum + Number(item.montant), 0)
    const savingsWithdrawals = mouvements.filter(item => item.type === 'reprise').reduce((sum, item) => sum + Number(item.montant), 0)
    const plannedMonthResult = plannedIncome - plannedFixed - plannedVariable - plannedSavingsDeposits
    // Analytical month result: recorded variable expenses are intentionally included even when
    // not bank-validated yet. The dated cash balance remains the source of truth for real cash.
    const actualMonthResult = actualIncome + savingsWithdrawals - actualFixed - actualVariable - actualSavingsDeposits

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
    }
  }, [revenus, charges, transactions, mouvements, budgets, plannedSavings])
}
