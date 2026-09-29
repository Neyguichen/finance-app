'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { balanceAtDate, summarizeCashFlows, type DatedFinancialFlow, type FinancialFlowKind } from '@/lib/financial-engine'

async function loadActualFlows(supabase: ReturnType<typeof createClient>, espaceId: string, doubleDate: boolean) {
  const { data: months, error: monthsError } = await supabase.from('mois').select('id, mois').eq('espace_id', espaceId)
  if (monthsError) throw monthsError
  const monthIds = (months || []).map(month => month.id)
  const monthDateById = new Map((months || []).map(month => [month.id, month.mois]))

  const [
    { data: incomes, error: incomesError },
    { data: fixedExpenses, error: fixedError },
    { data: transactions, error: transactionsError },
    { data: savings, error: savingsError },
    { data: debts, error: debtsError },
  ] = await Promise.all([
    monthIds.length ? supabase.from('revenus').select('mois_id, montant, recu, date_reelle').in('mois_id', monthIds) : Promise.resolve({ data: [], error: null }),
    monthIds.length ? supabase.from('charges_fixes').select('mois_id, montant, montant_reel, payee, date_reelle').in('mois_id', monthIds) : Promise.resolve({ data: [], error: null }),
    monthIds.length ? supabase.from('transactions').select('id, montant, date, date_validation, is_split, parent_transaction_id, remboursements(montant, date)').in('mois_id', monthIds) : Promise.resolve({ data: [], error: null }),
    monthIds.length ? supabase.from('mouvements_epargne').select('type, montant, date').in('mois_id', monthIds) : Promise.resolve({ data: [], error: null }),
    supabase.from('dettes').select('id, type, remboursements_dette(montant, date, impacte_budget)').eq('espace_id', espaceId),
  ])
  if (incomesError) throw incomesError
  if (fixedError) throw fixedError
  if (transactionsError) throw transactionsError
  if (savingsError) throw savingsError
  if (debtsError) throw debtsError

  const flows: DatedFinancialFlow[] = []
  // Legacy V1 rows can be marked as received/paid without a precise real date.
  // They still represent actual cash flows. In that case, anchor the flow to the
  // accounting month so historical balances remain usable without inventing a
  // fake day of validation in the stored data.
  for (const income of incomes || []) {
    if (!income.recu) continue
    const date = income.date_reelle || monthDateById.get(income.mois_id)
    if (date) flows.push({ kind: 'earned_income', amount: Number(income.montant), date })
  }
  for (const expense of fixedExpenses || []) {
    if (!expense.payee) continue
    const date = expense.date_reelle || monthDateById.get(expense.mois_id)
    if (date) flows.push({ kind: 'expense', amount: Number(expense.montant_reel ?? expense.montant), date })
  }

  for (const transaction of transactions || []) {
    // A split parent is the single cash operation; its children are analytical allocation only.
    // This keeps the financial engine aligned with the accounting invariant and prevents
    // reimbursements attached to the parent from disappearing.
    if (transaction.parent_transaction_id) continue
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

// Actual period summaries share the same source of truth as dated balances.
// Cash-affecting mutations must invalidate both query families.
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
