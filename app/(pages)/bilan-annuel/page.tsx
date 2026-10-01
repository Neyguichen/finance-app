'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, ChevronDown } from 'lucide-react'
import { useApp } from '@/components/AppContext'
import { useYearData } from '@/lib/hooks/useYearData'
import { useAvailableYears } from '@/lib/hooks/useAvailableYears'
import { useCategories } from '@/lib/hooks/useCategories'
import { useBalanceAtDate } from '@/lib/hooks/useBalanceAtDate'
import { localDateISO } from '@/lib/utils'
import BilanAnnuel from '@/components/pages/dashboard/BilanAnnuel'
import PageHeader from '@/components/layout/PageHeader'

function SelectBox({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value:string) => void
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-slate-600">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={event => onChange(event.target.value)}
          className="h-9 w-full appearance-none rounded-lg border border-slate-700 bg-slate-950 pl-3 pr-9 text-xs font-medium text-slate-200 outline-none transition hover:border-slate-600 focus:border-indigo-400"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
      </span>
    </label>
  )
}

export default function BilanAnnuelPage() {
  const { espace } = useApp()
  const espaceId = espace?.id
  const { data: availableYears = [], isLoading: loadingYears } = useAvailableYears(espaceId)
  const { data: categories = [] } = useCategories(espaceId)

  const currentYear = new Date().getFullYear().toString()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [compareYear, setCompareYear] = useState('')

  const effectiveYear = availableYears.includes(selectedYear)
    ? selectedYear
    : availableYears[0] || currentYear

  useEffect(() => {
    if (!availableYears.length) return
    if (compareYear && compareYear !== effectiveYear && availableYears.includes(compareYear)) return
    const previous = String(Number(effectiveYear) - 1)
    setCompareYear(
      availableYears.includes(previous)
        ? previous
        : availableYears.find(year => year !== effectiveYear) || '',
    )
  }, [availableYears, effectiveYear, compareYear])

  const { data: yearData, isLoading: loadingYear } = useYearData(espaceId, `${effectiveYear}-12-01`) as { data:any; isLoading:boolean }
  const compareEnabled = !!compareYear && compareYear !== effectiveYear
  const { data: compareData, isLoading: loadingCompare } = useYearData(compareEnabled ? espaceId : undefined, `${compareYear || effectiveYear}-12-01`) as { data:any; isLoading:boolean }

  const today = localDateISO()
  const selectedTargetDate = effectiveYear === today.slice(0,4) ? today : `${effectiveYear}-12-31`
  const compareTargetDate = compareYear === today.slice(0,4) ? today : compareYear ? `${compareYear}-12-31` : today

  const selectedBalance = useBalanceAtDate(
    espaceId,
    espace?.solde_reference ?? null,
    espace?.date_solde_reference ?? null,
    selectedTargetDate,
    espace?.double_date ?? false,
  )
  const compareBalance = useBalanceAtDate(
    compareEnabled ? espaceId : undefined,
    espace?.solde_reference ?? null,
    espace?.date_solde_reference ?? null,
    compareTargetDate,
    espace?.double_date ?? false,
  )

  const compareOptions = useMemo(
    () => availableYears.filter(year => year !== effectiveYear),
    [availableYears, effectiveYear],
  )

  if (!espaceId) return <div className="p-6 text-center text-slate-500">Sélectionnez un budget</div>
  if (loadingYears) return <div className="flex min-h-[50vh] items-center justify-center"><span className="loading loading-spinner loading-lg" /></div>

  if (availableYears.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        <p>Aucune donnée annuelle disponible</p>
        <p className="mt-1 text-xs">Commencez à utiliser l&apos;app pour voir vos analyses ici.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-3 p-3 pb-24 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Analyses"
          description="Comprenez votre année, comparez vos périodes et identifiez ce qui fait évoluer votre budget."
          icon={BarChart3}
        />

        <div className="nf-panel grid w-full gap-2 p-2 sm:grid-cols-2 lg:w-[430px]">
          <SelectBox label="Période" value={effectiveYear} onChange={setSelectedYear}>
            {availableYears.map(year => <option key={year} value={year}>{year === currentYear ? `Cette année (${year})` : year}</option>)}
          </SelectBox>
          <SelectBox label="Comparer à" value={compareYear} onChange={setCompareYear}>
            {compareOptions.length === 0 && <option value="">Aucune période</option>}
            {compareOptions.map(year => <option key={year} value={year}>{year === String(Number(effectiveYear)-1) ? `Année précédente (${year})` : year}</option>)}
          </SelectBox>
        </div>
      </div>

      {loadingYear || (compareEnabled && loadingCompare) ? (
        <div className="flex min-h-[45vh] items-center justify-center"><span className="loading loading-spinner loading-lg" /></div>
      ) : yearData && yearData.nbMonths > 0 ? (
        <BilanAnnuel
          yearData={yearData}
          compareData={compareData}
          selectedYear={effectiveYear}
          compareYear={compareEnabled ? compareYear : undefined}
          categories={categories}
          selectedBalance={selectedBalance.data}
          compareBalance={compareBalance.data}
        />
      ) : (
        <div className="py-8 text-center text-slate-500"><p>Aucune donnée pour {effectiveYear}</p></div>
      )}
    </div>
  )
}
