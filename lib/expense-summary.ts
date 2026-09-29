import { getMontantNet } from '@/lib/utils'

type FixedExpenseLike = {
  montant: number | string
  montant_reel?: number | string | null
  payee?: boolean | null
}

type BudgetLike = {
  prevu?: number | string | null
}

type TransactionLike = {
  montant: number | string
  remboursements?: Array<{ montant: number | string }> | null
}

export function summarizeAnalyticalExpenses(
  fixedExpenses: FixedExpenseLike[],
  budgets: BudgetLike[],
  transactions: TransactionLike[]
) {
  const plannedFixed = fixedExpenses.reduce((sum, item) => sum + Number(item.montant), 0)
  const actualFixed = fixedExpenses
    .filter(item => item.payee)
    .reduce((sum, item) => sum + Number(item.montant_reel ?? item.montant), 0)
  const plannedVariable = budgets.reduce((sum, item) => sum + Number(item.prevu || 0), 0)
  const actualVariable = transactions.reduce((sum, item) => sum + getMontantNet(item), 0)

  return {
    plannedFixed,
    actualFixed,
    plannedVariable,
    actualVariable,
    plannedTotal: plannedFixed + plannedVariable,
    actualTotal: actualFixed + actualVariable,
  }
}
