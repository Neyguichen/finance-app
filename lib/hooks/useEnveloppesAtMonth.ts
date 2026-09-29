'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Enveloppe } from '@/lib/types'

export function useEnveloppesAtMonth(espaceId: string | undefined, month: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['enveloppes_at_month', espaceId, month],
    enabled: !!espaceId,
    queryFn: async () => {
      // Les enveloppes et la liste des mois sont indépendantes : les charger en parallèle
      // évite un aller-retour réseau inutile sur le dashboard.
      const [
        { data: enveloppes, error: envErr },
        { data: moisList, error: moisErr },
      ] = await Promise.all([
        supabase
          .from('enveloppes')
          .select('*')
          .eq('espace_id', espaceId!)
          .order('ordre'),
        supabase
          .from('mois')
          .select('id')
          .eq('espace_id', espaceId!)
          .lte('mois', month),
      ])
      if (envErr) throw envErr
      if (moisErr) throw moisErr

      const moisIds = (moisList || []).map(m => m.id)

      // Aucun mois → solde 0 partout
      if (moisIds.length === 0) {
        return (enveloppes || []).map(e => ({ ...e, solde: Number(e.solde_initial || 0) })) as Enveloppe[]
      }

      // 3. Charger tous les mouvements jusqu'à ce mois
      const { data: mouvements, error: mvtErr } = await supabase
        .from('mouvements_epargne')
        .select('*')
        .in('mois_id', moisIds)
      if (mvtErr) throw mvtErr

      // 4. Calculer le solde cumulé par enveloppe
      const soldeMap: Record<string, number> = {}
      for (const mvt of (mouvements || [])) {
        if (mvt.type === 'epargne' && mvt.enveloppe_dest_id) {
          soldeMap[mvt.enveloppe_dest_id] = (soldeMap[mvt.enveloppe_dest_id] || 0) + Number(mvt.montant)
        } else if (mvt.type === 'reprise' && mvt.enveloppe_source_id) {
          soldeMap[mvt.enveloppe_source_id] = (soldeMap[mvt.enveloppe_source_id] || 0) - Number(mvt.montant)
        } else if (mvt.type === 'transfert') {
          if (mvt.enveloppe_source_id) {
            soldeMap[mvt.enveloppe_source_id] = (soldeMap[mvt.enveloppe_source_id] || 0) - Number(mvt.montant)
          }
          if (mvt.enveloppe_dest_id) {
            soldeMap[mvt.enveloppe_dest_id] = (soldeMap[mvt.enveloppe_dest_id] || 0) + Number(mvt.montant)
          }
        }
      }

      return (enveloppes || []).map(e => ({
        ...e,
        solde: (soldeMap[e.id] || 0) + Number(e.solde_initial || 0),
      })) as Enveloppe[]
    },
  })
}