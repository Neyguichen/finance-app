'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Enveloppe, MouvementEpargne, EpargneRecurrente } from '@/lib/types'

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
    mutationFn: async (env: Omit<Enveloppe, 'id'>) => {
      const { data, error } = await supabase
        .from('enveloppes')
        .insert(env)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Enveloppe> & { id: string }) => {
      const { error } = await supabase
        .from('enveloppes')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { ...query, create, update }
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
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MouvementEpargne> & { id: string }) => {
      const { error } = await supabase
        .from('mouvements_epargne')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['enveloppes'] })
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
    },
  })

  const removeDefinitif = useMutation({
    mutationFn: async ({ mouvementId, recurrentId }: { mouvementId: string; recurrentId: string }) => {
      await supabase
        .from('epargne_recurrentes')
        .update({ actif: false })
        .eq('id', recurrentId)
      await supabase.from('mouvements_epargne').delete().eq('id', mouvementId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['enveloppes'] })
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

  return { ...query, create }
}