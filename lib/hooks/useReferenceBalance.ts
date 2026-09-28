'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface SetReferenceBalanceInput {
  espaceId: string
  balance: number
  date: string
}

/**
 * Stores a real, user-verified balance as the V2 accounting anchor.
 * It intentionally does not rewrite solde_initial or any historical operation.
 */
export function useReferenceBalance() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ espaceId, balance, date }: SetReferenceBalanceInput) => {
      if (!date) throw new Error('Reference date is required')
      if (!Number.isFinite(balance)) throw new Error('Reference balance must be a finite number')

      const { data, error } = await supabase
        .from('espaces')
        .update({
          solde_reference: balance,
          date_solde_reference: date,
        })
        .eq('id', espaceId)
        .select('id, solde_reference, date_solde_reference')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference_balance'] })
    },
  })
}
