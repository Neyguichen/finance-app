'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'
import { Calendar, Info } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'

interface Props {
  yearData: any
  currentMonth: string
  lineChartData: any[]
  catPlusVariableInfo: any
  catPlusVariable: any
  catStats: any[]
  showEpargne?: boolean
  showMoisExtremes?: boolean
  showGraphRevSortants?: boolean
  showGraphReste?: boolean
  showCatVariable?: boolean
  showTableau?: boolean
}

const tooltipStyle = { backgroundColor: '#344869', border: 'none' }

const moisNomFr = (m: string) => {
  const [, mo] = m.split('-').map(Number)
  return ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][mo - 1] || ''
}

export default function BilanAnnuel({
  yearData, currentMonth, lineChartData, catPlusVariableInfo, catPlusVariable, catStats,
  showEpargne = true, showMoisExtremes = true, showGraphRevSortants = true,
  showGraphReste = true, showCatVariable = true, showTableau = true,
}: Props) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  return (
    <Card className="bg-amber-950 border-amber-800">
      <CardHeader>
        <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Bilan Annuel {currentMonth?.slice(0, 4)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toujours visible : Total Revenus + Total Dépenses */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-amber-900/30 rounded-lg p-3">
            <p className="text-xs text-amber-500">Total Revenus</p>
            <p className="text-sm font-bold text-emerald-400">{formatEuro(yearData.annualTotals.revenus)}</p>
          </div>
          <div className="bg-amber-900/30 rounded-lg p-3">
            <p className="text-xs text-amber-500">Total Dépenses</p>
            <p className="text-sm font-bold text-rose-400">
              {formatEuro(yearData.annualTotals.charges + yearData.annualTotals.depenses + yearData.annualTotals.epargne)}
            </p>
          </div>
          {/* Optionnel : Épargne nette + taux */}
          {showEpargne && (
            <>
              <div className="bg-amber-900/30 rounded-lg p-3">
                <p className="text-xs text-amber-500">Taux d&apos;épargne</p>
                <p className={`text-sm font-bold ${yearData.tauxEpargne >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {yearData.tauxEpargne}%
                </p>
              </div>
              <div className="bg-amber-900/30 rounded-lg p-3">
                <p className="text-xs text-amber-500">Épargne nette</p>
                <p className="text-sm font-bold text-teal-400">{formatEuro(yearData.annualTotals.epargne)}</p>
              </div>
            </>
          )}
        </div>

        {/* Optionnel : Mois + dépensier / économe */}
        {showMoisExtremes && (
          <div className="flex gap-3">
            {yearData.moisMaxDepense.mois && (
              <div className="flex-1 bg-red-900/20 rounded-lg p-2">
                <p className="text-xs text-red-400">📈 Plus dépensier</p>
                <p className="text-xs font-bold text-white">
                  {moisNomFr(yearData.moisMaxDepense.mois)} — {formatEuro(yearData.moisMaxDepense.total)}
                </p>
              </div>
            )}
            {yearData.moisMinDepense.mois && (
              <div className="flex-1 bg-emerald-900/20 rounded-lg p-2">
                <p className="text-xs text-emerald-400">📉 Plus économe</p>
                <p className="text-xs font-bold text-white">
                  {moisNomFr(yearData.moisMinDepense.mois)} — {formatEuro(yearData.moisMinDepense.total)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Optionnel : Graph Revenus vs Sortants */}
        {showGraphRevSortants && lineChartData.length > 1 && (
          <div>
            <p className="text-xs text-amber-500 mb-2">📈 Revenus vs Sortants</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#78350f" />
                <XAxis dataKey="mois" tick= {{fontSize: 10, fill: '#92400e'}}  />
                <YAxis tick= {{fontSize: 10, fill: '#92400e'}}  width={45} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatEuro(v)} />
                <Line type="monotone" dataKey="revenus" stroke="#10B981" strokeWidth={2} dot= {{r: 3}}  name="Revenus" />
                <Line type="monotone" dataKey="sortants" stroke="#E11D48" strokeWidth={2} dot= {{r: 3}}  name="Sortants" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Optionnel : Graph Reste à vivre */}
        {showGraphReste && lineChartData.length > 1 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs text-amber-500">💰 Reste à vivre mensuel</p>
              <button type="button" onClick={() => setActiveTooltip(activeTooltip === 'courbeReste' ? null : 'courbeReste')} className="text-amber-600 hover:text-amber-400">
                <Info className="w-3 h-3" />
              </button>
            </div>
            {activeTooltip === 'courbeReste' && (
              <div className="text-xs text-amber-400/70 bg-amber-900/30 rounded-lg p-2 mb-2">
                Pour chaque mois : Reste M-1 + Revenus + Reprises d&apos;épargne − Charges fixes − Dépenses variables − Épargne. Représente le solde disponible en fin de mois.
              </div>
            )}
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#78350f" />
                <XAxis dataKey="mois" tick= {{fontSize: 10, fill: '#92400e'}}  />
                <YAxis tick= {{fontSize: 10, fill: '#92400e'}}  width={45} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatEuro(v)} />
                <Line type="monotone" dataKey="reste" stroke="#3B82F6" strokeWidth={2} dot= {{r: 3}}  name="Reste" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Optionnel : Catégorie la plus variable */}
        {showCatVariable && catPlusVariableInfo && catPlusVariable && (
          <div className="bg-amber-900/20 rounded-lg p-2">
            <p className="text-xs text-amber-500">📊 Catégorie la plus variable</p>
            <p className="text-xs font-bold text-white">
              {catPlusVariableInfo.icone} {catPlusVariableInfo.nom} — écart de {formatEuro((catPlusVariable[1] as any).max - (catPlusVariable[1] as any).min)}
            </p>
            <p className="text-xs text-amber-400">
              Min {formatEuro((catPlusVariable[1] as any).min)} — Max {formatEuro((catPlusVariable[1] as any).max)}
            </p>
          </div>
        )}

        {/* Optionnel : Tableau des catégories */}
        {showTableau && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-amber-600 border-b border-amber-800">
                  <th className="text-left py-2 font-medium">Catégorie</th>
                  <th className="text-right py-2 font-medium whitespace-nowrap pl-2">Total</th>
                  <th className="text-right py-2 font-medium whitespace-nowrap pl-2">Moy/mois</th>
                  <th className="text-right py-2 font-medium whitespace-nowrap pl-2">Min/Max</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-amber-900">
                  <td className="py-2 text-amber-200">📌 Charges fixes</td>
                  <td className="text-right text-amber-200">{formatEuro(yearData.annualTotals.charges)}</td>
                  <td className="text-right text-amber-200">{formatEuro(Math.round(yearData.annualTotals.charges / (yearData.nbMonthsCharges || 1)))}</td>
                  <td className="text-right text-amber-500">—</td>
                </tr>
                <tr className="border-b border-amber-900">
                  <td className="py-2 text-amber-200">💰 Épargne</td>
                  <td className="text-right text-amber-200">{formatEuro(yearData.annualTotals.epargne)}</td>
                  <td className="text-right text-amber-200">{formatEuro(Math.round(yearData.annualTotals.epargne / (yearData.nbMonthsEpargne || 1)))}</td>
                  <td className="text-right text-amber-500">—</td>
                </tr>
                {catStats.map((cat: any) => {
                  const annual = yearData.catAnnualStats[cat.id]
                  if (!annual || annual.total === 0) return null
                  return (
                    <tr key={cat.id} className="border-b border-amber-900">
                      <td className="py-2 text-amber-200 truncate">{cat.icone} {cat.nom}</td>
                      <td className="text-right text-amber-200">{formatEuro(annual.total)}</td>
                      <td className="text-right text-amber-200">{formatEuro(annual.avg)}</td>
                      <td className="text-right text-amber-400 whitespace-nowrap">
                        <div className="text-xs">{formatEuro(annual.min)}</div>
                        <div className="text-xs">{formatEuro(annual.max)}</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}