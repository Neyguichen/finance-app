'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useYearData(espaceId: string | undefined, currentMonth: string) {
  const supabase = createClient()
  const year = currentMonth.slice(0, 4)

  // Calcul du mois précédent
  const [y, m] = currentMonth.split('-').map(Number)
  const prevDate = new Date(y, m - 2, 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  return useQuery({
    queryKey: ['year_data', espaceId, year],
    enabled: !!espaceId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // 1. Tous les mois de l'année
      const { data: moisList } = await supabase
        .from('mois')
        .select('id, mois')
        .eq('espace_id', espaceId!)
        .gte('mois', `${year}-01`)
        .lte('mois', `${year}-12`)

      if (!moisList || moisList.length === 0) return null

      const moisIds = moisList.map(m => m.id)
      const moisMap = new Map(moisList.map(m => [m.id, m.mois]))

      // 2. Charger toutes les données en parallèle
      const [revResult, charResult, txResult, mvtResult] = await Promise.all([
        supabase.from('revenus').select('montant, type, mois_id').in('mois_id', moisIds),
        supabase.from('charges_fixes').select('montant, payee, mois_id').in('mois_id', moisIds),
        supabase.from('transactions').select('montant, categorie_id, mois_id, remboursements(montant)').in('mois_id', moisIds),
        supabase.from('mouvements_epargne').select('type, montant, mois_id').in('mois_id', moisIds),
      ])
      const revenus = revResult.data || []
      const charges = charResult.data || []
      const transactions = txResult.data || []
      const mouvements = mvtResult.data || []

      // 3. Agréger par mois
      type MonthData = {
        revenus: number; charges: number; depenses: number
        epargne: number; reprises: number
        catDepenses: Record<string, number>
      }
      const monthlyData: Record<string, MonthData> = {}

      for (const m of moisList) {
        monthlyData[m.mois] = { revenus: 0, charges: 0, depenses: 0, epargne: 0, reprises: 0, catDepenses: {} }
      }

      for (const r of revenus) {
        const mois = moisMap.get(r.mois_id)
        if (mois && monthlyData[mois]) monthlyData[mois].revenus += Number(r.montant)
      }

      for (const c of charges) {
        const mois = moisMap.get(c.mois_id)
        if (mois && monthlyData[mois]) monthlyData[mois].charges += Number(c.montant)
      }

      for (const t of transactions as any[]) {
        const mois = moisMap.get(t.mois_id)
        if (mois && monthlyData[mois]) {
          const rembs = t.remboursements || []
          const totalRemb = rembs.reduce((s: number, r: any) => s + Number(r.montant), 0)
          const net = Number(t.montant) - totalRemb
          monthlyData[mois].depenses += net
          if (t.categorie_id) {
            monthlyData[mois].catDepenses[t.categorie_id] =
              (monthlyData[mois].catDepenses[t.categorie_id] || 0) + net
          }
        }
      }

      for (const mv of mouvements) {
        const mois = moisMap.get(mv.mois_id)
        if (mois && monthlyData[mois]) {
          if (mv.type === 'epargne') monthlyData[mois].epargne += Number(mv.montant)
          else if (mv.type === 'reprise') monthlyData[mois].reprises += Number(mv.montant)
        }
      }

      // 4. Stats annuelles
      const months = Object.keys(monthlyData).sort()
      const nbMonths = months.length

      const annualTotals = {
        revenus: months.reduce((s, m) => s + monthlyData[m].revenus, 0),
        charges: months.reduce((s, m) => s + monthlyData[m].charges, 0),
        depenses: months.reduce((s, m) => s + monthlyData[m].depenses, 0),
        epargne: months.reduce((s, m) => s + monthlyData[m].epargne, 0),
      }

      const totalSortants = annualTotals.charges + annualTotals.depenses + annualTotals.epargne
      const tauxEpargne = annualTotals.revenus > 0
        ? Math.round(((annualTotals.revenus - totalSortants) / annualTotals.revenus) * 100)
        : 0

      // Mois le plus dépensier / économe (sortants totaux par mois)
      let moisMaxDepense = { mois: '', total: 0 }
      let moisMinDepense = { mois: '', total: Infinity }
      for (const m of months) {
        const md = monthlyData[m]
        const totalSort = md.charges + md.depenses + md.epargne
        if (totalSort > moisMaxDepense.total) moisMaxDepense = { mois: m, total: totalSort }
        if (totalSort < moisMinDepense.total) moisMinDepense = { mois: m, total: totalSort }
      }
      if (moisMinDepense.total === Infinity) moisMinDepense = { mois: '', total: 0 }

      // 5. Stats par catégorie annuelles
      const allCatIds = new Set<string>()
      for (const md of Object.values(monthlyData)) {
        for (const catId of Object.keys(md.catDepenses)) allCatIds.add(catId)
      }

      const catAnnualStats: Record<string, {
        total: number; avg: number; min: number; max: number
      }> = {}

      for (const catId of allCatIds) {
        const values = months.map(m => monthlyData[m]?.catDepenses[catId] || 0)
        const nonZero = values.filter(v => v > 0)
        const total = values.reduce((s, v) => s + v, 0)
        catAnnualStats[catId] = {
          total,
          avg: nbMonths > 0 ? Math.round((total / nbMonths) * 100) / 100 : 0,
          min: nonZero.length > 0 ? Math.min(...nonZero) : 0,
          max: nonZero.length > 0 ? Math.max(...nonZero) : 0,
        }
      }

      // 6. Données mois précédent
      const prevData = monthlyData[prevMonth] || null

      return {
        monthlyData,
        annualTotals,
        tauxEpargne,
        moisMaxDepense,
        moisMinDepense,
        catAnnualStats,
        prevMonth: prevData,
        prevMonthKey: prevMonth,
        nbMonths,
      }
    },
  })
}