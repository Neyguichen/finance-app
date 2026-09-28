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
      if (mode === 'previous') {
        const { data: previous, error } = await supabase.from('mois').select('id, mois').eq('espace_id', espaceId!).lt('mois', targetMonth).order('mois', { ascending: false }).limit(1).maybeSingle()
        if (error) throw error
        if (!previous) return { mode, items, sourceMonth: undefined }

        const [revenus, fixes, budgets] = await Promise.all([
          supabase.from('revenus').select('id, nom, montant, recurrent_id, type, ordre').eq('mois_id', previous.id),
          supabase.from('charges_fixes').select('id, nom, montant, recurrent_id, ordre').eq('mois_id', previous.id),
          supabase.from('budgets').select('id, categorie_id, prevu, categorie:categories(nom)').eq('mois_id', previous.id),
        ])
        if (revenus.error) throw revenus.error
        if (fixes.error) throw fixes.error
        if (budgets.error) throw budgets.error

        for (const row of revenus.data || []) items.push({ id: `income:${row.id}`, kind: 'income', label: row.nom, amount: Number(row.montant), sourceId: row.id, recurrentId: row.recurrent_id, incomeType: row.type as 'actif' | 'passif', order: row.ordre || 0, selected: true })
        for (const row of fixes.data || []) items.push({ id: `fixed:${row.id}`, kind: 'fixed', label: row.nom, amount: Number(row.montant), sourceId: row.id, recurrentId: row.recurrent_id, order: row.ordre || 0, selected: true })
        for (const row of budgets.data || []) items.push({ id: `budget:${row.id}`, kind: 'budget', label: (row.categorie as { nom?: string } | null)?.nom || 'Budget variable', amount: Number(row.prevu), sourceId: row.id, categoryId: row.categorie_id, selected: true })
        return { mode, items, sourceMonth: previous.mois }
      }

      const [revenus, fixes, savings, envelopes] = await Promise.all([
        supabase.from('revenus_recurrents').select('*').eq('espace_id', espaceId!).eq('actif', true),
        supabase.from('charges_fixes_recurrentes').select('*').eq('espace_id', espaceId!).eq('actif', true),
        supabase.from('epargne_recurrentes').select('*').eq('espace_id', espaceId!).eq('actif', true),
        supabase.from('enveloppes').select('id, nom').eq('espace_id', espaceId!),
      ])
      if (revenus.error) throw revenus.error
      if (fixes.error) throw fixes.error
      if (savings.error) throw savings.error
      if (envelopes.error) throw envelopes.error
      const envelopeNames = new Map((envelopes.data || []).map(e => [e.id, e.nom]))

      for (const row of revenus.data || []) if (isHabitDue(row, targetMonth)) items.push({ id: `income:${row.id}`, kind: 'income', label: row.nom, amount: Number(row.montant), sourceId: row.id, recurrentId: row.id, incomeType: row.type as 'actif' | 'passif', order: row.ordre || 0, selected: true })
      for (const row of fixes.data || []) if (isHabitDue(row, targetMonth)) items.push({ id: `fixed:${row.id}`, kind: 'fixed', label: row.nom, amount: Number(row.montant), sourceId: row.id, recurrentId: row.id, order: row.ordre || 0, selected: true })
      for (const row of savings.data || []) if (isHabitDue(row, targetMonth)) items.push({ id: `savings:${row.id}`, kind: 'savings', label: row.note || envelopeNames.get(row.enveloppe_dest_id) || 'Épargne', amount: Number(row.montant), sourceId: row.id, recurrentId: row.id, envelopeId: row.enveloppe_dest_id, order: row.ordre || 0, selected: true })
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
        p_month: targetMonth,
        p_items: items,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mois', espaceId] })
      queryClient.invalidateQueries({ queryKey: ['month_preparation', espaceId, targetMonth] })
      queryClient.invalidateQueries({ queryKey: ['epargne_prevues'] })
    },
  })
}
