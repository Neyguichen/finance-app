'use client'

import { useMemo, useState } from 'react'
import { useApp } from '@/components/AppContext'
import { useYearData } from '@/lib/hooks/useYearData'
import { useAvailableYears } from '@/lib/hooks/useAvailableYears'
import { useCategories } from '@/lib/hooks/useCategories'
import BilanAnnuel from '@/components/pages/dashboard/BilanAnnuel'
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'

const moisNomFr = (m: string) => {
  const [, mo] = m.split('-').map(Number)
  return ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][mo - 1] || ''
}

export default function BilanAnnuelPage() {
  const { espace } = useApp()
  const espaceId = espace?.id

  const { data: availableYears = [], isLoading: loadingYears } = useAvailableYears(espaceId)
  const currentYear = new Date().getFullYear().toString()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const effectiveYear = availableYears.includes(selectedYear)
    ? selectedYear
    : availableYears[0] || currentYear

  const { data: yearData } = useYearData(espaceId, `${effectiveYear}-12-01`) as { data: any }
  const { data: categories = [] } = useCategories(espaceId)

  const yearIndex = availableYears.indexOf(effectiveYear)
  const canPrev = yearIndex < availableYears.length - 1
  const canNext = yearIndex > 0

  const ds = {
    bilanEpargne: true, bilanMoisExtremes: true, bilanGraphRevSortants: true,
    bilanGraphReste: true, bilanCatVariable: true, bilanTableau: true,
    ...(espace?.dashboard_stats as Record<string, boolean> | undefined),
  }

  const { lineChartData, catStats, catPlusVariable, catPlusVariableInfo } = useMemo(() => {
    if (!yearData?.monthlyData) {
      return { lineChartData: [], catStats: [], catPlusVariable: null, catPlusVariableInfo: null }
    }

    const months = Object.keys(yearData.monthlyData).sort()
    const lineData = months.map((mois) => {
      const data: any = yearData.monthlyData[mois]
      const entrees = data.revenusRecus + data.reprises + data.remboursementsCreance
      const sortants = data.chargesReelles + data.depenses + data.epargne + data.remboursementsDette
      return {
        mois: moisNomFr(mois),
        revenus: Math.round(entrees),
        sortants: Math.round(sortants),
        reste: Math.round(entrees - sortants),
      }
    })

    const stats = [...categories]
      .sort((a: any, b: any) => a.nom.localeCompare(b.nom))
      .map((categorie: any) => ({ id: categorie.id, nom: categorie.nom, icone: categorie.icone }))

    const cpv = yearData.catAnnualStats
      ? Object.entries(yearData.catAnnualStats)
          .filter(([, stat]: [string, any]) => stat.total > 0 && stat.max > stat.min)
          .sort(([, a]: [string, any], [, b]: [string, any]) => (b.max - b.min) - (a.max - a.min))[0] ?? null
      : null

    const cpvInfo = cpv ? stats.find(categorie => categorie.id === cpv[0]) : null

    return { lineChartData: lineData, catStats: stats, catPlusVariable: cpv, catPlusVariableInfo: cpvInfo }
  }, [yearData, categories])

  if (!espaceId) {
    return <div className="p-6 text-center text-slate-500">Sélectionnez un Budget</div>
  }

  if (loadingYears) {
    return <div className="flex min-h-[50vh] items-center justify-center"><span className="loading loading-spinner loading-lg" /></div>
  }

  if (availableYears.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        <p>Aucune donnée annuelle disponible</p>
        <p className="mt-1 text-xs">Commencez à utiliser l&apos;app pour voir le bilan ici.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-3 pb-24 sm:p-4">
      <PageHeader
        eyebrow="Analyses"
        title="Bilan annuel"
        description="Prends du recul sur tes revenus, tes sorties, ton épargne et l’évolution de tes catégories."
        icon={BarChart3}
      />
      <div className="nf-panel flex items-center justify-center gap-2 p-2 sm:gap-4">
        <button
          onClick={() => canPrev && setSelectedYear(availableYears[yearIndex + 1])}
          disabled={!canPrev}
          className={`rounded-lg p-2 transition-colors ${canPrev ? 'text-slate-300 hover:bg-slate-800' : 'cursor-not-allowed text-slate-700'}`}
          aria-label="Année précédente"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex max-w-[70vw] gap-2 overflow-x-auto py-1 sm:max-w-full">
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                year === effectiveYear
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-900/50 text-slate-500 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
        <button
          onClick={() => canNext && setSelectedYear(availableYears[yearIndex - 1])}
          disabled={!canNext}
          className={`rounded-lg p-2 transition-colors ${canNext ? 'text-slate-300 hover:bg-slate-800' : 'cursor-not-allowed text-slate-700'}`}
          aria-label="Année suivante"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {yearData && yearData.nbMonths > 0 ? (
        <BilanAnnuel
          yearData={yearData}
          currentMonth={`${effectiveYear}-12-01`}
          lineChartData={lineChartData}
          catPlusVariableInfo={catPlusVariableInfo}
          catPlusVariable={catPlusVariable}
          catStats={catStats}
          showEpargne={ds.bilanEpargne}
          showMoisExtremes={ds.bilanMoisExtremes}
          showGraphRevSortants={ds.bilanGraphRevSortants}
          showGraphReste={ds.bilanGraphReste}
          showCatVariable={ds.bilanCatVariable}
          showTableau={ds.bilanTableau}
        />
      ) : (
        <div className="py-8 text-center text-slate-500">
          <p>Aucune donnée pour {effectiveYear}</p>
        </div>
      )}
    </div>
  )
}
