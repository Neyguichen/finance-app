'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { isHabitDue, type MonthPreparationItem } from '@/lib/month-preparation'

export function useMonthPreparation(espaceId: string | undefined, targetMonth: string, mode: 'previous' | 'habits' | null) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['month_preparation', espaceId, targetMonth, mode],
    enabled: !!espaceId && !!mode,
    queryFn: async () => {
      const items: MonthPreparationItem[] = []
      const targetDate = targetMonth.length === 7 ? `${targetMonth}-01` : targetMonth
      if (mode === 'previous') {
        const { data: previous, error } = await supabase.from('mois').select('id, mois').eq('espace_id', espaceId!).lt('mois', targetDate).order('mois', { ascending: false }).limit(1).maybeSingle()
        if (error) throw error
        if (!previous) return { mode, items, sourceMonth: undefined }

        const [revenus, fixes, budgets] = await Promise.all([
          supabase.from('revenus').select('id, nom, montant, recurrent_id, type, ordre').eq('mois_id', previous.id),
          supabase.from('charges_fixes').select('id, nom, montant, recurrent_id, categorie_id, sous_categorie_id, ordre').eq('mois_id', previous.id),
          supabase.from('budgets').select('id, categorie_id, prevu, categorie:categories(nom)').eq('mois_id', previous.id),
        ])
        if (revenus.error) throw revenus.error
        if (fixes.error) throw fixes.error
        if (budgets.error) throw budgets.error

        for (const row of revenus.data || []) items.push({ id: `income:${row.id}`, kind: 'income', label: row.nom, amount: Number(row.montant), sourceId: row.id, recurrentId: row.recurrent_id, incomeType: row.type as 'actif' | 'passif', order: row.ordre || 0, selected: true })
        for (const row of fixes.data || []) items.push({ id: `fixed:${row.id}`, kind: 'fixed', label: row.nom, amount: Number(row.montant), sourceId: row.id, recurrentId: row.recurrent_id, categoryId: row.categorie_id, subcategoryId: row.sous_categorie_id, order: row.ordre || 0, selected: true })
        for (const row of budgets.data || []) items.push({ id: `budget:${row.id}`, kind: 'budget', label: (row.categorie as { nom?: string } | null)?.nom || 'Budget variable', amount: Number(row.prevu), sourceId: row.id, categoryId: row.categorie_id, selected: true })
        return { mode, items, sourceMonth: previous.mois }
      }

      const [revenus, fixes, savings, budgetHabits, envelopes, currentMonth, previousMonth] = await Promise.all([
        supabase.from('revenus_recurrents').select('*').eq('espace_id', espaceId!),
        supabase.from('charges_fixes_recurrentes').select('*').eq('espace_id', espaceId!),
        supabase.from('epargne_recurrentes').select('*').eq('espace_id', espaceId!),
        supabase.from('budget_habitudes').select('*, categorie:categories(nom)').eq('espace_id', espaceId!),
        supabase.from('enveloppes').select('id, nom').eq('espace_id', espaceId!),
        supabase.from('mois').select('id').eq('espace_id', espaceId!).eq('mois', targetDate).maybeSingle(),
        supabase.from('mois').select('id').eq('espace_id', espaceId!).lt('mois',targetDate).order('mois',{ascending:false}).limit(1).maybeSingle(),
      ])
      if (revenus.error) throw revenus.error
      if (fixes.error) throw fixes.error
      if (savings.error) throw savings.error
      if (budgetHabits.error) throw budgetHabits.error
      if (envelopes.error) throw envelopes.error
      if (currentMonth.error) throw currentMonth.error
      if (previousMonth.error) throw previousMonth.error

      const envelopeNames = new Map((envelopes.data || []).map(e => [e.id, e.nom]))
      const existingIncomeSources = new Set<string>()
      const existingFixedSources = new Set<string>()
      const existingSavingsSources = new Set<string>()
      const existingBudgetCategories = new Set<string>()

      if (currentMonth.data?.id) {
        const [existingIncomes, existingFixes, existingSavings, existingBudgets] = await Promise.all([
          supabase.from('revenus').select('recurrent_id, preparation_source_id').eq('mois_id', currentMonth.data.id),
          supabase.from('charges_fixes').select('recurrent_id, preparation_source_id').eq('mois_id', currentMonth.data.id),
          supabase.from('epargne_prevues').select('recurrent_id').eq('mois_id', currentMonth.data.id),
          supabase.from('budgets').select('categorie_id').eq('mois_id', currentMonth.data.id),
        ])
        if (existingIncomes.error) throw existingIncomes.error
        if (existingFixes.error) throw existingFixes.error
        if (existingSavings.error) throw existingSavings.error
        if (existingBudgets.error) throw existingBudgets.error

        for (const row of existingIncomes.data || []) {
          if (row.recurrent_id) existingIncomeSources.add(row.recurrent_id)
          if (row.preparation_source_id) existingIncomeSources.add(row.preparation_source_id)
        }
        for (const row of existingFixes.data || []) {
          if (row.recurrent_id) existingFixedSources.add(row.recurrent_id)
          if (row.preparation_source_id) existingFixedSources.add(row.preparation_source_id)
        }
        for (const row of existingSavings.data || []) if (row.recurrent_id) existingSavingsSources.add(row.recurrent_id)
        for (const row of existingBudgets.data || []) if (row.categorie_id) existingBudgetCategories.add(row.categorie_id)
      }

      for (const row of revenus.data || []) {
        if (isHabitDue({ ...row, actif: true }, targetDate) && !existingIncomeSources.has(row.id)) {
          const inactive = row.actif === false
          items.push({ id: `income:${row.id}`, kind: 'income', label: row.nom, amount: Number(row.montant), sourceId: row.id, recurrentId: row.id, incomeType: row.type as 'actif' | 'passif', order: row.ordre || 0, selected: !inactive, inactive })
        }
      }
      for (const row of fixes.data || []) {
        if (isHabitDue({ ...row, actif: true }, targetDate) && !existingFixedSources.has(row.id)) {
          const inactive = row.actif === false
          items.push({ id: `fixed:${row.id}`, kind: 'fixed', label: row.nom, amount: Number(row.montant), sourceId: row.id, recurrentId: row.id, categoryId: row.categorie_id, subcategoryId: row.sous_categorie_id, order: row.ordre || 0, selected: !inactive, inactive })
        }
      }
      for (const row of savings.data || []) {
        if (isHabitDue({ ...row, actif: true }, targetDate) && !existingSavingsSources.has(row.id)) {
          const inactive = row.actif === false
          items.push({ id: `savings:${row.id}`, kind: 'savings', label: row.note || envelopeNames.get(row.enveloppe_dest_id) || 'Épargne', amount: Number(row.montant), sourceId: row.id, recurrentId: row.id, envelopeId: row.enveloppe_dest_id, order: row.ordre || 0, selected: !inactive, inactive })
        }
      }
      for (const row of budgetHabits.data || []) {
        if (isHabitDue({ ...row, actif: true }, targetDate) && !existingBudgetCategories.has(row.categorie_id)) {
          const inactive = row.actif === false
          items.push({ id: `budget:${row.id}`, kind: 'budget', label: (row.categorie as { nom?: string } | null)?.nom || 'Budget variable', amount: Number(row.montant), sourceId: row.id, categoryId: row.categorie_id, order: row.ordre || 0, selected: !inactive, inactive })
        }
      }
      // Fall back to the latest month's explicit budgets when no recurring
      // template exists for that category. Never overwrite a target-month budget.
      if (previousMonth.data?.id) {
        const { data: previousBudgets, error: previousBudgetError } = await supabase
          .from('budgets').select('id, categorie_id, prevu, categorie:categories(nom)')
          .eq('mois_id', previousMonth.data.id)
        if (previousBudgetError) throw previousBudgetError
        const templatedCategories = new Set((budgetHabits.data || []).map(row => row.categorie_id))
        for (const row of previousBudgets || []) {
          if (Number(row.prevu) <= 0 || templatedCategories.has(row.categorie_id) || existingBudgetCategories.has(row.categorie_id)) continue
          items.push({
            id: `budget:${row.id}`, kind: 'budget',
            label: (row.categorie as { nom?: string } | null)?.nom || 'Budget variable',
            amount: Number(row.prevu), sourceId: row.id,
            categoryId: row.categorie_id, selected: true,
          })
        }
      }
      return { mode, items, sourceMonth: undefined }
    },
  })
}


