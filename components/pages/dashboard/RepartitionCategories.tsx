'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro, getCategoryColor } from '@/lib/utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import EvoBadge from '@/components/global/EvoBadge'
import { ChevronLeft } from 'lucide-react'

interface Props {
  repartitionChartData: any[]
  totalChargesPayees: number
  totalChargesFixes: number
  totalEpargnes: number
  catStatsMonth: any[]
  prevMonthData: any
}

const tooltipStyle = { backgroundColor: '#344869', border: 'none' }
const fmtOrDash = (v: number) => v === 0 ? '—' : formatEuro(v)

const SUB_COLORS = ['#A78BFA', '#818CF8', '#67E8F9', '#34D399', '#FBBF24', '#FB923C', '#F472B6', '#C084FC']

export default function RepartitionCategories({
  repartitionChartData, totalChargesPayees, totalChargesFixes, totalEpargnes, catStatsMonth, prevMonthData
}: Props) {
  // Drill-down state : null = vue catégories, sinon = id de la catégorie sélectionnée
  const [drillCatId, setDrillCatId] = useState<string | null>(null)

  // Catégorie sélectionnée pour drill-down
  const drillCat = drillCatId ? catStatsMonth.find((c: any) => c.id === drillCatId) : null
  const hasSubCats = drillCat && drillCat.subCats && drillCat.subCats.length > 0

  // Données du donut drill-down (sous-catégories)
  const drillChartData = hasSubCats
    ? [
        ...drillCat.subCats.map((sc: any, i: number) => ({
          name: sc.nom,
          value: sc.depense,
          color: SUB_COLORS[i % SUB_COLORS.length],
          icon: sc.icone || '📎',
        })),
        ...(drillCat.depenseSansSousCat > 0
          ? [{ name: 'Sans sous-cat.', value: drillCat.depenseSansSousCat, color: '#475569', icon: '📦' }]
          : []),
      ]
    : []

  // Gestion du clic sur une part du donut principal
  const handlePieClick = (_: any, index: number) => {
    if (drillCatId) return // Déjà en drill-down
    const entry = repartitionChartData[index]
    if (!entry) return
    // Trouver la catégorie correspondante (pas Charges fixes ni Épargne)
    const cat = catStatsMonth.find((c: any) => c.nom === entry.name)
    if (cat && cat.subCats && cat.subCats.length > 0) {
      setDrillCatId(cat.id)
    }
  }

  // Données affichées dans le donut
  const activeChartData = drillCatId && hasSubCats ? drillChartData : repartitionChartData

  return (
    <Card className="bg-purple-950 border-purple-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          {drillCatId && (
            <button type="button" onClick={() => setDrillCatId(null)} className="text-purple-400 hover:text-purple-200">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <CardTitle className="text-sm text-purple-400">
            {drillCat
              ? `${drillCat.icone || '📂'} ${drillCat.nom}`
              : 'Répartition Catégories'
            }
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {((!drillCatId && activeChartData.length > 1) || (drillCatId && activeChartData.length > 0)) && (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={activeChartData}
                cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                paddingAngle={2} dataKey="value"
                onClick={!drillCatId ? handlePieClick : undefined}
                style={!drillCatId ? { cursor: 'pointer' } : undefined}
              >
                {activeChartData.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [formatEuro(value), name]} contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-purple-600 border-b border-purple-800">
                <th className="text-left py-2 font-medium">{drillCatId ? 'Sous-catégorie' : 'Catégorie'}</th>
                <th className="text-right py-2 font-medium whitespace-nowrap pl-2">Dép. / Prévu</th>
                {!drillCatId && <th className="text-right py-2 font-medium whitespace-nowrap pl-2">vs M-1</th>}
              </tr>
            </thead>
            <tbody>
              {/* --- VUE PRINCIPALE (catégories) --- */}
              {!drillCatId && (
                <>
                  <tr className="border-b border-purple-900">
                    <td className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#E11D48' }} />
                        <span className="text-purple-200 truncate text-xs">📌 Fixes</span>
                      </div>
                    </td>
                    <td className="text-right whitespace-nowrap pl-2">
                      <span className="text-white font-semibold">{fmtOrDash(totalChargesPayees)}</span>
                      <span className="text-purple-400"> / {fmtOrDash(totalChargesFixes)}</span>
                    </td>
                    <td className="text-right pl-2">
                      <EvoBadge current={totalChargesFixes} previous={prevMonthData?.charges} invertColors />
                    </td>
                  </tr>
                  {totalEpargnes > 0 && (
                    <tr className="border-b border-purple-900">
                      <td className="py-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#881337' }} />
                          <span className="text-purple-200 truncate text-xs">💰 Épargne</span>
                        </div>
                      </td>
                      <td className="text-right whitespace-nowrap pl-2">
                        <span className="text-white font-semibold">{fmtOrDash(totalEpargnes)}</span>
                      </td>
                      <td className="text-right pl-2">
                        <EvoBadge current={totalEpargnes} previous={prevMonthData?.epargne} />
                      </td>
                    </tr>
                  )}
                  {catStatsMonth.map((cat: any, i: number) => {
                    const hasSubs = cat.subCats && cat.subCats.length > 0
                    return (
                      <tr
                        key={cat.id}
                        className={`border-b border-purple-900 ${hasSubs ? 'cursor-pointer hover:bg-purple-900/30' : ''}`}
                        onClick={() => hasSubs && setDrillCatId(cat.id)}
                      >
                        <td className="py-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(i) }} />
                            <span className="text-purple-200 truncate text-xs">
                              {cat.icone || '📂'} {cat.nom}
                            </span>
                            {hasSubs && (
                              <span className="text-[9px] text-purple-500">▶</span>
                            )}
                          </div>
                        </td>
                        <td className="text-right whitespace-nowrap pl-2">
                          <span className="text-white font-semibold">{fmtOrDash(cat.depense)}</span>
                          {cat.prevu > 0 && (
                            <span className="text-purple-400"> / {fmtOrDash(cat.prevu)}</span>
                          )}
                        </td>
                        <td className="text-right pl-2">
                          <EvoBadge current={cat.depense} previous={prevMonthData?.catDepenses[cat.id]} invertColors />
                        </td>
                      </tr>
                    )
                  })}
                </>
              )}

              {/* --- VUE DRILL-DOWN (sous-catégories) --- */}
              {drillCatId && hasSubCats && (
                <>
                  {drillCat.subCats.map((sc: any, i: number) => (
                    <tr key={sc.id} className="border-b border-purple-900">
                      <td className="py-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SUB_COLORS[i % SUB_COLORS.length] }} />
                          <span className="text-purple-200 truncate text-xs">{sc.icone || '📎'} {sc.nom}</span>
                        </div>
                      </td>
                      <td className="text-right whitespace-nowrap pl-2">
                        <span className="text-white font-semibold">{fmtOrDash(sc.depense)}</span>
                        {sc.prevu > 0 && (
                          <span className="text-purple-400"> / {fmtOrDash(sc.prevu)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {drillCat.depenseSansSousCat > 0 && (
                    <tr className="border-b border-purple-900">
                      <td className="py-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#475569' }} />
                          <span className="text-purple-200 truncate text-xs italic">📦 Sans sous-cat.</span>
                        </div>
                      </td>
                      <td className="text-right whitespace-nowrap pl-2">
                        <span className="text-white font-semibold">{fmtOrDash(drillCat.depenseSansSousCat)}</span>
                      </td>
                    </tr>
                  )}
                  {/* Ligne total catégorie */}
                  <tr className="border-t border-purple-700">
                    <td className="py-1.5">
                      <span className="text-purple-400 text-xs font-semibold">Total {drillCat.nom}</span>
                    </td>
                    <td className="text-right whitespace-nowrap pl-2">
                      <span className="text-white font-bold">{formatEuro(drillCat.depense)}</span>
                      {drillCat.prevu > 0 && (
                        <span className="text-purple-400"> / {fmtOrDash(drillCat.prevu)}</span>
                      )}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}