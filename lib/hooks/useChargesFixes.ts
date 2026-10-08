'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ChargeFixe, ChargeFixeRecurrente } from '@/lib/types'
import { localDateISO, plannedDateForMonth } from '@/lib/utils'

export function useChargesFixes(moisId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['charges_fixes', moisId]

  const query = useQuery({
    queryKey: key,
    enabled: !!moisId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charges_fixes')
        .select('*')
        .eq('mois_id', moisId!)
        .order('ordre')
      if (error) throw error
      return data as ChargeFixe[]
    },
  })

  const create = useMutation({
    mutationFn: async (charge: Omit<ChargeFixe, 'id'>) => {
      const { data, error } = await supabase
        .from('charges_fixes')
        .insert(charge)
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
    },
  })

  const togglePayee = useMutation({
    mutationFn: async ({ id, payee, dateReelle }: { id: string; payee: boolean; dateReelle?: string | null }) => {
      const effectiveDate = payee
        ? (dateReelle === null ? null : (dateReelle || localDateISO()))
        : null
      const { error } = await supabase
        .from('charges_fixes')
        .update({ payee, date_reelle: effectiveDate })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChargeFixe> & { id: string }) => {
      const { error } = await supabase
        .from('charges_fixes')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
    },
  })

  // Supprime l'instance mensuelle uniquement
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('charges_fixes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
    },
  })

  // Supprime l'instance mensuelle ET désactive le modèle récurrent
  const removeDefinitif = useMutation({
    mutationFn: async ({ chargeId, recurrentId }: { chargeId: string; recurrentId: string }) => {
      await supabase
        .from('charges_fixes_recurrentes')
        .update({ actif: false })
        .eq('id', recurrentId)
      await supabase.from('charges_fixes').delete().eq('id', chargeId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['charges_fixes_recurrentes'] })
    },
  })

  return { ...query, create, togglePayee, update, remove, removeDefinitif }
}

// Hook pour gérer les charges fixes récurrentes (modèles par espace)
export function useChargeFixeOccurrences(recurrentId: string | null | undefined, espaceId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['charge_fixe_occurrences', recurrentId, espaceId]

  const query = useQuery({
    queryKey: key,
    enabled: !!recurrentId && !!espaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charges_fixes')
        .select('*, mois:mois!inner(id, mois, espace_id)')
        .eq('recurrent_id', recurrentId!)
        .eq('mois.espace_id', espaceId!)
      if (error) throw error
      return (data || []).sort((a: any, b: any) => String(b.mois?.mois || '').localeCompare(String(a.mois?.mois || '')))
    },
  })

  const add = useMutation({
    mutationFn: async ({ targetMonth, recurring }: { targetMonth: string; recurring: ChargeFixeRecurrente }) => {
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
        .from('charges_fixes')
        .select('id')
        .eq('mois_id', monthRow.id)
        .eq('recurrent_id', recurring.id)
        .maybeSingle()
      if (existing.error) throw existing.error
      if (existing.data) return existing.data

      const { data, error } = await supabase
        .from('charges_fixes')
        .insert({
          mois_id: monthRow.id,
          recurrent_id: recurring.id,
          nom: recurring.nom,
          montant: recurring.montant,
          categorie_id: null,
          sous_categorie_id: null,
          payee: false,
          date_prevue: plannedDateForMonth(normalizedMonth, recurring.jour_prevu),
          ordre: recurring.ordre || 0,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['charges_fixes'] })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('charges_fixes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['charges_fixes'] })
    },
  })

  const updateScope = useMutation({
    mutationFn: async ({
      recurrentId,
      currentMonth,
      scope,
      updates,
    }: {
      recurrentId: string
      currentMonth: string
      scope: 'future' | 'all'
      updates: Partial<ChargeFixe>
    }) => {
      if (!espaceId) throw new Error('Budget manquant')
      let monthsQuery = supabase.from('mois').select('id').eq('espace_id', espaceId)
      if (scope === 'future') monthsQuery = monthsQuery.gte('mois', currentMonth.length === 7 ? currentMonth + '-01' : currentMonth)
      const { data: monthRows, error: monthsError } = await monthsQuery
      if (monthsError) throw monthsError
      const ids = (monthRows || []).map(row => row.id)
      if (ids.length === 0) return
      const { error } = await supabase
        .from('charges_fixes')
        .update(updates)
        .eq('recurrent_id', recurrentId)
        .in('mois_id', ids)
      if (error) throw error

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['charges_fixes'] })
    },
  })

  return { ...query, add, remove, updateScope }
}

export function useChargesFixesRecurrentes(espaceId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['charges_fixes_recurrentes', espaceId]

  const query = useQuery({
    queryKey: key,
    enabled: !!espaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charges_fixes_recurrentes')
        .select('*')
        .eq('espace_id', espaceId!)
        .order('ordre')
      if (error) throw error
      return data as ChargeFixeRecurrente[]
    },
  })

  const create = useMutation({
    mutationFn: async (rec: Omit<ChargeFixeRecurrente, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('charges_fixes_recurrentes')
        .insert(rec)
        .select()
        .single()
      if (error) throw error
      return data as ChargeFixeRecurrente
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChargeFixeRecurrente> & { id: string }) => {
      const { error } = await supabase
        .from('charges_fixes_recurrentes')
        .update(updates)
        .eq('id', id)
      if (error) throw error

      // Le jour prévu appartient au modèle récurrent : lorsqu'il change,
      // réaligner les occurrences déjà générées qui ne sont pas encore validées.
      if (updates.jour_prevu !== undefined) {
        const { data: occurrences, error: occurrencesError } = await supabase
          .from('charges_fixes')
          .select('id, mois:mois!inner(mois)')
          .eq('recurrent_id', id)
          .eq('payee', false)
        if (occurrencesError) throw occurrencesError

        for (const occurrence of occurrences || []) {
          const occurrenceMonth = (occurrence as any).mois?.mois
          if (!occurrenceMonth) continue
          const { error: dateError } = await supabase
            .from('charges_fixes')
            .update({ date_prevue: plannedDateForMonth(occurrenceMonth, updates.jour_prevu) })
            .eq('id', occurrence.id)
          if (dateError) throw dateError
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['actual_flows'] })
      queryClient.invalidateQueries({ queryKey: ['balance_at_date'] })
      queryClient.invalidateQueries({ queryKey: ['actual_cash_summary'] })
    },
  })

  return { ...query, create, update }
}
