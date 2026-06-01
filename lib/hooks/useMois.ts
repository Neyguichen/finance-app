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

        // Insérer les copies séquentiellement (await direct, pas de problème TS)
        if (revRec && revRec.length > 0) {
          const rows = revRec.filter(shouldCopy).map((rec, i) => ({
            mois_id: theMois.id, recurrent_id: rec.id, type: rec.type,
            nom: rec.nom, montant: rec.montant, recu: false, ordre: i,
          }))
          if (rows.length > 0) await supabase.from('revenus').insert(rows)
        }

        if (cfRec && cfRec.length > 0) {
          const rows = cfRec.filter(shouldCopy).map((rec, i) => ({
            mois_id: theMois.id, recurrent_id: rec.id,
            nom: rec.nom, montant: rec.montant, payee: false, ordre: i,
          }))
          if (rows.length > 0) await supabase.from('charges_fixes').insert(rows)
        }

        if (epRec && epRec.length > 0) {
          const rows = epRec.filter(shouldCopy).map((rec) => ({
            mois_id: theMois.id, recurrent_id: rec.id, enveloppe_source_id: null,
            enveloppe_dest_id: rec.enveloppe_dest_id, montant: rec.montant,
            type: 'epargne' as const, date: mois, note: rec.note,
          }))
          if (rows.length > 0) await supabase.from('mouvements_epargne').insert(rows)
        }

        // Copier les budgets du mois précédent si absents
        const { count: budgetCount } = await supabase
          .from('budgets')
          .select('id', { count: 'exact', head: true })
          .eq('mois_id', theMois.id)
        if ((budgetCount ?? 0) === 0) {
          const [yr, mo] = mois.split('-').map(Number)
          const pMo = mo === 1 ? 12 : mo - 1
          const pYr = mo === 1 ? yr - 1 : yr
          const prevMoisStr = `${pYr}-${String(pMo).padStart(2, '0')}`
          const { data: prevMoisRec } = await supabase
            .from('mois').select('id').eq('espace_id', espace_id).eq('mois', prevMoisStr).single()
          if (prevMoisRec) {
            const { data: prevBudgets } = await supabase
              .from('budgets').select('categorie_id, prevu').eq('mois_id', prevMoisRec.id)
            if (prevBudgets && prevBudgets.length > 0) {
              await supabase.from('budgets').insert(
                prevBudgets.map(b => ({ mois_id: theMois.id, categorie_id: b.categorie_id, prevu: b.prevu }))
              )
            }
          }
        }

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

      // Insérer séquentiellement
      if (revRec && revRec.length > 0) {
        const rows = revRec.filter(shouldCopy).map((rec, i) => ({
          mois_id: newMois.id, recurrent_id: rec.id, type: rec.type,
          nom: rec.nom, montant: rec.montant, recu: false, ordre: i,
        }))
        if (rows.length > 0) await supabase.from('revenus').insert(rows)
      }

      if (cfRec && cfRec.length > 0) {
        const rows = cfRec.filter(shouldCopy).map((rec, i) => ({
          mois_id: newMois.id, recurrent_id: rec.id,
          nom: rec.nom, montant: rec.montant, payee: false, ordre: i,
        }))
        if (rows.length > 0) await supabase.from('charges_fixes').insert(rows)
      }

      if (epRec && epRec.length > 0) {
        const rows = epRec.filter(shouldCopy).map((rec) => ({
          mois_id: newMois.id, recurrent_id: rec.id, enveloppe_source_id: null,
          enveloppe_dest_id: rec.enveloppe_dest_id, montant: rec.montant,
          type: 'epargne' as const, date: mois, note: rec.note,
        }))
        if (rows.length > 0) await supabase.from('mouvements_epargne').insert(rows)
      }

      // Copier les budgets du mois précédent si absents
      const { count: newBudgetCount } = await supabase
        .from('budgets')
        .select('id', { count: 'exact', head: true })
        .eq('mois_id', newMois.id)
      if ((newBudgetCount ?? 0) === 0) {
        const [yr2, mo2] = mois.split('-').map(Number)
        const pMo2 = mo2 === 1 ? 12 : mo2 - 1
        const pYr2 = mo2 === 1 ? yr2 - 1 : yr2
        const prevMoisStr2 = `${pYr2}-${String(pMo2).padStart(2, '0')}`
        const { data: prevMoisRec2 } = await supabase
          .from('mois').select('id').eq('espace_id', espace_id).eq('mois', prevMoisStr2).single()
        if (prevMoisRec2) {
          const { data: prevBudgets2 } = await supabase
            .from('budgets').select('categorie_id, prevu').eq('mois_id', prevMoisRec2.id)
          if (prevBudgets2 && prevBudgets2.length > 0) {
            await supabase.from('budgets').insert(
              prevBudgets2.map(b => ({ mois_id: newMois.id, categorie_id: b.categorie_id, prevu: b.prevu }))
            )
          }
        }
      }

      return newMois
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })

  return { ...query, getOrCreate }
}