'use client'

import { useMemo } from 'react'
import { useApp } from '@/components/AppContext'
import { useRevenus } from '@/lib/hooks/useRevenus'
import { useChargesFixes } from '@/lib/hooks/useChargesFixes'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { useMouvements } from '@/lib/hooks/useEpargne'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { getMontantNet } from '@/lib/utils'

export function useDashboardV2() {
  const { moisId } = useApp()
  const { data: revenus = [] } = useRevenus(moisId)
  const { data: charges = [] } = useChargesFixes(moisId)
  const { allFlat: transactions = [] } = useTransactions(moisId)
  const { data: mouvements = [] } = useMouvements(moisId)
  const { data: budgets = [] } = useBudgets(moisId)

  return useMemo(() => {
    const plannedIncome = revenus.reduce((sum, item) => sum + Number(item.montant), 0)
    const actualIncome = revenus.filter(item => item.recu).reduce((sum, item) => sum + Number(item.montant), 0)
    const expectedIncome = Math.max(0, plannedIncome - actualIncome)

    const plannedFixed = charges.reduce((sum, item) => sum + Number(item.montant), 0)
    const actualFixed = charges.filter(item => item.payee).reduce((sum, item) => sum + Number(item.montant), 0)

    const plannedVariable = budgets.reduce((sum, item) => sum + Number(item.prevu || 0), 0)
    const actualVariable = transactions.reduce((sum, item) => sum + getMontantNet(item), 0)

    const actualSavingsDeposits = mouvements.filter(item => item.type === 'epargne').reduce((sum, item) => sum + Number(item.montant), 0)
    const savingsWithdrawals = mouvements.filter(item => item.type === 'reprise').reduce((sum, item) => sum + Number(item.montant), 0)

    return {
      plannedIncome,
      actualIncome,
      expectedIncome,
      plannedFixed,
      actualFixed,
      plannedVariable,
      actualVariable,
      actualSavingsDeposits,
      savingsWithdrawals,
      plannedOutflows: plannedFixed + plannedVariable + actualSavingsDeposits,
      actualOutflows: actualFixed + actualVariable + actualSavingsDeposits,
    }
  }, [revenus, charges, transactions, mouvements, budgets])
}