export function usePrepareMonth(espaceId: string | undefined, targetMonth: string, userId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (items: MonthPreparationItem[]) => {
      if (!espaceId || !userId) throw new Error('Budget ou utilisateur manquant')

      const { data, error } = await supabase.rpc('prepare_month_v2', {
        p_espace_id: espaceId,
        p_month: targetMonth.length === 7 ? `${targetMonth}-01` : targetMonth,
        p_items: items,
      })
      if (error) throw error

      const inactiveItems = items.filter(item => item.inactive && item.sourceId)
      const reactivationTables = {
        income: 'revenus_recurrents',
        fixed: 'charges_fixes_recurrentes',
        savings: 'epargne_recurrentes',
        budget: 'budget_habitudes',
      } as const

      for (const item of inactiveItems) {
        const table = reactivationTables[item.kind]
        const { error: reactivateError } = await supabase.from(table).update({ actif: true }).eq('id', item.sourceId!)
        if (reactivateError) throw reactivateError
      }

      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mois', espaceId] })
      queryClient.invalidateQueries({ queryKey: ['month_preparation', espaceId, targetMonth] })
      queryClient.invalidateQueries({ queryKey: ['revenus'] })
      queryClient.invalidateQueries({ queryKey: ['charges_fixes'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['epargne_prevues'] })
    },
  })
}
