'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useYearData(espaceId: string | undefined, currentMonth: string) {
  const supabase = createClient()
  const year = currentMonth.slice(0, 4)

  const [y, m] = currentMonth.split('-').map(Number)
  const prevDate = new Date(y, m - 2, 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-01`

  return useQuery({
    queryKey: ['year_data', espaceId, year],
    enabled: !!espaceId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: moisList, error: moisError } = await supabase
        .from('mois')
        .select('id, mois')
        .eq('espace_id', espaceId!)
        .gte('mois', `${year}-01-01`)
        .lte('mois', `${year}-12-31`)

      if (moisError) throw moisError
      if (!moisList || moisList.length === 0) return null

      const moisIds = moisList.map(mois => mois.id)
      const moisMap = new Map(moisList.map(mois => [mois.id, mois.mois]))
      const monthByPrefix = new Map(moisList.map(mois => [String(mois.mois).slice(0, 7), mois.mois]))

      const [revResult, charResult, txResult, mvtResult, debtResult, budgetResult] = await Promise.all([
        supabase.from('revenus').select('montant, type, recu, mois_id').in('mois_id', moisIds),
        supabase.from('charges_fixes').select('montant, montant_reel, payee, categorie_id, sous_categorie_id, mois_id').in('mois_id', moisIds),
        supabase.from('transactions').select('id, montant, categorie_id, sous_categorie_id, mois_id, is_split, parent_transaction_id, remboursements(montant)').in('mois_id', moisIds),
        supabase.from('mouvements_epargne').select('type, montant, mois_id').in('mois_id', moisIds),
        supabase.from('dettes').select('type, remboursements_dette(montant, date, impacte_budget)').eq('espace_id', espaceId!),
        supabase.from('budgets').select('prevu, categorie_id, mois_id, categorie:categories(parent_id)').in('mois_id', moisIds),
      ])

      if (revResult.error) throw revResult.error
      if (charResult.error) throw charResult.error
      if (txResult.error) throw txResult.error
      if (mvtResult.error) throw mvtResult.error
      if (debtResult.error) throw debtResult.error
      if (budgetResult.error) throw budgetResult.error

      const revenus = revResult.data || []
      const charges = charResult.data || []
      const transactions = txResult.data || []
      const mouvements = mvtResult.data || []
      const dettes = debtResult.data || []
      const budgets = budgetResult.data || []

      type MonthData = {
        revenus: number
        revenusRecus: number
        charges: number
        chargesReelles: number
        depenses: number
        epargne: number
        reprises: number
        remboursementsDette: number
        remboursementsCreance: number
        budgets: number
        catDepenses: Record<string, number>
        catPrevues: Record<string, number>
        subCatDepenses: Record<string, number>
        subCatPrevues: Record<string, number>
      }

      const monthlyData: Record<string, MonthData> = {}
      for (const mois of moisList) {
        monthlyData[mois.mois] = {
          revenus: 0,
          revenusRecus: 0,
          charges: 0,
          chargesReelles: 0,
          depenses: 0,
          epargne: 0,
          reprises: 0,
          remboursementsDette: 0,
          remboursementsCreance: 0,
          budgets: 0,
          catDepenses: {},
          catPrevues: {},
          subCatDepenses: {},
          subCatPrevues: {},
        }
      }

      for (const revenu of revenus) {
        const mois = moisMap.get(revenu.mois_id)
        if (mois && monthlyData[mois]) {
          monthlyData[mois].revenus += Number(revenu.montant)
          if (revenu.recu) monthlyData[mois].revenusRecus += Number(revenu.montant)
        }
      }

      for (const charge of charges) {
        const mois = moisMap.get(charge.mois_id)
        if (mois && monthlyData[mois]) {
          monthlyData[mois].charges += Number(charge.montant)
          if (charge.categorie_id) {
            monthlyData[mois].catPrevues[charge.categorie_id] =
              (monthlyData[mois].catPrevues[charge.categorie_id] || 0) + Number(charge.montant)
          }
          if (charge.sous_categorie_id) {
            monthlyData[mois].subCatPrevues[charge.sous_categorie_id] =
              (monthlyData[mois].subCatPrevues[charge.sous_categorie_id] || 0) + Number(charge.montant)
          }
          if (charge.payee) {
            const actual = Number(charge.montant_reel ?? charge.montant)
            monthlyData[mois].chargesReelles += actual
            if (charge.categorie_id) {
              monthlyData[mois].catDepenses[charge.categorie_id] =
                (monthlyData[mois].catDepenses[charge.categorie_id] || 0) + actual
            }
            if (charge.sous_categorie_id) {
              monthlyData[mois].subCatDepenses[charge.sous_categorie_id] =
                (monthlyData[mois].subCatDepenses[charge.sous_categorie_id] || 0) + actual
            }
          }
        }
      }

      // Split parents are cash containers. Children carry the analytical allocation,
      // so category statistics use children and ordinary non-split transactions only.
      for (const transaction of transactions as any[]) {
        if (transaction.is_split && !transaction.parent_transaction_id) continue
        const mois = moisMap.get(transaction.mois_id)
        if (!mois || !monthlyData[mois]) continue

        const remboursements = transaction.remboursements || []
        const totalRembourse = remboursements.reduce(
          (total: number, remboursement: any) => total + Number(remboursement.montant),
          0,
        )
        const net = Number(transaction.montant) - totalRembourse
        monthlyData[mois].depenses += net
        if (transaction.categorie_id) {
          monthlyData[mois].catDepenses[transaction.categorie_id] =
            (monthlyData[mois].catDepenses[transaction.categorie_id] || 0) + net
        }
        if (transaction.sous_categorie_id) {
          monthlyData[mois].subCatDepenses[transaction.sous_categorie_id] =
            (monthlyData[mois].subCatDepenses[transaction.sous_categorie_id] || 0) + net
        }
      }

      for (const budget of budgets) {
        const mois = moisMap.get(budget.mois_id)
        if (mois && monthlyData[mois]) {
          const planned = Number(budget.prevu || 0)
          monthlyData[mois].budgets += planned
          if (budget.categorie_id) {
            const budgetCategory = (budget as any).categorie
            if (budgetCategory?.parent_id) {
              monthlyData[mois].catPrevues[budgetCategory.parent_id] =
                (monthlyData[mois].catPrevues[budgetCategory.parent_id] || 0) + planned
              monthlyData[mois].subCatPrevues[budget.categorie_id] =
                (monthlyData[mois].subCatPrevues[budget.categorie_id] || 0) + planned
            } else {
              monthlyData[mois].catPrevues[budget.categorie_id] =
                (monthlyData[mois].catPrevues[budget.categorie_id] || 0) + planned
            }
          }
        }
      }

      for (const mouvement of mouvements) {
        const mois = moisMap.get(mouvement.mois_id)
        if (mois && monthlyData[mois]) {
          if (mouvement.type === 'epargne') monthlyData[mois].epargne += Number(mouvement.montant)
          if (mouvement.type === 'reprise') monthlyData[mois].reprises += Number(mouvement.montant)
        }
      }

      for (const dette of dettes as any[]) {
        const remboursements = Array.isArray(dette.remboursements_dette)
          ? dette.remboursements_dette
          : dette.remboursements_dette
            ? [dette.remboursements_dette]
            : []

        for (const remboursement of remboursements) {
          if (!remboursement.impacte_budget || !remboursement.date) continue
          const mois = monthByPrefix.get(String(remboursement.date).slice(0, 7))
          if (!mois || !monthlyData[mois]) continue
          if (dette.type === 'je_dois') {
            monthlyData[mois].remboursementsDette += Number(remboursement.montant)
          } else {
            monthlyData[mois].remboursementsCreance += Number(remboursement.montant)
          }
        }
      }

      const months = Object.keys(monthlyData).sort()
      const nbMonths = months.length
      const total = (field: keyof Omit<MonthData, 'catDepenses' | 'catPrevues' | 'subCatDepenses' | 'subCatPrevues'>) =>
        months.reduce((sum, month) => sum + Number(monthlyData[month][field]), 0)

      const annualTotals = {
        revenus: total('revenus'),
        revenusRecus: total('revenusRecus'),
        charges: total('charges'),
        chargesReelles: total('chargesReelles'),
        depenses: total('depenses'),
        epargne: total('epargne'),
        reprises: total('reprises'),
        remboursementsDette: total('remboursementsDette'),
        remboursementsCreance: total('remboursementsCreance'),
        budgets: total('budgets'),
      }

      const depensesReelles = annualTotals.chargesReelles + annualTotals.depenses + annualTotals.remboursementsDette
      const entreesTresorerie = annualTotals.revenusRecus + annualTotals.reprises + annualTotals.remboursementsCreance
      const epargneNette = annualTotals.epargne - annualTotals.reprises
      const mouvementNet = entreesTresorerie - depensesReelles - annualTotals.epargne
      const tauxEpargne = annualTotals.revenusRecus > 0
        ? Math.round((epargneNette / annualTotals.revenusRecus) * 100)
        : 0

      const nbMonthsCharges = months.filter(month => monthlyData[month].chargesReelles > 0).length
      const nbMonthsEpargne = months.filter(month => monthlyData[month].epargne > 0 || monthlyData[month].reprises > 0).length
      const nbActiveMonths = months.filter(month => {
        const data = monthlyData[month]
        return data.revenusRecus > 0
          || data.chargesReelles > 0
          || data.depenses > 0
          || data.epargne > 0
          || data.reprises > 0
          || data.remboursementsDette > 0
          || data.remboursementsCreance > 0
      }).length

      let moisMaxDepense = { mois: '', total: 0 }
      let moisMinDepense = { mois: '', total: Infinity }
      for (const month of months) {
        const data = monthlyData[month]
        const sortantsReels = data.chargesReelles + data.depenses + data.epargne + data.remboursementsDette
        if (sortantsReels > moisMaxDepense.total) moisMaxDepense = { mois: month, total: sortantsReels }
        if (sortantsReels > 0 && sortantsReels < moisMinDepense.total) moisMinDepense = { mois: month, total: sortantsReels }
      }
      if (moisMinDepense.total === Infinity) moisMinDepense = { mois: '', total: 0 }

      const allCatIds = new Set<string>()
      const allSubCatIds = new Set<string>()
      for (const data of Object.values(monthlyData)) {
        for (const categoryId of Object.keys(data.catDepenses)) allCatIds.add(categoryId)
        for (const categoryId of Object.keys(data.catPrevues)) allCatIds.add(categoryId)
        for (const subCategoryId of Object.keys(data.subCatDepenses)) allSubCatIds.add(subCategoryId)
      }

      const catAnnualStats: Record<string, {
        total: number
        planned: number
        avg: number
        min: number
        max: number
        nbMois: number
      }> = {}

      for (const categoryId of Array.from(allCatIds)) {
        const values = months.map(month => monthlyData[month]?.catDepenses[categoryId] || 0)
        const nonZero = values.filter(value => value > 0)
        const categoryTotal = values.reduce((sum, value) => sum + value, 0)
        const planned = months.reduce((sum, month) => sum + (monthlyData[month]?.catPrevues[categoryId] || 0), 0)
        catAnnualStats[categoryId] = {
          total: categoryTotal,
          planned,
          avg: nonZero.length > 0 ? Math.round((categoryTotal / nonZero.length) * 100) / 100 : 0,
          min: nonZero.length > 0 ? Math.min(...nonZero) : 0,
          max: nonZero.length > 0 ? Math.max(...nonZero) : 0,
          nbMois: nonZero.length,
        }
      }

      const subCatAnnualStats: Record<string, { total: number; planned: number }> = {}
      for (const data of Object.values(monthlyData)) {
        for (const subCategoryId of Object.keys(data.subCatPrevues)) allSubCatIds.add(subCategoryId)
      }
      for (const subCategoryId of Array.from(allSubCatIds)) {
        subCatAnnualStats[subCategoryId] = {
          total: months.reduce(
            (sum, month) => sum + (monthlyData[month]?.subCatDepenses[subCategoryId] || 0),
            0,
          ),
          planned: months.reduce(
            (sum, month) => sum + (monthlyData[month]?.subCatPrevues[subCategoryId] || 0),
            0,
          ),
        }
      }

      return {
        monthlyData,
        annualTotals,
        depensesReelles,
        entreesTresorerie,
        epargneNette,
        mouvementNet,
        tauxEpargne,
        moisMaxDepense,
        moisMinDepense,
        catAnnualStats,
        subCatAnnualStats,
        prevMonth: monthlyData[prevMonth] || null,
        prevMonthKey: prevMonth,
        nbMonths,
        nbActiveMonths,
        nbMonthsCharges,
        nbMonthsEpargne,
      }
    },
  })
}
