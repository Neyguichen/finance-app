'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Enveloppe, MouvementEpargne, EpargneRecurrente } from '@/lib/types'
import { plannedDateForMonth } from '@/lib/utils'

function assertValidSavingsMovement(mvt: Partial<MouvementEpargne>) {
  if (mvt.montant !== undefined) {
    const montant = Number(mvt.montant)
    if (!Number.isFinite(montant) || montant <= 0) {
      throw new Error('Le montant du mouvement d’épargne doit être strictement positif.')
    }
  }

  if (mvt.type === 'epargne' && !mvt.enveloppe_dest_id) {
    throw new Error('Une enveloppe de destination est obligatoire pour épargner.')
  }
  if (mvt.type === 'reprise' && !mvt.enveloppe_source_id) {
    throw new Error('Une enveloppe source est obligatoire pour une reprise.')
  }
  if (mvt.type === 'transfert') {
    if (!mvt.enveloppe_source_id || !mvt.enveloppe_dest_id) {
      throw new Error('Une source et une destination sont obligatoires pour un transfert.')
    }
    if (mvt.enveloppe_source_id === mvt.enveloppe_dest_id) {
      throw new Error('La source et la destination d’un transfert doivent être différentes.')
    }
  }
}

export function useEnveloppes(espaceId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['enveloppes', espaceId]

  const query = useQuery({
    queryKey: key,
    enabled: !!espaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enveloppes')
        .select('*')
        .eq('espace_id', espaceId!)
        .order('ordre')
      if (error) throw error
      return data as Enveloppe[]
    },
  })

  const create = useMutation({
    mutationFn: async (env: Omit<Enveloppe, 'id' | 'archived'>) => {
      const { data, error } = await supabase
        .from('enveloppes')
        .insert(env)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['enveloppes_at_month'] })
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Enveloppe> & { id: string }) => {
      const { error } = await supabase
        .from('enveloppes')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['enveloppes_at_month'] })
    },
  })

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('enveloppes')
        .update({ archived: true })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['enveloppes_at_month'] })
    },
  })

  const unarchive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('enveloppes')
        .update({ archived: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['enveloppes_at_month'] })
    },
  })

  return { ...query, create, update, archive, unarchive }
}

export function useMouvements(moisId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['mouvements', moisId]

  const query = useQuery({
    queryKey: key,
    enabled: !!moisId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mouvements_epargne')
        .select('*')
        .eq('mois_id', moisId!)
        .order('date', { ascending: false })
      if (error) throw error
      return data as MouvementEpargne[]
    },
  })

  const create = useMutation({
    mutationFn: async (mvt: Omit<MouvementEpargne, 'id'>) => {
      assertValidSavingsMovement(mvt)
      const { data, error } = await supabase
        .from('mouvements_epargne')
        .insert(mvt)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['enveloppes'] })
      queryClient.invalidateQueries({ queryKey: ['enveloppes_at_month'] })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
      queryClient.invalidateQueries({ queryKey: ['savings_history'] })
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MouvementEpargne> & { id: string }) => {
      assertValidSavingsMovement(updates)
      const { error } = await supabase
        .from('mouvements_epargne')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['enveloppes'] })
      queryClient.invalidateQueries({ queryKey: ['enveloppes_at_month'] })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
      queryClient.invalidateQueries({ queryKey: ['savings_history'] })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mouvements_epargne').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['enveloppes'] })
      queryClient.invalidateQueries({ queryKey: ['enveloppes_at_month'] })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
      queryClient.invalidateQueries({ queryKey: ['savings_history'] })
    },
  })

  const removeDefinitif = useMutation({
    mutationFn: async ({ mouvementId, recurrentId }: { mouvementId: string; recurrentId: string }) => {
      const { error: recurrentError } = await supabase
        .from('epargne_recurrentes')
        .update({ actif: false })
        .eq('id', recurrentId)
      if (recurrentError) throw recurrentError

      const { error: mouvementError } = await supabase
        .from('mouvements_epargne')
        .delete()
        .eq('id', mouvementId)
      if (mouvementError) throw mouvementError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['enveloppes'] })
      queryClient.invalidateQueries({ queryKey: ['enveloppes_at_month'] })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
      queryClient.invalidateQueries({ queryKey: ['savings_history'] })
      queryClient.invalidateQueries({ queryKey: ['epargne_recurrentes'] })
    },
  })

  return { ...query, create, update, remove, removeDefinitif }
}

