'use client'

import { useState, useMemo } from 'react'
import { useApp } from '@/components/AppContext'
import { useYearData } from '@/lib/hooks/useYearData'
import { useAvailableYears } from '@/lib/hooks/useAvailableYears'
import { useCategories } from '@/lib/hooks/useCategories'
import BilanAnnuel from '@/components/pages/dashboard/BilanAnnuel'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const moisNomFr = (m: string) => {
  const [, mo] = m.split('-').map(Number)
  return ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][mo - 1] || ''
}

export default function BilanAnnuelPage() {
  const { espace, isAdminViewing } = useApp()
  const espaceId = espace?.id

  const { data: availableYears = [], isLoading: loadingYears } = useAvailableYears(espaceId)
  const currentYear = new Date().getFullYear().toString()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  // S'assurer que l'année sélectionnée existe dans les données
  const effectiveYear = availableYears.includes(selectedYear)
    ? selectedYear
    : availableYears[0] || currentYear

  // Charger les données de l'année
  const { data: yearData } = useYearData(espaceId, `${effectiveYear}-12-01`) as { data: any }
  const { data: categories = [] } = useCategories(espaceId)

  // Navigation année
  const yearIndex = availableYears.indexOf(effectiveYear)
  const canPrev = yearIndex < availableYears.length - 1
  const canNext = yearIndex > 0

  // Calculs pour BilanAnnuel
  const { lineChartData, catStats, catPlusVariable, catPlusVariableInfo } = useMemo(() => {
    if (!yearData?.monthlyData) return { lineChartData: [], catStats: [], catPlusVariable: null, catPlusVariableInfo: null }

    // lineChartData
    const monthlyResteM1: Record<string, number> = {}
    const months = Object.keys(yearData.monthlyData).sort()
    let carry = espace?.solde_initial ?? 0
    for (const m of months) {
      monthlyResteM1[m] = carry
      const d: any = yearData.monthlyData[m]
      carry = carry + d.revenus + d.reprises - d.charges - d.depenses - d.epargne
    }

    const lineData = months.map((mois) => {
      const d: any = yearData.monthlyData[mois]
      const rm1 = monthlyResteM1[mois] ?? 0
      return {
        mois: moisNomFr(mois),
        revenus: Math.round((rm1 > 0 ? rm1 : 0) + d.revenus + d.reprises),
        sortants: Math.round(d.charges + d.depenses + d.epargne + (rm1 < 0 ? Math.abs(rm1) : 0)),
        reste: Math.round(rm1 + d.revenus + d.reprises - d.charges - d.depenses - d.epargne),
      }
    })

    // catStats
    const stats = [...categories]
      .sort((a: any, b: any) => a.nom.localeCompare(b.nom))
      .map((c: any) => ({ id: c.id, nom: c.nom, icone: c.icone }))

    // catPlusVariable
    const cpv = yearData.catAnnualStats
      ? Object.entries(yearData.catAnnualStats)
          .filter(([, s]: [string, any]) => s.total > 0 && s.max > s.min)
          .sort(([, a]: [string, any], [, b]: [string, any]) => (b.max - b.min) - (a.max - a.min))[0] ?? null
      : null

    const cpvInfo = cpv ? stats.find(c => c.id === cpv[0]) : null

    return { lineChartData: lineData, catStats: stats, catPlusVariable: cpv, catPlusVariableInfo: cpvInfo }
  }, [yearData, categories, espace?.solde_initial])

  if (!espaceId) {
    return <div className="p-6 text-center text-slate-500">Sélectionnez un espace</div>
  }

  if (loadingYears) {
    return <div className="flex items-center justify-center min-h-[50vh]"><span className="loading loading-spinner loading-lg" /></div>
  }

  if (availableYears.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        <p>Aucune donnée annuelle disponible</p>
        <p className="text-xs mt-1">Commencez à utiliser l&apos;app pour voir le bilan ici.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Sélecteur d'année */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => canPrev && setSelectedYear(availableYears[yearIndex + 1])}
          disabled={!canPrev}
          className={`p-2 rounded-lg transition-colors ${canPrev ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 cursor-not-allowed'}`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-2">
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                year === effectiveYear
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
        <button
          onClick={() => canNext && setSelectedYear(availableYears[yearIndex - 1])}
          disabled={!canNext}
          className={`p-2 rounded-lg transition-colors ${canNext ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 cursor-not-allowed'}`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Contenu */}
      {yearData && yearData.nbMonths > 0 ? (
        <BilanAnnuel
          yearData={yearData}
          currentMonth={`${effectiveYear}-12-01`}
          lineChartData={lineChartData}
          catPlusVariableInfo={catPlusVariableInfo}
          catPlusVariable={catPlusVariable}
          catStats={catStats}
        />
      ) : (
        <div className="text-center text-slate-500 py-8">
          <p>Aucune donnée pour {effectiveYear}</p>
        </div>
      )}
    </div>
  )
}