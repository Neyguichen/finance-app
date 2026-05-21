'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro, getCategoryColor } from '@/lib/utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import EvoBadge from '@/components/global/EvoBadge'

interface CatStat {
  id: string; nom: string; icone: string; prevu: number; depense: number
}

interface RepartitionProps {
  totalChargesFixes: number
  totalChargesPayees: number
  totalEpargnes: number
  catStatsMonth: CatStat[]
  prevMonthData: any
}

const tooltipStyle = { backgroundColor: '#344869', border: 'none' }
const fmtOrDash = (v: number) => v === 0 ? '—' : formatEuro(v)

export default function RepartitionCategories({
  totalChargesFixes, totalChargesPayees, totalEpargnes, catStatsMonth, prevMonthData
}: RepartitionProps) {
  const chartData = [
    ...(totalChargesFixes > 0 ? [{ name: 'Charges fixes', value: totalChargesFixes, color: '#E11D48' }] : []),
    ...(totalEpargnes > 0 ? [{ name: 'Épargne', value: totalEpargnes, color: '#881337' }] : []),
    ...catStatsMonth.map((cat, i) => ({
      name: cat.nom, value: cat.depense, color: getCategoryColor(i),
    })).filter(d => d.value > 0),
  ]

  return (
    <Card className="bg-purple-950 border-purple-800">
      <CardHeader>
        <CardTitle className="text-sm text-purple-400">Répartition Catégories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {chartData.length > 1 && (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [formatEuro(value), name]} contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-purple-600 border-b border-purple-800">
                <th className="text-left py-2 font-medium">Catégorie</th>
                <th className="text-right py-2 font-medium whitespace-nowrap pl-2">Dép. / Prévu</th>
                <th className="text-right py-2 font-medium whitespace-nowrap pl-2">vs M-1</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-purple-900">
                <td className="py-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style= {{backgroundColor: '#E11D48'}}  />
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
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style= {{backgroundColor: '#881337'}}  />
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
              {catStatsMonth.map((cat, i) => (
                <tr key={cat.id} className="border-b border-purple-900">
                  <td className="py-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style= {{backgroundColor: getCategoryColor(i)}}  />
                      <span className="text-purple-200 truncate text-xs">{cat.icone || '📂'} {cat.nom}</span>
                    </div>
                  </td>
                  <td className="text-right whitespace-nowrap pl-2">
                    <span className="text-white font-semibold">{fmtOrDash(cat.depense)}</span>
                    {cat.prevu > 0 && <span className="text-purple-400"> / {fmtOrDash(cat.prevu)}</span>}
                  </td>
                  <td className="text-right pl-2">
                    <EvoBadge current={cat.depense} previous={prevMonthData?.catDepenses[cat.id]} invertColors />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}