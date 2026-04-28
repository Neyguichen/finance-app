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

      let theMois: Mois

      if (existing) {
        theMois = existing as Mois

        // Vérifier si les récurrences ont déjà été copiées
        const { count: revCount } = await supabase
          .from('revenus')
          .select('*', { count: 'exact', head: true })
          .eq('mois_id', theMois.id)

        const { count: cfCount } = await supabase
          .from('charges_fixes')
          .select('*', { count: 'exact', head: true })
          .eq('mois_id', theMois.id)

        const { count: epCount } = await supabase
          .from('mouvements_epargne')
          .select('*', { count: 'exact', head: true })
          .eq('mois_id', theMois.id)

        // Si le mois a déjà des données, on ne recopie pas
        if ((revCount ?? 0) > 0 || (cfCount ?? 0) > 0 || (epCount ?? 0) > 0) {
          return theMois
        }
      } else {
        // 2. Créer le mois
        const { data, error } = await supabase
          .from('mois')
          .insert({ espace_id, mois, user_id })
          .select()
          .single()
        if (error) throw error
        theMois = data as Mois
      }

      // 3. Copier les récurrences
      const moisDate = new Date(mois + 'T00:00:00')
      const shouldCopy = (rec: { created_at: string; frequence_mois: number }) => {
        const created = new Date(rec.created_at)
        const diff =
          (moisDate.getFullYear() - created.getFullYear()) * 12 +
          (moisDate.getMonth() - created.getMonth())
        return diff % rec.frequence_mois === 0
      }

      // 3a. Auto-copier les revenus récurrents actifs
      const { data: revRec } = await supabase
        .from('revenus_recurrents')
        .select('*')
        .eq('espace_id', espace_id)
        .eq('actif', true)

      if (revRec && revRec.length > 0) {
        const toCopy = revRec.filter(shouldCopy)
        if (toCopy.length > 0) {
          const { data: prevInstances } = await supabase
            .from('revenus')
            .select('recurrent_id, montant, nom, type, created_at')
            .in('recurrent_id', toCopy.map(r => r.id))
            .order('created_at', { ascending: false })

          const latestMap = new Map<string, { montant: number; nom: string; type: string }>()
          for (const inst of (prevInstances || [])) {
            if (inst.recurrent_id && !latestMap.has(inst.recurrent_id)) {
              latestMap.set(inst.recurrent_id, inst)
            }
          }

          const rows = toCopy.map((rec, i) => {
            const latest = latestMap.get(rec.id)
            return {
              mois_id: theMois.id,
              recurrent_id: rec.id,
              type: latest?.type ?? rec.type,
              nom: latest?.nom ?? rec.nom,
              montant: latest?.montant ?? rec.montant,
              recu: false,
              ordre: i,
            }
          })
          await supabase.from('revenus').insert(rows)
        }
      }

      // 3b. Auto-copier les charges fixes récurrentes actives
      const { data: cfRec } = await supabase
        .from('charges_fixes_recurrentes')
        .select('*')
        .eq('espace_id', espace_id)
        .eq('actif', true)

      if (cfRec && cfRec.length > 0) {
        const toCopy = cfRec.filter(shouldCopy)
        if (toCopy.length > 0) {
          const { data: prevInstances } = await supabase
            .from('charges_fixes')
            .select('recurrent_id, montant, nom, created_at')
            .in('recurrent_id', toCopy.map(r => r.id))
            .order('created_at', { ascending: false })

          const latestMap = new Map<string, { montant: number; nom: string }>()
          for (const inst of (prevInstances || [])) {
            if (inst.recurrent_id && !latestMap.has(inst.recurrent_id)) {
              latestMap.set(inst.recurrent_id, inst)
            }
          }

          const rows = toCopy.map((rec, i) => {
            const latest = latestMap.get(rec.id)
            return {
              mois_id: theMois.id,
              recurrent_id: rec.id,
              nom: latest?.nom ?? rec.nom,
              montant: latest?.montant ?? rec.montant,
              payee: false,
              ordre: i,
            }
          })
          await supabase.from('charges_fixes').insert(rows)
        }
      }

      // 3c. Auto-copier les versements épargne récurrents actifs
      const { data: epRec } = await supabase
        .from('epargne_recurrentes')
        .select('*')
        .eq('espace_id', espace_id)
        .eq('actif', true)

      if (epRec && epRec.length > 0) {
        const toCopy = epRec.filter(shouldCopy)
        if (toCopy.length > 0) {
          const { data: prevInstances } = await supabase
            .from('mouvements_epargne')
            .select('recurrent_id, montant, note, created_at')
            .in('recurrent_id', toCopy.map(r => r.id))
            .order('created_at', { ascending: false })

          const latestMap = new Map<string, { montant: number; note: string | null }>()
          for (const inst of (prevInstances || [])) {
            if (inst.recurrent_id && !latestMap.has(inst.recurrent_id)) {
              latestMap.set(inst.recurrent_id, inst)
            }
          }

          const rows = toCopy.map((rec) => {
            const latest = latestMap.get(rec.id)
            return {
              mois_id: theMois.id,
              recurrent_id: rec.id,
              enveloppe_source_id: null,
              enveloppe_dest_id: rec.enveloppe_dest_id,
              montant: latest?.montant ?? rec.montant,
              type: 'epargne' as const,
              date: mois,
              note: latest?.note ?? rec.note,
            }
          })
          await supabase.from('mouvements_epargne').insert(rows)
        }
      }

      // 3d. Auto-copier les budgets du mois précédent
      const prevMoisDate = new Date(moisDate)
      prevMoisDate.setMonth(prevMoisDate.getMonth() - 1)
      const prevMoisStr = prevMoisDate.toISOString().slice(0, 10)

      const { data: prevMois } = await supabase
        .from('mois')
        .select('id')
        .eq('espace_id', espace_id)
        .eq('mois', prevMoisStr)
        .single()

      if (prevMois) {
        const { data: prevBudgets } = await supabase
          .from('budgets')
          .select('*')
          .eq('mois_id', prevMois.id)

        if (prevBudgets && prevBudgets.length > 0) {
          // Vérifier qu'il n'y a pas déjà des budgets pour ce mois
          const { count } = await supabase
            .from('budgets')
            .select('*', { count: 'exact', head: true })
            .eq('mois_id', theMois.id)

          if (!count || count === 0) {
            const rows = prevBudgets.map(b => ({
              mois_id: theMois.id,
              categorie_id: b.categorie_id,
              prevu: b.prevu,
            }))
            await supabase.from('budgets').insert(rows)
          }
        }
      }

      return theMois
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { ...query, getOrCreate }
}