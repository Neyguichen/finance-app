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

        if (existing) {
          const theMois = existing as Mois
        
          // Vérifier en PARALLÈLE si les récurrences ont déjà été copiées
          const [{ count: revCount }, { count: cfCount }, { count: epCount }] = await Promise.all([
            supabase
              .from('revenus')
              .select('recurrent_id', { count: 'exact', head: true })
              .eq('mois_id', theMois.id)
              .not('recurrent_id', 'is', null),
            supabase
              .from('charges_fixes')
              .select('recurrent_id', { count: 'exact', head: true })
              .eq('mois_id', theMois.id)
              .not('recurrent_id', 'is', null),
            supabase
              .from('mouvements_epargne')
              .select('recurrent_id', { count: 'exact', head: true })
              .eq('mois_id', theMois.id)
              .not('recurrent_id', 'is', null),
          ])
        
          // Si au moins une récurrence existe → déjà copié, skip rapide
          if ((revCount ?? 0) > 0 || (cfCount ?? 0) > 0 || (epCount ?? 0) > 0) {
            return theMois
          }
        
          // Charger les 3 types de récurrents en PARALLÈLE
          const moisDate = new Date(mois)
          const shouldCopy = (rec: { created_at: string; frequence_mois: number }) => {
            const created = new Date(rec.created_at)
            const diff =
              (moisDate.getFullYear() - created.getFullYear()) * 12 +
              (moisDate.getMonth() - created.getMonth())
            return diff >= 0 && diff % rec.frequence_mois === 0
          }
        
          const [{ data: revRec }, { data: cfRec }, { data: epRec }] = await Promise.all([
            supabase.from('revenus_recurrents').select('*').eq('espace_id', espace_id).eq('actif', true),
            supabase.from('charges_fixes_recurrentes').select('*').eq('espace_id', espace_id).eq('actif', true),
            supabase.from('epargne_recurrentes').select('*').eq('espace_id', espace_id).eq('actif', true),
          ])
        
          // Insérer les copies en PARALLÈLE
          const inserts: Promise<any>[] = []
        
          if (revRec && revRec.length > 0) {
            const rows = revRec.filter(shouldCopy).map((rec, i) => ({
              mois_id: theMois.id, recurrent_id: rec.id, type: rec.type,
              nom: rec.nom, montant: rec.montant, recu: false, ordre: i,
            }))
            if (rows.length > 0) inserts.push(supabase.from('revenus').insert(rows).select())
          }
        
          if (cfRec && cfRec.length > 0) {
            const rows = cfRec.filter(shouldCopy).map((rec, i) => ({
              mois_id: theMois.id, recurrent_id: rec.id,
              nom: rec.nom, montant: rec.montant, payee: false, ordre: i,
            }))
            if (rows.length > 0) inserts.push(supabase.from('charges_fixes').insert(rows).select())
          }
        
          if (epRec && epRec.length > 0) {
            const rows = epRec.filter(shouldCopy).map((rec) => ({
              mois_id: theMois.id, recurrent_id: rec.id, enveloppe_source_id: null,
              enveloppe_dest_id: rec.enveloppe_dest_id, montant: rec.montant,
              type: 'epargne' as const, date: mois, note: rec.note,
            }))
            if (rows.length > 0) inserts.push(supabase.from('mouvements_epargne').insert(rows).select())
          }
        
          if (inserts.length > 0) await Promise.all(inserts)
        
          return theMois
        }

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

      // Charger les 3 types en parallèle
      const [{ data: revRec }, { data: cfRec }, { data: epRec }] = await Promise.all([
        supabase.from('revenus_recurrents').select('*').eq('espace_id', espace_id).eq('actif', true),
        supabase.from('charges_fixes_recurrentes').select('*').eq('espace_id', espace_id).eq('actif', true),
        supabase.from('epargne_recurrentes').select('*').eq('espace_id', espace_id).eq('actif', true),
      ])

      // Insérer en parallèle
      const inserts: Promise<unknown>[] = []

      if (revRec && revRec.length > 0) {
        const rows = revRec.filter(shouldCopy).map((rec, i) => ({
          mois_id: newMois.id, recurrent_id: rec.id, type: rec.type,
          nom: rec.nom, montant: rec.montant, recu: false, ordre: i,
        }))
        if (rows.length > 0) inserts.push(supabase.from('revenus').select())
      }

      if (cfRec && cfRec.length > 0) {
        const rows = cfRec.filter(shouldCopy).map((rec, i) => ({
          mois_id: newMois.id, recurrent_id: rec.id,
          nom: rec.nom, montant: rec.montant, payee: false, ordre: i,
        }))
        if (rows.length > 0) inserts.push(supabase.from('charges_fixes').insert(rows).select())
      }

      if (epRec && epRec.length > 0) {
        const rows = epRec.filter(shouldCopy).map((rec) => ({
          mois_id: newMois.id, recurrent_id: rec.id, enveloppe_source_id: null,
          enveloppe_dest_id: rec.enveloppe_dest_id, montant: rec.montant,
          type: 'epargne' as const, date: mois, note: rec.note,
        }))
        if (rows.length > 0) inserts.push(supabase.from('mouvements_epargne').insert(rows).select())
      }

      if (inserts.length > 0) await Promise.all(inserts)

      return newMois
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { ...query, getOrCreate }
}