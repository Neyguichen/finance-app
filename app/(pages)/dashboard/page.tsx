'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

import { useApp } from '@/components/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import MonthSelector from '@/components/layout/MonthSelector'
import WelcomeScreen from '@/components/pages/dashboard/WelcomeScreen'
import ResteAVivreCard from '@/components/pages/dashboard/ResteAVivreCard'
import EntrantsCard from '@/components/pages/dashboard/EntrantsCard'
import SortantsCard from '@/components/pages/dashboard/SortantsCard'
import RepartitionCategories from '@/components/pages/dashboard/RepartitionCategories'
import IndicateursMois from '@/components/pages/dashboard/IndicateursMois'

import { getMontantNet } from '@/lib/utils'
import { useDashboardData } from '@/lib/hooks/useDashboardData'

export default function DashboardPage() {
  const { month, setMonth, espaces, espace, loading, addEspace, isAdminViewing } = useApp()
  const [openEspace, setOpenEspace] = useState(false)
  const [newNom, setNewNom] = useState('')
  const [newIcone, setNewIcone] = useState('🏠')

  const data = useDashboardData()

  // Stats visibles (tout activé par défaut)
  const ds = {
    repartition: true, ratioCharges: true, maitrise: true, epargne20: true,
    top3Depenses: true, top3Categories: true,
    bilanEpargne: true, bilanMoisExtremes: true, bilanGraphRevSortants: true,
    bilanGraphReste: true, bilanCatVariable: true, bilanTableau: true,
    ...(espace?.dashboard_stats as Record<string, boolean> | undefined),
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><span className="loading loading-spinner loading-lg" /></div>
  }

  if (espaces.length === 0) {
    return <WelcomeScreen onCreateEspace={async (nom, icone) => { await addEspace(nom, icone) }} />
  }

  const showIndicateurs = ds.ratioCharges || ds.maitrise || ds.epargne20 || ds.top3Depenses || ds.top3Categories

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />
      <div className="p-4 space-y-4">
        {/* Bouton ajouter espace */}
        <div className="flex items-center justify-between">
          {!isAdminViewing && (
            <Dialog open={openEspace} onOpenChange={setOpenEspace}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Espace</Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
                <DialogHeader><DialogTitle>Nouvel espace</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Nom (ex: Joint)" value={newNom} onChange={e => setNewNom(e.target.value)} />
                  <EmojiPicker value={newIcone} onChange={setNewIcone} />
                  <Button className="w-full" onClick={async () => {
                    if (!newNom.trim()) return
                    await addEspace(newNom.trim(), newIcone || undefined)
                    setNewNom('')
                    setNewIcone('🏠')
                    setOpenEspace(false)
                  }}>Créer l&apos;espace</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Toujours visible */}
        <ResteAVivreCard restePrevu={data.restePrevu} resteReel={data.resteReel} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <EntrantsCard totalEntrants={data.totalEntrants} chartData={data.revenusChartData} />
          <SortantsCard
            totalSortantsAll={data.totalSortantsAll}
            sortantsChartData={data.sortantsChartData}
            chargesFixesNonPayees={data.chargesFixesNonPayees}
            totalChargesPayees={data.totalChargesPayees}
            totalChargesFixes={data.totalChargesFixes}
            totalDepenses={data.totalDepenses}
            totalVariablesBudget={data.totalVariablesBudget}
            totalEpargnes={data.totalEpargnes}
            resteM1Sortant={data.resteM1Sortant}
            totalEntrants={data.totalEntrants}
          />
        </div>

        {/* Optionnel : Répartition + Indicateurs */}
        {(ds.repartition || showIndicateurs) && (
          <div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
            {ds.repartition && (
              <RepartitionCategories
                repartitionChartData={data.repartitionChartData}
                totalChargesPayees={data.totalChargesPayees}
                totalChargesFixes={data.totalChargesFixes}
                totalEpargnes={data.totalEpargnes}
                catStatsMonth={data.catStatsMonth}
                prevMonthData={data.prevMonthData}
              />
            )}
            {showIndicateurs && (
              <IndicateursMois
                ratioChargesRevenus={data.ratioChargesRevenus}
                tauxMaitrise={data.tauxMaitrise}
                totalDepenses={data.totalDepenses}
                totalVariablesBudget={data.totalVariablesBudget}
                objectifEpargne={data.objectifEpargne}
                capaciteEpargne={data.capaciteEpargne}
                totalEpargnes={data.totalEpargnes}
                top3Depenses={data.top3Depenses}
                top3Categories={data.top3Categories}
                getMontantNet={getMontantNet}
                showRatioCharges={ds.ratioCharges}
                showMaitrise={ds.maitrise}
                showEpargne20={ds.epargne20}
                showTop3Depenses={ds.top3Depenses}
                showTop3Categories={ds.top3Categories}
                top3SubCategories={data.top3SubCategories}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}