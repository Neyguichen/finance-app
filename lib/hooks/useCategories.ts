'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Categorie } from '@/lib/types'

export type CategoryDependencyReport = {
  subcategories: number
  transactions: number
  fixed_expenses: number
  recurrences: number
  monthly_budgets: number
  budget_templates: number
}

export type CategoryRemovalResult = {
  status: 'eligible' | 'blocked' | 'archived' | 'deleted'
  can_delete: boolean
  references: CategoryDependencyReport
}


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

  // The server atomically checks every historical reference before deleting.
  // If a linked category is archived, its budget/transactions/history stay intact.
  const categoryRemoval = async (id: string, mode: 'check' | 'archive_or_delete' | 'delete_if_unused') => {
    const { data, error } = await supabase.rpc('archive_or_delete_category', {
      p_category_id: id,
      p_mode: mode,
    })
    if (error) throw error
    return data as CategoryRemovalResult
  }

  const checkRemoval = async (id: string) => categoryRemoval(id, 'check')

  const archive = useMutation({
    mutationFn: (id: string) => categoryRemoval(id, 'archive_or_delete'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const deleteUnused = useMutation({
    mutationFn: (id: string) => categoryRemoval(id, 'delete_if_unused'),
    onSuccess: result => {
      if (result.status === 'deleted') queryClient.invalidateQueries({ queryKey: key })
    },
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

  const merge = useMutation({
    mutationFn: async ({ sourceId, destinationId, budgetRule, previewOnly = false }: {
      sourceId: string; destinationId: string; budgetRule: 'destination' | 'sum' | 'max'; previewOnly?: boolean
    }) => {
      const { data, error } = await supabase.rpc('merge_categories_global', {
        p_source_id: sourceId, p_destination_id: destinationId,
        p_budget_rule: budgetRule, p_preview_only: previewOnly,
      })
      if (error) throw error
      return data as { transactions:number; fixed_expenses:number; recurrences:number; monthly_budgets:number; budget_templates:number; children:number }
    },
    onSuccess: (_data, params) => {
      if (params.previewOnly) return
      for (const prefix of ['categories', 'budgets', 'transactions', 'charges_fixes', 'charges_fixes_recurrentes', 'dashboard', 'month_preparation', 'habits']) {
        queryClient.invalidateQueries({ queryKey: [prefix] })
      }
    },
  })

  return { ...query, create, update, move, merge, remove: archive, checkRemoval, deleteUnused }
}