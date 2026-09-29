'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ReconciliationAction } from '@/lib/hooks/useBalanceReconciliationSuggestions'

export function useApplyReconciliationCorrection() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ actions, validationDate }: {
      actions: ReconciliationAction[]
      validationDate: string
    }) => {
      for (const action of actions) {
        if (action.kind === 'income') {
          const { error } = await supabase
            .from('revenus')
            .update({ recu: true, date_reelle: validationDate })
            .eq('id', action.id)
          if (error) throw error
        } else if (action.kind === 'fixed') {
          const { error } = await supabase
            .from('charges_fixes')
            .update({ payee: true, date_reelle: validationDate })
            .eq('id', action.id)
          if (error) throw error
        } else {
          const { data: current, error: currentError } = await supabase
            .from('transactions')
            .select('id, is_split')
            .eq('id', action.id)
            .single()
          if (currentError) throw currentError

          const { error } = await supabase
            .from('transactions')
            .update({ date_validation: validationDate })
            .eq('id', action.id)
          if (error) throw error

          if (current.is_split) {
            const { error: childrenError } = await supabase
              .from('transactions')
              .update({ date_validation: validationDate })
              .eq('parent_transaction_id', action.id)
            if (childrenError) throw childrenError
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
      queryClient.invalidateQueries({ queryKey: ['balance_reconciliation'] })
      queryClient.invalidateQueries({ queryKey: ['revenus'] })
      queryClient.invalidateQueries({ queryKey: ['charges_fixes'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-flat'] })
    },
  })
}
