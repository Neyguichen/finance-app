'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { RemboursementAlsh } from '@/lib/types'

export function useRemboursementsAlsh() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['remboursements_alsh']

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('remboursements_alsh')
        .select('*')
        .order('periode_debut', { ascending: false })
      if (error) throw error
      return data as RemboursementAlsh[]
    },
  })

  const create = useMutation({
    mutationFn: async (item: Omit<RemboursementAlsh, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('remboursements_alsh')
        .insert(item)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RemboursementAlsh> & { id: string }) => {
      const { error } = await supabase
        .from('remboursements_alsh')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('remboursements_alsh')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { ...query, create, update, remove }
}