'use client'

import { useState } from 'react'
import { Calendar, Info } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'

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

const tooltipStyle = { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px' }

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
    <Card className="nf-card border-indigo-400/10 bg-gradient-to-br from-indigo-500/[0.04] via-slate-950/30 to-cyan-500/[0.03]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm text-indigo-300">
          <Calendar className="h-4 w-4" />
          Bilan annuel {currentMonth?.slice(0, 4)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-950/35 border border-slate-800/70 p-3">
            <p className="text-xs text-slate-500">Revenus reçus</p>
            <p className="text-base font-bold text-emerald-400">{formatEuro(yearData.annualTotals.revenusRecus)}</p>
            <p className="mt-1 text-[11px] text-slate-600">Prévu : {formatEuro(yearData.annualTotals.revenus)}</p>
          </div>
          <div className="rounded-lg bg-slate-950/35 border border-slate-800/70 p-3">
            <p className="text-xs text-slate-500">Dépenses réelles</p>
            <p className="text-base font-bold text-rose-400">{formatEuro(yearData.depensesReelles)}</p>
            <p className="mt-1 text-[11px] text-slate-600">Fixes + variables + remboursements de dette</p>
          </div>
          {showEpargne && (
            <>
              <div className="rounded-lg bg-slate-950/35 border border-slate-800/70 p-3">
                <p className="text-xs text-slate-500">Épargne nette</p>
                <p className={`text-base font-bold ${yearData.epargneNette >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
                  {formatEuro(yearData.epargneNette)}
                </p>
                <p className="mt-1 text-[11px] text-slate-600">
                  Versements {formatEuro(yearData.annualTotals.epargne)} · reprises {formatEuro(yearData.annualTotals.reprises)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-950/35 border border-slate-800/70 p-3">
                <p className="text-xs text-slate-500">Taux d&apos;épargne net</p>
                <p className={`text-base font-bold ${yearData.tauxEpargne >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {yearData.tauxEpargne}%
                </p>
                <p className="mt-1 text-[11px] text-slate-600">Épargne nette / revenus reçus</p>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-950/30 p-3">
            <p className="text-xs text-slate-500">Entrées de trésorerie</p>
            <p className="text-sm font-bold text-emerald-300">{formatEuro(yearData.entreesTresorerie)}</p>
            <p className="mt-1 text-[10px] text-slate-600">Revenus + reprises + remboursements de créance</p>
          </div>
          <div className="rounded-lg bg-slate-950/30 p-3">
            <p className="text-xs text-slate-500">Mouvement net annuel</p>
            <p className={`text-sm font-bold ${yearData.mouvementNet >= 0 ? 'text-blue-300' : 'text-rose-300'}`}>
              {formatEuro(yearData.mouvementNet)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-950/30 p-3">
            <p className="text-xs text-slate-500">Mois actifs</p>
            <p className="text-sm font-bold text-slate-200">{yearData.nbActiveMonths} / {yearData.nbMonths}</p>
          </div>
        </div>

        {showMoisExtremes && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {yearData.moisMaxDepense.mois && (
              <div className="rounded-lg bg-red-900/20 p-2">
                <p className="text-xs text-red-400">📈 Plus gros sortants réels</p>
                <p className="text-xs font-bold text-white">
                  {moisNomFr(yearData.moisMaxDepense.mois)} — {formatEuro(yearData.moisMaxDepense.total)}
                </p>
              </div>
            )}
            {yearData.moisMinDepense.mois && (
              <div className="rounded-lg bg-emerald-900/20 p-2">
                <p className="text-xs text-emerald-400">📉 Plus petits sortants réels</p>
                <p className="text-xs font-bold text-white">
                  {moisNomFr(yearData.moisMinDepense.mois)} — {formatEuro(yearData.moisMinDepense.total)}
                </p>
              </div>
            )}
          </div>
        )}

        {showGraphRevSortants && lineChartData.length > 1 && (
          <div>
            <p className="mb-2 text-xs text-slate-500">📈 Entrées de trésorerie vs sortants réels</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="mois" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={45} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatEuro(v)} />
                <Line type="monotone" dataKey="revenus" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Entrées" />
                <Line type="monotone" dataKey="sortants" stroke="#E11D48" strokeWidth={2} dot={{ r: 3 }} name="Sortants" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {showGraphReste && lineChartData.length > 1 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <p className="text-xs text-slate-500">💰 Résultat net mensuel</p>
              <button type="button" onClick={() => setActiveTooltip(activeTooltip === 'courbeReste' ? null : 'courbeReste')} className="text-slate-600 hover:text-indigo-300">
                <Info className="h-3 w-3" />
              </button>
            </div>
            {activeTooltip === 'courbeReste' && (
              <div className="mb-2 rounded-lg bg-slate-950/35 border border-slate-800/70 p-2 text-xs text-indigo-300/70">
                Entrées réelles − charges/dépenses réelles − épargne versée. Les reprises d&apos;épargne et remboursements de créance restent des entrées de trésorerie, pas des revenus.
              </div>
            )}
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="mois" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={45} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatEuro(v)} />
                <Line type="monotone" dataKey="reste" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Résultat net" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {showCatVariable && catPlusVariableInfo && catPlusVariable && (
          <div className="rounded-lg bg-indigo-500/[0.04] border border-indigo-400/10 p-2">
            <p className="text-xs text-slate-500">📊 Catégorie la plus variable</p>
            <p className="text-xs font-bold text-white">
              {catPlusVariableInfo.icone} {catPlusVariableInfo.nom} — écart de {formatEuro((catPlusVariable[1] as any).max - (catPlusVariable[1] as any).min)}
            </p>
            <p className="text-xs text-indigo-300">
              Min {formatEuro((catPlusVariable[1] as any).min)} — Max {formatEuro((catPlusVariable[1] as any).max)}
            </p>
          </div>
        )}

        {showTableau && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-600">
                  <th className="py-2 text-left font-medium">Catégorie</th>
                  <th className="py-2 pl-2 text-right font-medium whitespace-nowrap">Total réel</th>
                  <th className="py-2 pl-2 text-right font-medium whitespace-nowrap">Moy/mois actif</th>
                  <th className="py-2 pl-2 text-right font-medium whitespace-nowrap">Min/Max</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-800/70">
                  <td className="py-2 text-slate-200">📌 Charges fixes</td>
                  <td className="text-right text-slate-200">{formatEuro(yearData.annualTotals.chargesReelles)}</td>
                  <td className="text-right text-slate-200">{formatEuro(Math.round(yearData.annualTotals.chargesReelles / (yearData.nbMonthsCharges || 1)))}</td>
                  <td className="text-right text-slate-500">—</td>
                </tr>
                <tr className="border-b border-slate-800/70">
                  <td className="py-2 text-slate-200">💰 Épargne nette</td>
                  <td className="text-right text-slate-200">{formatEuro(yearData.epargneNette)}</td>
                  <td className="text-right text-slate-200">{formatEuro(Math.round(yearData.epargneNette / (yearData.nbMonthsEpargne || 1)))}</td>
                  <td className="text-right text-slate-500">—</td>
                </tr>
                {catStats.map((cat: any) => {
                  const annual = yearData.catAnnualStats[cat.id]
                  if (!annual || annual.total === 0) return null
                  return (
                    <tr key={cat.id} className="border-b border-slate-800/70">
                      <td className="max-w-[180px] truncate py-2 text-slate-200">{cat.icone} {cat.nom}</td>
                      <td className="text-right text-slate-200">{formatEuro(annual.total)}</td>
                      <td className="text-right text-slate-200">{formatEuro(annual.avg)}</td>
                      <td className="whitespace-nowrap text-right text-indigo-300">
                        <div>{formatEuro(annual.min)}</div>
                        <div>{formatEuro(annual.max)}</div>
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
