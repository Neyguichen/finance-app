'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Revenu, RevenuRecurrent } from '@/lib/types'

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  // Supprime l'instance mensuelle uniquement
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('revenus').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  // Supprime l'instance mensuelle ET désactive le modèle récurrent
  const removeDefinitif = useMutation({
    mutationFn: async ({ revenuId, recurrentId }: { revenuId: string; recurrentId: string }) => {
      // 1. Désactiver le récurrent
      await supabase
        .from('revenus_recurrents')
        .update({ actif: false })
        .eq('id', recurrentId)
      // 2. Supprimer l'instance du mois
      await supabase.from('revenus').delete().eq('id', revenuId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['revenus_recurrents'] })
    },
  })

  const toggleRecu = useMutation({
    mutationFn: async ({ id, recu }: { id: string; recu: boolean }) => {
      const { error } = await supabase
        .from('revenus')
        .update({ recu })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { ...query, create, update, remove, removeDefinitif, toggleRecu }
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { ...query, create }
}