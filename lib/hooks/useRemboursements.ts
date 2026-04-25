'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Remboursement } from '@/lib/types'

export function useRemboursements(transactionId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['remboursements', transactionId]

  const query = useQuery({
    queryKey: key,
    enabled: !!transactionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('remboursements')
        .select('*')
        .eq('transaction_id', transactionId!)
        .order('date', { ascending: false })
      if (error) throw error
      return data as Remboursement[]
    },
  })

  const create = useMutation({
    mutationFn: async (r: Omit<Remboursement, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('remboursements')
        .insert(r)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
  
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('remboursements').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  return { ...query, create, remove }
}