'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Mois } from '@/lib/types'

export function useMois(espaceId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const key = ['mois', espaceId]

  const query = useQuery({
    queryKey: key,
    enabled: !!espaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mois')
        .select('*')
        .eq('espace_id', espaceId!)
        .order('mois', { ascending: false })
      if (error) throw error
      return data as Mois[]
    },
  })

  const getOrCreate = useMutation({
    mutationFn: async ({ espace_id, mois, user_id }: { espace_id: string; mois: string; user_id: string }) => {
      // 1. Vérifier si le mois existe déjà
      const { data: existing } = await supabase
        .from('mois')
        .select('*')
        .eq('espace_id', espace_id)
        .eq('mois', mois)
        .single()

      if (existing) return existing as Mois

      // 2. Créer le mois
      const { data, error } = await supabase
        .from('mois')
        .insert({ espace_id, mois, user_id })
        .select()
        .single()
      if (error) throw error
      const newMois = data as Mois

      const moisDate = new Date(mois)
      const shouldCopy = (rec: { created_at: string; frequence_mois: number }) => {
        const created = new Date(rec.created_at)
        const diff =
          (moisDate.getFullYear() - created.getFullYear()) * 12 +
          (moisDate.getMonth() - created.getMonth())
        return diff >= 0 && diff % rec.frequence_mois === 0
      }

      // 3a. Auto-copier les revenus récurrents actifs
      const { data: revRec } = await supabase
        .from('revenus_recurrents')
        .select('*')
        .eq('espace_id', espace_id)
        .eq('actif', true)

      if (revRec && revRec.length > 0) {
        const rows = revRec.filter(shouldCopy).map((rec, i) => ({
          mois_id: newMois.id,
          recurrent_id: rec.id,
          type: rec.type,
          nom: rec.nom,
          montant: rec.montant,
          recu: false,
          ordre: i,
        }))
        if (rows.length > 0) await supabase.from('revenus').insert(rows)
      }

      // 3b. Auto-copier les charges fixes récurrentes actives
      const { data: cfRec } = await supabase
        .from('charges_fixes_recurrentes')
        .select('*')
        .eq('espace_id', espace_id)
        .eq('actif', true)

      if (cfRec && cfRec.length > 0) {
        const rows = cfRec.filter(shouldCopy).map((rec, i) => ({
          mois_id: newMois.id,
          recurrent_id: rec.id,
          nom: rec.nom,
          montant: rec.montant,
          payee: false,
          ordre: i,
        }))
        if (rows.length > 0) await supabase.from('charges_fixes').insert(rows)
      }

      // 3c. Auto-copier les versements épargne récurrents actifs (optionnel)
      const { data: epRec } = await supabase
        .from('epargne_recurrentes')
        .select('*')
        .eq('espace_id', espace_id)
        .eq('actif', true)

      if (epRec && epRec.length > 0) {
        const rows = epRec.filter(shouldCopy).map((rec) => ({
          mois_id: newMois.id,
          recurrent_id: rec.id,
          enveloppe_source_id: null,
          enveloppe_dest_id: rec.enveloppe_dest_id,
          montant: rec.montant,
          type: 'alimentation' as const,
          date: mois,
          note: rec.note,
        }))
        if (rows.length > 0) await supabase.from('mouvements_epargne').insert(rows)
      }

      return newMois
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { ...query, getOrCreate }
}