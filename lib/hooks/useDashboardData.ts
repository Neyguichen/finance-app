'use client'

import { useRevenus } from '@/lib/hooks/useRevenus'
import { useChargesFixes } from '@/lib/hooks/useChargesFixes'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { useMouvements } from '@/lib/hooks/useEpargne'
import { useCategories } from '@/lib/hooks/useCategories'
import { useResteM1 } from '@/lib/hooks/useResteM1'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { useYearData } from '@/lib/hooks/useYearData'
import { useAdminMoisData } from '@/lib/hooks/useAdminMoisData'
import { useApp } from '@/components/AppContext'
import { getCategoryColor, getMontantNet } from '@/lib/utils'

export function useDashboardData() {
  const { moisId, month, espace, isAdminViewing } = useApp()

  const { data: revenus = [] } = useRevenus(moisId)
  const { data: charges = [] } = useChargesFixes(moisId)
  const { data: transactions = [] } = useTransactions(moisId)
  const { data: mouvements = [] } = useMouvements(moisId)
  const { data: categories = [] } = useCategories(espace?.id)
  const { data: budgets = [] } = useBudgets(moisId)
  const { data: resteM1 } = useResteM1(espace?.id, month, espace?.solde_initial ?? 0)
  const { data: yearData } = useYearData(espace?.id, month) as { data: any }
  const { data: adminData } = useAdminMoisData(month)

  // Override en mode admin
  const rev = isAdminViewing ? (adminData?.revenus || []) : revenus
  const chg = isAdminViewing ? (adminData?.charges_fixes || []) : charges
  const txn = isAdminViewing ? (adminData?.transactions || []) : transactions
  const mvt = isAdminViewing ? (adminData?.mouvements_epargne || []) : mouvements
  const cat = isAdminViewing ? (adminData?.categories || []) : categories
  const bgt = isAdminViewing ? (adminData?.budgets || []) : budgets

  // --- Catégories parentes uniquement ---
  const parentCats = cat.filter((c: any) => !c.parent_id && c.actif !== false)

  // --- Totaux de base ---
  const totalEpargnes = mvt.filter((m: any) => m.type === 'epargne').reduce((s: number, m: any) => s + Number(m.montant), 0)
  const totalReprises = mvt.filter((m: any) => m.type === 'reprise').reduce((s: number, m: any) => s + Number(m.montant), 0)

  const totalActif = rev.filter((r: any) => r.type === 'actif').reduce((s: number, r: any) => s + Number(r.montant), 0)
  const totalPassif = rev.filter((r: any) => r.type === 'passif').reduce((s: number, r: any) => s + Number(r.montant), 0)
  const totalRevenus = totalActif + totalPassif + totalReprises

  const totalActifRecu = rev.filter((r: any) => r.type === 'actif' && r.recu).reduce((s: number, r: any) => s + Number(r.montant), 0)
  const totalPassifRecu = rev.filter((r: any) => r.type === 'passif' && r.recu).reduce((s: number, r: any) => s + Number(r.montant), 0)
  const totalRevenusRecus = totalActifRecu + totalPassifRecu + totalReprises

  const totalChargesFixes = chg.reduce((s: number, c: any) => s + Number(c.montant), 0)
  const totalChargesPayees = chg.filter((c: any) => c.payee).reduce((s: number, c: any) => s + Number(c.montant), 0)
  const chargesFixesNonPayees = totalChargesFixes - totalChargesPayees
  const totalDepenses = txn.reduce((s: number, t: any) => s + getMontantNet(t), 0)

  // Variables prévisionnelles — parents uniquement
  const totalVariablesPrevu = parentCats.reduce((sum: number, c: any) => {
    const budget = bgt.find((b: any) => b.categorie_id === c.id)
    const prevu = budget ? Number(budget.prevu) : 0
    const depense = txn.filter((t: any) => t.categorie_id === c.id).reduce((s: number, t: any) => s + getMontantNet(t), 0)
    return sum + Math.max(prevu, depense)
  }, 0)

  // Somme brute des budgets prévisionnels — parents uniquement
  const totalVariablesBudget = parentCats.reduce((sum: number, c: any) => {
    const budget = bgt.find((b: any) => b.categorie_id === c.id)
    return sum + (budget ? Number(budget.prevu) : 0)
  }, 0)

  // --- Reste M-1 ---
  const resteM1Value = resteM1 ?? 0
  const resteM1Entrant = resteM1Value > 0 ? resteM1Value : 0
  const resteM1Sortant = resteM1Value < 0 ? Math.abs(resteM1Value) : 0

  // --- Soldes ---
  const totalEntrants = resteM1Entrant + totalRevenus
  const totalSortantsAll = totalChargesFixes + totalDepenses + totalEpargnes + resteM1Sortant
  const restePrevu = resteM1Value + totalRevenus - totalChargesFixes - totalVariablesPrevu - totalEpargnes
  const resteReel = resteM1Value + totalRevenusRecus - totalChargesPayees - totalDepenses - totalEpargnes

  // --- Données mois précédent (pour comparatif répartition catégories) ---
  const prevMonthData: any = (() => {
    if (!yearData?.monthlyData) return null
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    return yearData.monthlyData[key] ?? null
  })()

  // --- Charts data ---
  const revenusChartData = [
    { name: 'Reste M-1', value: resteM1Entrant, color: '#3B82F6' },
    { name: 'Actif', value: totalActif, color: '#10B981' },
    { name: 'Passif', value: totalPassif, color: '#6EE7B7' },
    { name: 'Reprises épargne', value: totalReprises, color: '#064E3B' },
  ].filter(d => d.value > 0)

  const sortantsChartData = [
    { name: 'Fixes', value: totalChargesFixes, color: '#E11D48' },
    { name: 'Variables', value: totalDepenses, color: '#FDA4AF' },
    { name: 'Épargne', value: totalEpargnes, color: '#881337' },
    ...(resteM1Sortant > 0 ? [{ name: 'Déficit M-1', value: resteM1Sortant, color: '#7C3AED' }] : []),
  ].filter(d => d.value > 0)

  // --- Catégories stats (parents uniquement + sous-catégories) ---
  const catStats = [...parentCats]
    .sort((a: any, b: any) => a.nom.localeCompare(b.nom))
    .map((c: any) => {
      const budget = bgt.find((b: any) => b.categorie_id === c.id)
      const prevu = budget ? Number(budget.prevu) : 0
      const depense = txn.filter((t: any) => t.categorie_id === c.id).reduce((s: number, t: any) => s + getMontantNet(t), 0)

      // Sous-catégories avec dépenses
      const subCats = cat
        .filter((sc: any) => sc.parent_id === c.id && sc.actif !== false)
        .map((sc: any) => {
          const subDep = txn
            .filter((t: any) => t.sous_categorie_id === sc.id)
            .reduce((s: number, t: any) => s + getMontantNet(t), 0)
          return { id: sc.id, nom: sc.nom, icone: sc.icone, depense: subDep }
        })
        .filter((s: any) => s.depense > 0)
        .sort((a: any, b: any) => b.depense - a.depense)

      // Montant sans sous-catégorie (dépenses parentes directes)
      const depenseSansSousCat = txn
        .filter((t: any) => t.categorie_id === c.id && !t.sous_categorie_id)
        .reduce((s: number, t: any) => s + getMontantNet(t), 0)

      return {
        id: c.id, nom: c.nom, icone: c.icone, couleur: c.couleur,
        prevu, depense, reste: prevu - depense,
        subCats, depenseSansSousCat,
      }
    })

  const catStatsMonth = catStats.filter(c => c.prevu > 0 || c.depense > 0)

  const repartitionChartData = [
    ...(totalChargesFixes > 0 ? [{ name: 'Charges fixes', value: totalChargesFixes, color: '#E11D48', icon: '📌' }] : []),
    ...(totalEpargnes > 0 ? [{ name: 'Épargne', value: totalEpargnes, color: '#881337', icon: '🐷' }] : []),
    ...catStatsMonth.map((c, i) => ({ name: c.nom, value: c.depense, color: getCategoryColor(i), icon: c.icone || '📂' })).filter(d => d.value > 0),
  ]

  // --- Top 3 sous-catégories (classement indépendant) ---
  const allSubCatStats = cat
    .filter((c: any) => c.parent_id && c.actif !== false)
    .map((sc: any) => {
      const parentCat = cat.find((c: any) => c.id === sc.parent_id)
      const depense = txn
        .filter((t: any) => t.sous_categorie_id === sc.id)
        .reduce((s: number, t: any) => s + getMontantNet(t), 0)
      return {
        id: sc.id, nom: sc.nom, icone: sc.icone,
        parentNom: parentCat?.nom || '', parentIcone: parentCat?.icone || '📂',
        depense,
      }
    })
    .filter((s: any) => s.depense > 0)

  const top3SubCategories = [...allSubCatStats]
    .sort((a, b) => b.depense - a.depense)
    .slice(0, 3)

  // --- Indicateurs ---
  const top3Depenses = [...txn].sort((a: any, b: any) => getMontantNet(b) - getMontantNet(a)).slice(0, 3)
  const top3Categories = [...catStats].filter(c => c.depense > 0).sort((a, b) => b.depense - a.depense).slice(0, 3)
  const tauxMaitrise = totalVariablesBudget > 0 ? Math.round((totalDepenses / totalVariablesBudget) * 100) : null
  const ratioChargesRevenus = totalActif > 0 ? Math.round((totalChargesFixes / totalActif) * 100) : null
  const objectifEpargne = (totalActif + totalPassif + resteM1Value - totalChargesFixes) * 0.20
  const capaciteEpargne = objectifEpargne > 0 ? Math.round((totalEpargnes / objectifEpargne) * 100) : null

  return {
    // Soldes
    restePrevu, resteReel, totalEntrants, totalSortantsAll,
    // Détails
    totalChargesFixes, totalChargesPayees, chargesFixesNonPayees,
    totalDepenses, totalVariablesBudget, totalEpargnes, resteM1Sortant,
    // Indicateurs
    ratioChargesRevenus, tauxMaitrise, objectifEpargne, capaciteEpargne,
    // Charts
    revenusChartData, sortantsChartData, repartitionChartData,
    // Catégories
    catStats, catStatsMonth, prevMonthData,
    // Top 3
    top3Depenses, top3Categories, top3SubCategories,
  }
}