'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Revenu, RevenuRecurrent } from '@/lib/types'
import { localDateISO } from '@/lib/utils'

export function useRevenus(moisId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['revenus', moisId]

  const query = useQuery({
    queryKey: key,
    enabled: !!moisId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenus')
        .select('*')
        .eq('mois_id', moisId!)
        .order('ordre')
      if (error) throw error
      return data as Revenu[]
    },
  })

  const create = useMutation({
    mutationFn: async (revenu: Omit<Revenu, 'id'>) => {
      const { data, error } = await supabase
        .from('revenus')
        .insert(revenu)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
      queryClient.invalidateQueries({ queryKey: ['income_history'] })
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Revenu> & { id: string }) => {
      const { data, error } = await supabase
        .from('revenus')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
      queryClient.invalidateQueries({ queryKey: ['income_history'] })
    },
  })

  // Supprime l'instance mensuelle uniquement
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('revenus').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
      queryClient.invalidateQueries({ queryKey: ['income_history'] })
    },
  })

  // Supprime l'instance mensuelle ET désactive le modèle récurrent
  const removeDefinitif = useMutation({
    mutationFn: async ({ revenuId, recurrentId }: { revenuId: string; recurrentId: string }) => {
      // 1. Désactiver le récurrent
      const { error: recurrentError } = await supabase
        .from('revenus_recurrents')
        .update({ actif: false })
        .eq('id', recurrentId)
      if (recurrentError) throw recurrentError

      // 2. Supprimer l'instance du mois
      const { error: revenuError } = await supabase.from('revenus').delete().eq('id', revenuId)
      if (revenuError) throw revenuError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['revenus_recurrents'] })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
      queryClient.invalidateQueries({ queryKey: ['income_history'] })
    },
  })

  const updateFromMonth = useMutation({
    mutationFn: async ({ recurrentId, month, updates }: { recurrentId: string; month: string; updates: Partial<Revenu> }) => {
      const targetMonth = month.length === 7 ? month + '-01' : month
      const { data: months, error: monthsError } = await supabase
        .from('mois')
        .select('id')
        .gte('mois', targetMonth)
      if (monthsError) throw monthsError
      const monthIds = (months || []).map(item => item.id)

      if (monthIds.length) {
        const { error: incomeError } = await supabase
          .from('revenus')
          .update(updates)
          .eq('recurrent_id', recurrentId)
          .in('mois_id', monthIds)
        if (incomeError) throw incomeError
      }

      const recurrentUpdates: Record<string, unknown> = {}
      if (updates.nom !== undefined) recurrentUpdates.nom = updates.nom
      if (updates.montant !== undefined) recurrentUpdates.montant = updates.montant
      if (updates.type !== undefined) recurrentUpdates.type = updates.type
      const { error: recurrentError } = await supabase
        .from('revenus_recurrents')
        .update(recurrentUpdates)
        .eq('id', recurrentId)
      if (recurrentError) throw recurrentError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenus'] })
      queryClient.invalidateQueries({ queryKey: ['revenus_recurrents'] })
      queryClient.invalidateQueries({ queryKey: ['income_history'] })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
      queryClient.invalidateQueries({ queryKey: ['income_history'] })
    },
  })

  const removeFromMonth = useMutation({
    mutationFn: async ({ recurrentId, month }: { recurrentId: string; month: string }) => {
      const targetMonth = month.length === 7 ? month + '-01' : month
      const { data: months, error: monthsError } = await supabase
        .from('mois')
        .select('id')
        .gte('mois', targetMonth)
      if (monthsError) throw monthsError
      const monthIds = (months || []).map(item => item.id)

      if (monthIds.length) {
        const { error: incomeError } = await supabase
          .from('revenus')
          .delete()
          .eq('recurrent_id', recurrentId)
          .in('mois_id', monthIds)
        if (incomeError) throw incomeError
      }

      const { error: recurrentError } = await supabase
        .from('revenus_recurrents')
        .update({ actif: false })
        .eq('id', recurrentId)
      if (recurrentError) throw recurrentError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenus'] })
      queryClient.invalidateQueries({ queryKey: ['revenus_recurrents'] })
      queryClient.invalidateQueries({ queryKey: ['income_history'] })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
      queryClient.invalidateQueries({ queryKey: ['income_history'] })
    },
  })

  const toggleRecu = useMutation({
    mutationFn: async ({ id, recu, dateReelle }: { id: string; recu: boolean; dateReelle?: string | null }) => {
      const effectiveDate = recu
        ? (dateReelle === null ? null : (dateReelle || localDateISO()))
        : null
      const { error } = await supabase
        .from('revenus')
        .update({ recu, date_reelle: effectiveDate })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
      queryClient.invalidateQueries({ queryKey: ['income_history'] })
    },
  })

  return { ...query, create, update, updateFromMonth, remove, removeDefinitif, removeFromMonth, toggleRecu }
}

