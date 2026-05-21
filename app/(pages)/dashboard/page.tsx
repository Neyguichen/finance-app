'use client'

import { useMemo } from 'react'
import { useApp } from '@/components/AppContext'
import { useRevenus } from '@/lib/hooks/useRevenus'
import { useChargesFixes } from '@/lib/hooks/useChargesFixes'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { useMouvements } from '@/lib/hooks/useEpargne'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { useCategories } from '@/lib/hooks/useCategories'
import { usePrevMonth } from '@/lib/hooks/usePrevMonth'
import { useYearData } from '@/lib/hooks/useYearData'
import { useIsAdmin } from '@/lib/hooks/useIsAdmin'

import WelcomeScreen from '@/components/pages/dashboard/WelcomeScreen'
import ResteAVivreCard from '@/components/pages/dashboard/ResteAVivreCard'
import EntrantsCard from '@/components/pages/dashboard/EntrantsCard'
import SortantsCard from '@/components/pages/dashboard/SortantsCard'
import RepartitionCategories from '@/components/pages/dashboard/RepartitionCategories'
import IndicateursMois from '@/components/pages/dashboard/IndicateursMois'
import BilanAnnuel from '@/components/pages/dashboard/BilanAnnuel'

export default function DashboardPage() {
  const { espaces, espace, moisId, addEspace } = useApp()
  const espaceId = espace?.id
  const isAdmin = useIsAdmin()

  const { data: revenus = [] } = useRevenus(moisId)
  const { data: charges = [] } = useChargesFixes(moisId)
  const { data: transactions = [] } = useTransactions(moisId)
  const { data: mouvements = [] } = useMouvements(moisId)
  const { data: budgets = [] } = useBudgets(moisId)
  const { data: categories = [] } = useCategories(espaceId)
  const prevMonthData = usePrevMonth(espaceId, moisId)
  const yearData = useYearData(espaceId)

  // --- Calculs ---
  const getMontantNet = (tx: any) => {
    const rembs = tx.remboursements || []
    return Number(tx.montant) - rembs.reduce((s: number, r: any) => s + Number(r.montant), 0)
  }

  const computed = useMemo(() => {
    const totalActif = revenus.filter((r: any) => r.type === 'actif').reduce((s: number, r: any) => s + Number(r.montant), 0)
    const totalPassif = revenus.filter((r: any) => r.type === 'passif').reduce((s: number, r: any) => s + Number(r.montant), 0)
    const totalRevenus = totalActif + totalPassif
    const totalRevenusRecus = revenus.filter((r: any) => r.recu).reduce((s: number, r: any) => s + Number(r.montant), 0)

    const totalChargesFixes = charges.reduce((s: number, c: any) => s + Number(c.montant), 0)
    const totalChargesPayees = charges.filter((c: any) => c.payee).reduce((s: number, c: any) => s + Number(c.montant), 0)

    const totalDepenses = transactions.reduce((s: number, t: any) => s + getMontantNet(t), 0)

    const totalEpargnes = mouvements.filter((m: any) => m.type === 'epargne').reduce((s: number, m: any) => s + Number(m.montant), 0)
    const totalReprises = mouvements.filter((m: any) => m.type === 'reprise').reduce((s: number, m: any) => s + Number(m.montant), 0)

    const totalVariablesBudget = budgets.reduce((s: number, b: any) => s + Number(b.montant), 0)

    // Reste M-1
    const resteM1Entrant = prevMonthData?.resteAVivre !== undefined && prevMonthData.resteAVivre > 0 ? prevMonthData.resteAVivre : 0
    const resteM1Sortant = prevMonthData?.resteAVivre !== undefined && prevMonthData.resteAVivre < 0 ? Math.abs(prevMonthData.resteAVivre) : 0

    // Entrants / Sortants
    const totalEntrants = totalRevenus + totalReprises + resteM1Entrant
    const totalSortants = totalChargesFixes + totalDepenses + totalEpargnes + resteM1Sortant

    // Reste à vivre
    const restePrevu = totalEntrants - totalChargesFixes - totalVariablesBudget - totalEpargnes
    const resteReel = totalRevenusRecus + totalReprises + resteM1Entrant - totalChargesPayees - totalDepenses - totalEpargnes

    // Indicateurs
    const ratioChargesRevenus = totalActif > 0 ? Math.round((totalChargesFixes / totalActif) * 100) : null
    const tauxMaitrise = totalVariablesBudget > 0 ? Math.round((totalDepenses / totalVariablesBudget) * 100) : null
    const objectifEpargne = (totalActif + totalPassif + resteM1Entrant - totalChargesFixes - resteM1Sortant) * 0.20
    const capaciteEpargne = objectifEpargne > 0 ? Math.round((totalEpargnes / objectifEpargne) * 100) : null

    // Charts
    const entrantsChart = [
      ...(totalActif > 0 ? [{ name: 'Actifs', value: totalActif, color: '#34d399' }] : []),
      ...(totalPassif > 0 ? [{ name: 'Passifs', value: totalPassif, color: '#6ee7b7' }] : []),
      ...(totalReprises > 0 ? [{ name: 'Reprises', value: totalReprises, color: '#a7f3d0' }] : []),
      ...(resteM1Entrant > 0 ? [{ name: 'Reste M-1', value: resteM1Entrant, color: '#d1fae5' }] : []),
    ]

    const sortantsChart = [
      ...(totalChargesFixes > 0 ? [{ name: 'Fixes', value: totalChargesFixes, color: '#E11D48' }] : []),
      ...(totalDepenses > 0 ? [{ name: 'Variables', value: totalDepenses, color: '#FDA4AF' }] : []),
      ...(totalEpargnes > 0 ? [{ name: 'Épargne', value: totalEpargnes, color: '#881337' }] : []),
      ...(resteM1Sortant > 0 ? [{ name: 'Déficit M-1', value: resteM1Sortant, color: '#7C3AED' }] : []),
    ]

    // Cat stats
    const catStatsMonth = categories.map((cat: any) => {
      const catTx = transactions.filter((t: any) => t.categorie_id === cat.id)
      const depense = catTx.reduce((s: number, t: any) => s + getMontantNet(t), 0)
      const budget = budgets.find((b: any) => b.categorie_id === cat.id)
      return { id: cat.id, nom: cat.nom, icone: cat.icone, depense, prevu: budget ? Number(budget.montant) : 0 }
    })

    // Top 3
    const top3Depenses = [...transactions].sort((a: any, b: any) => getMontantNet(b) - getMontantNet(a)).slice(0, 3)
    const top3Categories = [...catStatsMonth].filter(c => c.depense > 0).sort((a, b) => b.depense - a.depense).slice(0, 3)

    return {
      totalEntrants, totalSortants, totalChargesFixes, totalChargesPayees,
      totalDepenses, totalEpargnes, totalVariablesBudget, totalRevenus,
      restePrevu, resteReel, resteM1Sortant,
      ratioChargesRevenus, tauxMaitrise, objectifEpargne, capaciteEpargne,
      entrantsChart, sortantsChart, catStatsMonth, top3Depenses, top3Categories,
    }
  }, [revenus, charges, transactions, mouvements, budgets, categories, prevMonthData])

  // --- Pas d'espace ---
  if (!espaces.length) {
    return <WelcomeScreen onCreateEspace={async (nom, icone) => { await addEspace(nom, icone) }} />
  }

  if (!espace || !moisId) {
    return <div className="p-6 text-center text-slate-500">Sélectionnez un mois</div>
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <ResteAVivreCard restePrevu={computed.restePrevu} resteReel={computed.resteReel} />

      <div className="grid grid-cols-2 gap-3">
        <EntrantsCard totalEntrants={computed.totalEntrants} chartData={computed.entrantsChart} />
        <SortantsCard
          totalSortants={computed.totalSortants}
          totalEntrants={computed.totalEntrants}
          totalChargesFixes={computed.totalChargesFixes}
          totalChargesPayees={computed.totalChargesPayees}
          totalDepenses={computed.totalDepenses}
          totalVariablesBudget={computed.totalVariablesBudget}
          totalEpargnes={computed.totalEpargnes}
          resteM1Sortant={computed.resteM1Sortant}
          chartData={computed.sortantsChart}
        />
      </div>

      <RepartitionCategories
        totalChargesFixes={computed.totalChargesFixes}
        totalChargesPayees={computed.totalChargesPayees}
        totalEpargnes={computed.totalEpargnes}
        catStatsMonth={computed.catStatsMonth}
        prevMonthData={prevMonthData}
      />

      <IndicateursMois
        ratioChargesRevenus={computed.ratioChargesRevenus}
        tauxMaitrise={computed.tauxMaitrise}
        totalDepenses={computed.totalDepenses}
        totalVariablesBudget={computed.totalVariablesBudget}
        objectifEpargne={computed.objectifEpargne}
        capaciteEpargne={computed.capaciteEpargne}
        totalEpargnes={computed.totalEpargnes}
        top3Depenses={computed.top3Depenses}
        top3Categories={computed.top3Categories}
        getMontantNet={getMontantNet}
      />

      {yearData && (
        <BilanAnnuel
          annualRevenus={yearData.revenus}
          annualCharges={yearData.charges}
          annualDepenses={yearData.depenses}
          annualEpargne={yearData.epargne}
          annualSolde={yearData.solde}
          avgRevenus={yearData.avgRevenus}
          avgCharges={yearData.avgCharges}
          avgDepenses={yearData.avgDepenses}
          avgEpargne={yearData.avgEpargne}
          nbMonthsRevenus={yearData.nbMonthsRevenus || yearData.nbActiveMonths}
          nbMonthsCharges={yearData.nbMonthsCharges || yearData.nbActiveMonths}
          nbMonthsDepenses={yearData.nbActiveMonths}
          nbMonthsEpargne={yearData.nbMonthsEpargne || yearData.nbActiveMonths}
          monthlyData={yearData.monthlyData}
          catAnnualStats={yearData.catAnnualStats}
          categories={categories}
          prevYearRevenus={yearData.prevYearRevenus}
          prevYearCharges={yearData.prevYearCharges}
          prevYearDepenses={yearData.prevYearDepenses}
          prevYearEpargne={yearData.prevYearEpargne}
        />
      )}
    </div>
  )
}