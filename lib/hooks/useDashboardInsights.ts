'use client'

import { useApp } from '@/components/AppContext'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { useCategories } from '@/lib/hooks/useCategories'
import { useChargesFixes } from '@/lib/hooks/useChargesFixes'
import { useRevenus } from '@/lib/hooks/useRevenus'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { useAdminMoisData } from '@/lib/hooks/useAdminMoisData'
import { getMontantNet } from '@/lib/utils'
import { summarizeAnalyticalExpenses } from '@/lib/expense-summary'

export function useDashboardInsights() {
  const { moisId, month, espace, isAdminViewing } = useApp()

  const { data: revenus = [] } = useRevenus(moisId)
  const { data: charges = [] } = useChargesFixes(moisId)
  const { allFlat: transactionsFlat = [] } = useTransactions(moisId)
  const { data: categories = [] } = useCategories(espace?.id)
  const { data: budgets = [] } = useBudgets(moisId)
  const { data: adminData } = useAdminMoisData(month)

  const rev = isAdminViewing ? (adminData?.revenus || []) : revenus
  const chg = isAdminViewing ? (adminData?.charges_fixes || []) : charges
  const txn = isAdminViewing ? (adminData?.transactions || []) : transactionsFlat
  const cat = isAdminViewing ? (adminData?.categories || []) : categories
  const bgt = isAdminViewing ? (adminData?.budgets || []) : budgets

  const parentCats = cat.filter((item: any) => !item.parent_id && item.actif !== false)
  const parentCategoryIds = new Set(parentCats.map((item: any) => item.id))
  const parentBudgets = bgt.filter((item: any) => parentCategoryIds.has(item.categorie_id))

  const summary = summarizeAnalyticalExpenses(chg, parentBudgets, txn)
  const totalActiveIncome = rev
    .filter((item: any) => item.type === 'actif')
    .reduce((sum: number, item: any) => sum + Number(item.montant), 0)

  const ratioChargesRevenus = totalActiveIncome > 0
    ? Math.round((summary.plannedFixed / totalActiveIncome) * 100)
    : null

  const tauxMaitrise = summary.plannedVariable > 0
    ? Math.round((summary.actualVariable / summary.plannedVariable) * 100)
    : null

  const topExpense = [...txn]
    .sort((a: any, b: any) => getMontantNet(b) - getMontantNet(a))[0] || null

  const topCategory = parentCats
    .map((category: any) => {
      const depense = txn
        .filter((transaction: any) => transaction.categorie_id === category.id)
        .reduce((sum: number, transaction: any) => sum + getMontantNet(transaction), 0)

      return {
        id: category.id,
        nom: category.nom,
        icone: category.icone,
        depense,
      }
    })
    .filter((item: any) => item.depense > 0)
    .sort((a: any, b: any) => b.depense - a.depense)[0] || null

  return {
    ratioChargesRevenus,
    tauxMaitrise,
    topExpense,
    topCategory,
  }
}