// Hook pour gérer les revenus récurrents (modèles par espace)
export function useRevenuOccurrences(recurrentId: string | null | undefined, espaceId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['revenu_occurrences', recurrentId, espaceId]

  const query = useQuery({
    queryKey: key,
    enabled: !!recurrentId && !!espaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenus')
        .select('*, mois:mois!inner(id, mois, espace_id)')
        .eq('recurrent_id', recurrentId!)
        .eq('mois.espace_id', espaceId!)
      if (error) throw error
      return (data || []).sort((a: any, b: any) => String(b.mois?.mois || '').localeCompare(String(a.mois?.mois || '')))
    },
  })

  const add = useMutation({
    mutationFn: async ({ targetMonth, recurring }: { targetMonth: string; recurring: RevenuRecurrent }) => {
      if (!espaceId) throw new Error('Budget manquant')
      const normalizedMonth = targetMonth.length === 7 ? targetMonth + '-01' : targetMonth

      let { data: monthRow, error: monthError } = await supabase
        .from('mois')
        .select('id')
        .eq('espace_id', espaceId)
        .eq('mois', normalizedMonth)
        .maybeSingle()
      if (monthError) throw monthError

      if (!monthRow) {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) throw new Error('Utilisateur non connecté')
        const created = await supabase
          .from('mois')
          .insert({ espace_id: espaceId, user_id: auth.user.id, mois: normalizedMonth })
          .select('id')
          .single()
        if (created.error) throw created.error
        monthRow = created.data
      }

      const existing = await supabase
        .from('revenus')
        .select('id')
        .eq('mois_id', monthRow.id)
        .eq('recurrent_id', recurring.id)
        .maybeSingle()
      if (existing.error) throw existing.error
      if (existing.data) return existing.data

      const { data, error } = await supabase
        .from('revenus')
        .insert({
          mois_id: monthRow.id,
          recurrent_id: recurring.id,
          type: recurring.type,
          nom: recurring.nom,
          montant: recurring.montant,
          recu: false,
          date_prevue: null,
          date_reelle: null,
          ordre: recurring.ordre || 0,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['revenus'] })
      queryClient.invalidateQueries({ queryKey: ['income_history'] })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('revenus').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['revenus'] })
      queryClient.invalidateQueries({ queryKey: ['income_history'] })
    },
  })

  return { ...query, add, remove }
}

// Hook pour gérer les revenus récurrents (modèles par espace)
export function useRevenusRecurrents(espaceId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['revenus_recurrents', espaceId]

  const query = useQuery({
    queryKey: key,
    enabled: !!espaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenus_recurrents')
        .select('*')
        .eq('espace_id', espaceId!)
        .order('ordre')
      if (error) throw error
      return data as RevenuRecurrent[]
    },
  })

  const create = useMutation({
    mutationFn: async (rec: Omit<RevenuRecurrent, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('revenus_recurrents')
        .insert(rec)
        .select()
        .single()
      if (error) throw error
      return data as RevenuRecurrent
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
      queryClient.invalidateQueries({ queryKey: ['income_history'] })
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RevenuRecurrent> & { id: string }) => {
      const { error } = await supabase
        .from('revenus_recurrents')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
      queryClient.invalidateQueries({ queryKey: ['income_history'] })
    },
  })

  return { ...query, create, update }
}
