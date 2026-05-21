'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface ChartEntry { name: string; value: number; color: string }

interface Props {
  totalSortantsAll: number
  sortantsChartData: ChartEntry[]
  chargesFixesNonPayees: number
  totalChargesPayees: number
  totalChargesFixes: number
  totalDepenses: number
  totalVariablesBudget: number
  totalEpargnes: number
  resteM1Sortant: number
  totalEntrants: number
}

const tooltipStyle = { backgroundColor: '#344869', border: 'none' }

export default function SortantsCard({
  totalSortantsAll, sortantsChartData, chargesFixesNonPayees, totalChargesPayees,
  totalChargesFixes, totalDepenses, totalVariablesBudget, totalEpargnes, resteM1Sortant, totalEntrants
}: Props) {
  return (
    <Card className="bg-rose-950 border-rose-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-rose-400">Sortants</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-bold text-rose-300">
          {formatEuro(totalSortantsAll)}
          <span className="text-sm font-normal text-rose-500 ml-2">
            ({totalEntrants > 0 ? Math.round((totalSortantsAll / totalEntrants) * 100) : 0}% des revenus)
          </span>
        </p>
        {sortantsChartData.length > 1 && (
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-28 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sortantsChartData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                    {sortantsChartData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const pourcent = totalSortantsAll > 0 ? Math.round((value / totalSortantsAll) * 100) : 0
                      return [`${formatEuro(value)} (${pourcent}%)`, name]
                    }}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 w-full">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-pink-600 flex-shrink-0" />
                  <span className="text-xs text-slate-300 truncate">Fixes</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-semibold text-white">{formatEuro(chargesFixesNonPayees)} / {formatEuro(totalChargesPayees)}</span>
                  <span className="text-xs text-slate-500 ml-1">
                    ({totalChargesFixes > 0 ? Math.round((totalChargesFixes / totalSortantsAll) * 100) : 0}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-pink-300 flex-shrink-0" />
                  <span className="text-xs text-slate-300 truncate">Variables</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-semibold text-white">{formatEuro(totalDepenses)}</span>
                  <span className="text-xs text-slate-500 ml-1">
                    ({totalSortantsAll > 0 ? Math.round((totalDepenses / totalSortantsAll) * 100) : 0}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pl-5">
                <span className="text-xs text-slate-500">Prévu</span>
                <div className="text-right">
                  <span className="text-xs text-slate-400 flex-shrink-0">{formatEuro(totalVariablesBudget)}</span>
                  <span className="text-xs text-slate-600 ml-1">
                    ({totalSortantsAll > 0 ? Math.round((totalVariablesBudget / totalSortantsAll) * 100) : 0}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-pink-900 flex-shrink-0" />
                  <span className="text-xs text-slate-300 truncate">Épargne</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-semibold text-white">{formatEuro(totalEpargnes)}</span>
                  <span className="text-xs text-slate-500 ml-1">
                    ({totalSortantsAll > 0 ? Math.round((totalEpargnes / totalSortantsAll) * 100) : 0}%)
                  </span>
                </div>
              </div>
              {resteM1Sortant > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor: '#7C3AED'}} />
                    <span className="text-xs text-slate-300 truncate">Déficit M-1</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-semibold text-white">{formatEuro(resteM1Sortant)}</span>
                    <span className="text-xs text-slate-500 ml-1">
                      ({totalSortantsAll > 0 ? Math.round((resteM1Sortant / totalSortantsAll) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}