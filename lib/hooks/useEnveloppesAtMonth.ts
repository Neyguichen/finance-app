'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Enveloppe } from '@/lib/types'

function computeSoldeMap(mouvements: any[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const mvt of mouvements) {
    if (mvt.type === 'epargne' && mvt.enveloppe_dest_id) {
      map[mvt.enveloppe_dest_id] = (map[mvt.enveloppe_dest_id] || 0) + Number(mvt.montant)
    } else if (mvt.type === 'reprise' && mvt.enveloppe_source_id) {
      map[mvt.enveloppe_source_id] = (map[mvt.enveloppe_source_id] || 0) - Number(mvt.montant)
    } else if (mvt.type === 'transfert') {
      if (mvt.enveloppe_source_id) {
        map[mvt.enveloppe_source_id] = (map[mvt.enveloppe_source_id] || 0) - Number(mvt.montant)
      }
      if (mvt.enveloppe_dest_id) {
        map[mvt.enveloppe_dest_id] = (map[mvt.enveloppe_dest_id] || 0) + Number(mvt.montant)
      }
    }
  }
  return map
}

export function useEnveloppesAtMonth(espaceId: string | undefined, month: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['enveloppes_at_month', espaceId, month],
    enabled: !!espaceId,
    queryFn: async () => {
      // 1. Charger les enveloppes (solde en BDD = initial + tous mouvements via triggers)
      const { data: enveloppes, error: envErr } = await supabase
        .from('enveloppes')
        .select('*')
        .eq('espace_id', espaceId!)
        .order('ordre')
      if (envErr) throw envErr

      // 2. Récupérer les mois APRÈS le mois sélectionné
      const { data: futureMoisList, error: fmErr } = await supabase
        .from('mois')
        .select('id')
        .eq('espace_id', espaceId!)
        .gt('mois', month)
      if (fmErr) throw fmErr

      const futureMoisIds = (futureMoisList || []).map(m => m.id)

      // 3. Pas de mois futurs → le solde actuel en BDD = solde au mois sélectionné
      if (futureMoisIds.length === 0) {
        return (enveloppes || []) as Enveloppe[]
      }

      // 4. Charger les mouvements APRÈS le mois sélectionné
      const { data: futureMvts, error: fvErr } = await supabase
        .from('mouvements_epargne')
        .select('*')
        .in('mois_id', futureMoisIds)
      if (fvErr) throw fvErr

      // 5. solde au mois = solde actuel (BDD) - mouvements futurs
      const futureMap = computeSoldeMap(futureMvts || [])

      return (enveloppes || []).map(e => ({
        ...e,
        solde: Number(e.solde) - (futureMap[e.id] || 0),
      })) as Enveloppe[]
    },
  })
}