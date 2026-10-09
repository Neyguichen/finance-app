'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type PlannedSavingsStatus = 'pending' | 'realized' | 'ignored'

export type PlannedSavingsOccurrence = {
  id: string
  mois_id: string
  enveloppe_dest_id: string | null
  recurrent_id: string | null
  montant: number
  date_prevue: string | null
  note: string | null
  ordre: number | null
  created_at: string | null
  statut: PlannedSavingsStatus
  mouvement_id: string | null
  realise_at: string | null
  ignore_at: string | null
}

export function usePlannedSavings(moisId?: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['epargne_prevues', moisId]

  const query = useQuery({
    queryKey: key,
    enabled: !!moisId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epargne_prevues')
        .select('*')
        .eq('mois_id', moisId!)
        .order('ordre')
        .order('created_at')
      if (error) throw error
      return (data || []) as PlannedSavingsOccurrence[]
    },
  })

  const invalidateSavings = () => {
    queryClient.invalidateQueries({ queryKey: ['epargne_prevues'] })
    queryClient.invalidateQueries({ queryKey: ['mouvements'] })
    queryClient.invalidateQueries({ queryKey: ['enveloppes_at_month'] })
    queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
    queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
    queryClient.invalidateQueries({ queryKey: ['savings_history'] })
  }

  const createOccurrence = useMutation({
    mutationFn: async ({
      mois_id,
      enveloppe_dest_id,
      montant,
      date_prevue,
      note,
    }: {
      mois_id: string
      enveloppe_dest_id: string
      montant: number
      date_prevue: string | null
      note: string | null
    }) => {
      if (!Number.isFinite(Number(montant)) || Number(montant) <= 0) {
        throw new Error('Le montant prévu doit être strictement positif.')
      }

      const { data, error } = await supabase
        .from('epargne_prevues')
        .insert({
          mois_id,
          enveloppe_dest_id,
          recurrent_id: null,
          montant: Number(montant),
          date_prevue,
          note,
          statut: 'pending',
          mouvement_id: null,
          realise_at: null,
          ignore_at: null,
        })
        .select()
        .single()
      if (error) throw error
      return data as PlannedSavingsOccurrence
    },
    onSuccess: invalidateSavings,
  })

  const updateOccurrence = useMutation({
    mutationFn: async ({ id, montant, note }: { id: string; montant?: number; note?: string | null }) => {
      if (montant !== undefined && (!Number.isFinite(Number(montant)) || Number(montant) <= 0)) {
        throw new Error('Le montant prévu doit être strictement positif.')
      }
      const updates: Record<string, unknown> = {}
      if (montant !== undefined) updates.montant = Number(montant)
      if (note !== undefined) updates.note = note

      const { error } = await supabase
        .from('epargne_prevues')
        .update(updates)
        .eq('id', id)
        .eq('statut', 'pending')
      if (error) throw error
    },
    onSuccess: invalidateSavings,
  })

  const validateOccurrence = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string }) => {
      const { data, error } = await supabase.rpc('validate_planned_savings', {
        p_planned_id: id,
        p_date: date,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: invalidateSavings,
  })

  const ignoreOccurrence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('epargne_prevues')
        .update({
          statut: 'ignored',
          ignore_at: new Date().toISOString(),
          mouvement_id: null,
          realise_at: null,
        })
        .eq('id', id)
        .eq('statut', 'pending')
      if (error) throw error
    },
    onSuccess: invalidateSavings,
  })

  const restoreOccurrence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('epargne_prevues')
        .update({
          statut: 'pending',
          ignore_at: null,
        })
        .eq('id', id)
        .eq('statut', 'ignored')
      if (error) throw error
    },
    onSuccess: invalidateSavings,
  })

  return {
    ...query,
    createOccurrence,
    updateOccurrence,
    validateOccurrence,
    ignoreOccurrence,
    restoreOccurrence,
  }
}