// Hook pour gérer les versements épargne récurrents (modèles par espace)
export function useEpargneRecurrentes(espaceId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['epargne_recurrentes', espaceId]

  const query = useQuery({
    queryKey: key,
    enabled: !!espaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epargne_recurrentes')
        .select('*')
        .eq('espace_id', espaceId!)
        .order('ordre')
      if (error) throw error
      return data as EpargneRecurrente[]
    },
  })

  const create = useMutation({
    mutationFn: async (rec: Omit<EpargneRecurrente, 'id' | 'created_at'>) => {
      // Éviter de recréer une série identique lorsqu'une récurrence active existe déjà.
      const { data: existing, error: existingError } = await supabase
        .from('epargne_recurrentes')
        .select('*')
        .eq('espace_id', rec.espace_id)
        .eq('enveloppe_dest_id', rec.enveloppe_dest_id)
        .eq('montant', rec.montant)
        .eq('frequence_mois', rec.frequence_mois)
        .eq('actif', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (existingError) throw existingError
      if (existing) return existing as EpargneRecurrente

      const { data, error } = await supabase
        .from('epargne_recurrentes')
        .insert(rec)
        .select()
        .single()
      if (error) throw error
      return data as EpargneRecurrente
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EpargneRecurrente> & { id: string }) => {
      const { error } = await supabase
        .from('epargne_recurrentes')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['epargne_prevues'] })
    },
  })

  const updateFromMonth = useMutation({
    mutationFn: async ({
      id,
      fromMonth,
      updates,
    }: {
      id: string
      fromMonth: string
      updates: Partial<EpargneRecurrente>
    }) => {
      const normalizedMonth = fromMonth.length === 7 ? fromMonth + '-01' : fromMonth

      const { error: recurrentError } = await supabase
        .from('epargne_recurrentes')
        .update(updates)
        .eq('id', id)
      if (recurrentError) throw recurrentError

      const { data: months, error: monthsError } = await supabase
        .from('mois')
        .select('id, mois')
        .eq('espace_id', espaceId!)
        .gte('mois', normalizedMonth)
      if (monthsError) throw monthsError

      const monthIds = (months || []).map(row => row.id)
      if (!monthIds.length) return

      if (updates.jour_prevu !== undefined) {
        for (const monthRow of months || []) {
          const { error: dateError } = await supabase
            .from('epargne_prevues')
            .update({ date_prevue: plannedDateForMonth(monthRow.mois, updates.jour_prevu) })
            .eq('recurrent_id', id)
            .eq('mois_id', monthRow.id)
          if (dateError) throw dateError
        }
      }

      const plannedUpdates: Record<string, unknown> = {}
      if (updates.montant !== undefined) plannedUpdates.montant = updates.montant
      if (updates.enveloppe_dest_id !== undefined) plannedUpdates.enveloppe_dest_id = updates.enveloppe_dest_id

      if (Object.keys(plannedUpdates).length) {
        const { error: plannedError } = await supabase
          .from('epargne_prevues')
          .update(plannedUpdates)
          .eq('recurrent_id', id)
          .in('mois_id', monthIds)
        if (plannedError) throw plannedError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['epargne_prevues'] })
      queryClient.invalidateQueries({ queryKey: ['month_preparation'] })
    },
  })

  return { ...query, create, update, updateFromMonth }
}
