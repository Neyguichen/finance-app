'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Budget } from '@/lib/types'

type BudgetCopyRow = {
  categorie_id: string
  prevu: number | string | null
}

const hasBudgetAmount = (budget: BudgetCopyRow) => Number(budget.prevu || 0) > 0

export function useBudgets(moisId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['budgets', moisId]

  const query = useQuery({
    queryKey: key,
    enabled: !!moisId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, categorie:categories(*)')
        .eq('mois_id', moisId!)
      if (error) throw error
      return data as Budget[]
    },
  })

  const upsert = useMutation({
    mutationFn: async ({ mois_id, categorie_id, prevu }: { mois_id: string; categorie_id: string; prevu: number }) => {
      const { data, error } = await supabase
        .from('budgets')
        .upsert({ mois_id, categorie_id, prevu }, { onConflict: 'mois_id,categorie_id' })
        .select('*, categorie:categories(*)')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const copyFromPrevious = useMutation({
    mutationFn: async ({ espace_id, currentMonth }: { espace_id: string; currentMonth: string }) => {
      const { data: prevMoisRec } = await supabase
        .from('mois')
        .select('id, mois')
        .eq('espace_id', espace_id)
        .lt('mois', currentMonth)
        .order('mois', { ascending: false })
        .limit(1)
        .single()
      if (!prevMoisRec) throw new Error('Aucun mois precedent trouve')

      const { data: prevBudgets } = await supabase
        .from('budgets')
        .select('categorie_id, prevu')
        .eq('mois_id', prevMoisRec.id)
      const prevBudgetsWithAmount = ((prevBudgets || []) as BudgetCopyRow[]).filter(hasBudgetAmount)
      if (prevBudgetsWithAmount.length === 0) {
        throw new Error('Aucun budget renseigne le mois precedent')
      }

      const { data: existingBudgets } = await supabase
        .from('budgets')
        .select('categorie_id, prevu')
        .eq('mois_id', moisId!)
      const existingCatIdsWithAmount = new Set(
        ((existingBudgets || []) as BudgetCopyRow[])
          .filter(hasBudgetAmount)
          .map(budget => budget.categorie_id)
      )
      const toCopy = prevBudgetsWithAmount.filter(
        budget => !existingCatIdsWithAmount.has(budget.categorie_id)
      )

      if (toCopy.length > 0) {
        const { error } = await supabase.from('budgets').upsert(
          toCopy.map(budget => ({
            mois_id: moisId!,
            categorie_id: budget.categorie_id,
            prevu: Number(budget.prevu),
          })),
          { onConflict: 'mois_id,categorie_id' }
        )
        if (error) throw error
      }

      return toCopy.length
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { ...query, upsert, copyFromPrevious }
}
