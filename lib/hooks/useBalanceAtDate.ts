'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { balanceAtDate, summarizeCashFlows, type DatedFinancialFlow, type FinancialFlowKind } from '@/lib/financial-engine'

async function loadActualFlows(supabase: ReturnType<typeof createClient>, espaceId: string, doubleDate: boolean) {
  const { data: months, error: monthsError } = await supabase.from('mois').select('id').eq('espace_id', espaceId)
  if (monthsError) throw monthsError
  const monthIds = (months || []).map(month => month.id)
  if (!monthIds.length) return [] as DatedFinancialFlow[]

  const [
    { data: incomes, error: incomesError },
    { data: fixedExpenses, error: fixedError },
    { data: transactions, error: transactionsError },
    { data: savings, error: savingsError },
    { data: debts, error: debtsError },
  ] = await Promise.all([
    supabase.from('revenus').select('montant, recu, date_reelle').in('mois_id', monthIds),
    supabase.from('charges_fixes').select('montant, payee, date_reelle').in('mois_id', monthIds),
    supabase.from('transactions').select('id, montant, date, date_validation, is_split, parent_transaction_id, remboursements(montant, date)').in('mois_id', monthIds),
    supabase.from('mouvements_epargne').select('type, montant, date').in('mois_id', monthIds),
    supabase.from('dettes').select('id, type, remboursements_dette(montant, date, impacte_budget)').eq('espace_id', espaceId),
  ])
  if (incomesError) throw incomesError
  if (fixedError) throw fixedError
  if (transactionsError) throw transactionsError
  if (savingsError) throw savingsError
  if (debtsError) throw debtsError

  const flows: DatedFinancialFlow[] = []
  for (const income of incomes || []) if (income.recu && income.date_reelle) flows.push({ kind: 'earned_income', amount: Number(income.montant), date: income.date_reelle })
  for (const expense of fixedExpenses || []) if (expense.payee && expense.date_reelle) flows.push({ kind: 'expense', amount: Number(expense.montant), date: expense.date_reelle })

  for (const transaction of transactions || []) {
    if (transaction.is_split && !transaction.parent_transaction_id) continue
    if (transaction.date_validation) flows.push({ kind: 'expense', amount: Number(transaction.montant), date: doubleDate ? transaction.date_validation : transaction.date })
    const reimbursements = Array.isArray(transaction.remboursements) ? transaction.remboursements : transaction.remboursements ? [transaction.remboursements] : []
    for (const reimbursement of reimbursements) if (reimbursement.date) flows.push({ kind: 'expense_reimbursement', amount: Number(reimbursement.montant), date: reimbursement.date })
  }

  for (const debt of debts || []) {
    const repayments = Array.isArray(debt.remboursements_dette) ? debt.remboursements_dette : debt.remboursements_dette ? [debt.remboursements_dette] : []
    for (const repayment of repayments) if (repayment.impacte_budget && repayment.date) flows.push({
      kind: debt.type === 'je_dois' ? 'debt_repayment_out' : 'debt_repayment_in',
      amount: Number(repayment.montant),
      date: repayment.date,
    })
  }

  for (const movement of savings || []) {
    const kind: FinancialFlowKind = movement.type === 'epargne' ? 'savings_deposit' : movement.type === 'reprise' ? 'savings_withdrawal' : 'savings_transfer'
    flows.push({ kind, amount: Number(movement.montant), date: movement.date })
  }
  return flows
}

export function useBalanceAtDate(espaceId: string | undefined, referenceBalance: number | null | undefined, referenceDate: string | null | undefined, targetDate: string, doubleDate = false) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['balance_at_date', espaceId, referenceBalance, referenceDate, targetDate, doubleDate],
    enabled: !!espaceId && referenceBalance != null && !!referenceDate && !!targetDate,
    queryFn: async () => {
      if (!espaceId || referenceBalance == null || !referenceDate || targetDate < referenceDate) return null
      const flows = await loadActualFlows(supabase, espaceId, doubleDate)
      return balanceAtDate(Number(referenceBalance), referenceDate, targetDate, flows)
    },
  })
}

export function useActualCashSummary(espaceId: string | undefined, startDate: string, endDate: string, doubleDate = false) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['actual_cash_summary', espaceId, startDate, endDate, doubleDate],
    enabled: !!espaceId && !!startDate && !!endDate,
    queryFn: async () => {
      if (!espaceId) return null
      const flows = await loadActualFlows(supabase, espaceId, doubleDate)
      const periodFlows = flows.filter(flow => flow.date >= startDate && flow.date <= endDate)
      return summarizeCashFlows(periodFlows)
    },
  })
}
