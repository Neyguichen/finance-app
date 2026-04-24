'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ChargeFixe, ChargeFixeRecurrente } from '@/lib/types'

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const togglePayee = useMutation({
    mutationFn: async ({ id, payee }: { id: string; payee: boolean }) => {
      const { error } = await supabase
        .from('charges_fixes')
        .update({ payee })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  // Supprime l'instance mensuelle uniquement
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('charges_fixes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { ...query, create }
}
