'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useCalibrateEspace() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ espaceId, soldeSaisi }: { espaceId: string; soldeSaisi: number }) => {
      // 1. Charger TOUS les mois de l'espace (sans filtre de date — y compris le mois en cours)
      const { data: moisList } = await supabase
        .from('mois')
        .select('id')
        .eq('espace_id', espaceId)

      let resteCumule = 0

      if (moisList && moisList.length > 0) {
        const moisIds = moisList.map(m => m.id)

        // 2. Charger toutes les données en parallèle (même formule que useResteM1)
        const [
          { data: revenus = [] },
          { data: charges = [] },
          { data: transactions = [] },
          { data: mouvements = [] },
        ] = await Promise.all([
          supabase.from('revenus').select('montant').in('mois_id', moisIds),
          supabase.from('charges_fixes').select('montant, payee').in('mois_id', moisIds),
          supabase.from('transactions').select('montant, remboursements(montant)').in('mois_id', moisIds),
          supabase.from('mouvements_epargne').select('type, montant').in('mois_id', moisIds),
        ])

        // 3. Calculer le reste cumulé brut (solde_initial = 0)
        const totalRevenus = (revenus || []).reduce((s: number, r: any) => s + Number(r.montant), 0)
        const totalReprises = (mouvements || [])
          .filter((m: any) => m.type === 'reprise')
          .reduce((s: number, m: any) => s + Number(m.montant), 0)
        const totalEntrants = totalRevenus + totalReprises

        const totalChargesPayees = (charges || [])
          .filter((c: any) => c.payee)
          .reduce((s: number, c: any) => s + Number(c.montant), 0)

        const totalDepenses = (transactions || []).reduce((s: number, t: any) => {
          const rembs = t.remboursements || []
          const totalRemb = rembs.reduce((sr: number, r: any) => sr + Number(r.montant), 0)
          return s + Number(t.montant) - totalRemb
        }, 0)

        const totalEpargnes = (mouvements || [])
          .filter((m: any) => m.type === 'epargne')
          .reduce((s: number, m: any) => s + Number(m.montant), 0)

        resteCumule = totalEntrants - totalChargesPayees - totalDepenses - totalEpargnes
      }

      // 4. Dériver solde_initial = solde réel saisi - reste cumulé brut
      const soldeInitial = soldeSaisi - resteCumule

      // 5. Sauvegarder
      const { error } = await supabase
        .from('espaces')
        .update({ solde_initial: soldeInitial })
        .eq('id', espaceId)

      if (error) throw error

      return { soldeInitial, resteCumule }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reste_m1'] })
    },
  })
}