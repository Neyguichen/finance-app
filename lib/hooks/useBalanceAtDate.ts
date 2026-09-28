'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { balanceAtDate, type DatedFinancialFlow } from '@/lib/financial-engine'

export function useBalanceAtDate(
  espaceId: string | undefined,
  referenceBalance: number | null | undefined,
  referenceDate: string | null | undefined,
  targetDate: string,
  doubleDate = false
) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['balance_at_date', espaceId, referenceBalance, referenceDate, targetDate, doubleDate],
    enabled: !!espaceId && referenceBalance != null && !!referenceDate && !!targetDate,
    queryFn: async () => {
      if (!espaceId || referenceBalance == null || !referenceDate) return null
      if (targetDate < referenceDate) return null

      const { data: months, error: monthsError } = await supabase
        .from('mois')
        .select('id')
        .eq('espace_id', espaceId)
      if (monthsError) throw monthsError

      const monthIds = (months || []).map(month => month.id)
      if (monthIds.length === 0) return Number(referenceBalance)

      const [
        { data: incomes, error: incomesError },
        { data: fixedExpenses, error: fixedError },
        { data: transactions, error: transactionsError },
        { data: savings, error: savingsError },
        { data: debts, error: debtsError },
      ] = await Promise.all([
        supabase.from('revenus').select('montant, recu, date_reelle').in('mois_id', monthIds),
        supabase.from('charges_fixes').select('montant, payee, date_reelle').in('mois_id', monthIds),
        supabase.from('transactions')
          .select('id, montant, date, date_validation, is_split, parent_transaction_id, remboursements(montant, date)')
          .in('mois_id', monthIds),
        supabase.from('mouvements_epargne').select('type, montant, date').in('mois_id', monthIds),
        supabase.from('dettes')
          .select('id, type, remboursements_dette(montant, date, impacte_budget)')
          .eq('espace_id', espaceId),
      ])

      if (incomesError) throw incomesError
      if (fixedError) throw fixedError
      if (transactionsError) throw transactionsError
      if (savingsError) throw savingsError
      if (debtsError) throw debtsError

      const flows: DatedFinancialFlow[] = []

      for (const income of incomes || []) {
        if (income.recu && income.date_reelle) {
          flows.push({ kind: 'earned_income', amount: Number(income.montant), date: income.date_reelle })
        }
      }

      for (const expense of fixedExpenses || []) {
        if (expense.payee && expense.date_reelle) {
          flows.push({ kind: 'expense', amount: Number(expense.montant), date: expense.date_reelle })
        }
      }

      for (const transaction of transactions || []) {
        // A split parent is only a container: children carry the accounting amounts.
        if (transaction.is_split && !transaction.parent_transaction_id) continue

        // Standard mode: date_validation acts as the validation checkbox state;
        // the cash effect stays on the transaction date.
        // Double-date mode: date_validation is the bank debit date and therefore
        // both validates the transaction and dates its cash effect.
        if (transaction.date_validation) {
          flows.push({
            kind: 'expense',
            amount: Number(transaction.montant),
            date: doubleDate ? transaction.date_validation : transaction.date,
          })
        }

        // A reimbursement is its own cash inflow on its real date. Subtracting
        // it from the original purchase would falsify balances between the two dates.
        for (const reimbursement of transaction.remboursements || []) {
          flows.push({
            kind: 'expense_reimbursement',
            amount: Number(reimbursement.montant),
            date: reimbursement.date,
          })
        }
      }

      for (const debt of debts || []) {
        for (const repayment of debt.remboursements_dette || []) {
          if (!repayment.impacte_budget) continue

          flows.push({
            kind: debt.type === 'je_dois' ? 'debt_repayment_out' : 'debt_repayment_in',
            amount: Number(repayment.montant),
            date: repayment.date,
          })
        }
      }

      for (const movement of savings || []) {
        const kind =
          movement.type === 'epargne'
            ? 'savings_deposit'
            : movement.type === 'reprise'
              ? 'savings_withdrawal'
              : 'savings_transfer'

        flows.push({ kind, amount: Number(movement.montant), date: movement.date })
      }

      return balanceAtDate(Number(referenceBalance), referenceDate, targetDate, flows)
    },
  })
}
