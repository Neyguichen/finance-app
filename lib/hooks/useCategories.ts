'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Categorie } from '@/lib/types'

export function useCategories(espaceId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['categories', espaceId]

  const query = useQuery({
    queryKey: key,
    enabled: !!espaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('espace_id', espaceId!)
        .order('ordre')
      if (error) throw error
      return data as Categorie[]
    },
  })

  const create = useMutation({
    mutationFn: async (cat: Omit<Categorie, 'id'>) => {
      const { data, error } = await supabase
        .from('categories')
        .insert(cat)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Categorie> & { id: string }) => {
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .update({ actif: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
  
  const move = useMutation({
    mutationFn: async ({ id, parentId }: { id: string; parentId: string | null }) => {
      const { error } = await supabase.rpc('move_category_global', {
        p_category_id: id, p_new_parent_id: parentId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', espaceId] })
      for (const prefix of ['budgets', 'transactions', 'charges_fixes', 'charges_fixes_recurrentes', 'dashboard', 'month_preparation']) {
        queryClient.invalidateQueries({ queryKey: [prefix] })
      }
    },
  })

  return { ...query, create, update, move, remove: archive }
}