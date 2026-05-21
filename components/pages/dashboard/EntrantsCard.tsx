'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface ChartEntry { name: string; value: number; color: string }

interface Props {
  totalEntrants: number
  chartData: ChartEntry[]
}

const tooltipStyle = { backgroundColor: '#344869', border: 'none' }

export default function EntrantsCard({ totalEntrants, chartData }: Props) {
  return (
    <Card className="bg-emerald-950 border-emerald-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-emerald-400">Entrants</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-bold text-emerald-400">
          {formatEuro(totalEntrants)}
        </p>
        {chartData.length > 1 && (
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-28 h-28 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                    {chartData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const pourcent = totalEntrants > 0 ? Math.round((value / totalEntrants) * 100) : 0
                      return [`${formatEuro(value)} (${pourcent}%)`, name]
                    }}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 w-full">
              {chartData.map((d: any) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style= {{backgroundColor: d.color}} />
                    <span className="text-xs text-slate-300 truncate">{d.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-semibold text-white">{formatEuro(d.value)}</span>
                    <span className="text-xs text-slate-500 ml-1">
                      ({totalEntrants > 0 ? Math.round((d.value / totalEntrants) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}