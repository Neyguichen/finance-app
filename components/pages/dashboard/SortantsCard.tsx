'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface ChartEntry {
  name: string
  value: number
  color: string
}

interface SortantsCardProps {
  totalSortants: number
  totalEntrants: number
  totalChargesFixes: number
  totalChargesPayees: number
  totalDepenses: number
  totalVariablesBudget: number
  totalEpargnes: number
  resteM1Sortant: number
  chartData: ChartEntry[]
}

const tooltipStyle = { backgroundColor: '#344869', border: 'none' }

export default function SortantsCard({
  totalSortants, totalEntrants, totalChargesFixes, totalChargesPayees,
  totalDepenses, totalVariablesBudget, totalEpargnes, resteM1Sortant, chartData
}: SortantsCardProps) {
  const chargesFixesNonPayees = totalChargesFixes - totalChargesPayees

  return (
    <Card className="bg-rose-950 border-rose-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-rose-400">Sortants</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-bold text-rose-300">
          {formatEuro(totalSortants)}
          <span className="text-sm font-normal text-rose-500 ml-2">
            ({totalEntrants > 0 ? Math.round((totalSortants / totalEntrants) * 100) : 0}% des revenus)
          </span>
        </p>
        {chartData.length > 1 && (
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-28 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const pourcent = totalSortants > 0 ? Math.round((value / totalSortants) * 100) : 0
                      return [`${formatEuro(value)} (${pourcent}%)`, name]
                    }}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 w-full">
              <LegendRow color="#E11D48" label="Fixes" value={`${formatEuro(chargesFixesNonPayees)} / ${formatEuro(totalChargesPayees)}`} pct={totalChargesFixes > 0 ? Math.round((totalChargesFixes / totalSortants) * 100) : 0} />
              <LegendRow color="#FDA4AF" label="Variables" value={formatEuro(totalDepenses)} pct={totalSortants > 0 ? Math.round((totalDepenses / totalSortants) * 100) : 0} />
              <div className="flex items-center justify-between gap-2 pl-5">
                <span className="text-xs text-slate-500">Prévu</span>
                <div className="text-right">
                  <span className="text-xs text-slate-400">{formatEuro(totalVariablesBudget)}</span>
                  <span className="text-xs text-slate-600 ml-1">({totalSortants > 0 ? Math.round((totalVariablesBudget / totalSortants) * 100) : 0}%)</span>
                </div>
              </div>
              <LegendRow color="#881337" label="Épargne" value={formatEuro(totalEpargnes)} pct={totalSortants > 0 ? Math.round((totalEpargnes / totalSortants) * 100) : 0} />
              {resteM1Sortant > 0 && (
                <LegendRow color="#7C3AED" label="Déficit M-1" value={formatEuro(resteM1Sortant)} pct={totalSortants > 0 ? Math.round((resteM1Sortant / totalSortants) * 100) : 0} />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function LegendRow({ color, label, value, pct }: { color: string; label: string; value: string; pct: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style= {{backgroundColor: color}}  />
        <span className="text-xs text-slate-300 truncate">{label}</span>
      </div>
      <div className="text-right flex-shrink-0">
        <span className="text-xs font-semibold text-white">{value}</span>
        <span className="text-xs text-slate-500 ml-1">({pct}%)</span>
      </div>
    </div>
  )
}