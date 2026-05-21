'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro } from '@/lib/utils'
import EvoBadge from '@/components/global/EvoBadge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface YearCatStat {
  total: number
  avg: number
  min: number
  max: number
  nbMois: number
}

interface BilanAnnuelProps {
  annualRevenus: number
  annualCharges: number
  annualDepenses: number
  annualEpargne: number
  annualSolde: number
  avgRevenus: number
  avgCharges: number
  avgDepenses: number
  avgEpargne: number
  nbMonthsRevenus: number
  nbMonthsCharges: number
  nbMonthsDepenses: number
  nbMonthsEpargne: number
  monthlyData: Array<{
    mois: string
    revenus: number
    charges: number
    depenses: number
    epargne: number
    solde: number
  }>
  catAnnualStats: Record<string, YearCatStat>
  categories: Array<{ id: string; nom: string; icone: string }>
  prevYearRevenus?: number
  prevYearCharges?: number
  prevYearDepenses?: number
  prevYearEpargne?: number
}

const moisLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const tooltipStyle = { backgroundColor: '#344869', border: 'none', fontSize: '12px' }

export default function BilanAnnuel({
  annualRevenus, annualCharges, annualDepenses, annualEpargne, annualSolde,
  avgRevenus, avgCharges, avgDepenses, avgEpargne,
  nbMonthsRevenus, nbMonthsCharges, nbMonthsDepenses, nbMonthsEpargne,
  monthlyData, catAnnualStats, categories,
  prevYearRevenus, prevYearCharges, prevYearDepenses, prevYearEpargne
}: BilanAnnuelProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [showCatDetails, setShowCatDetails] = useState(false)

  return (
    <Card className="bg-indigo-950 border-indigo-800">
      <CardHeader>
        <CardTitle className="text-sm text-indigo-400">📊 Bilan Annuel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Résumé */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <SummaryItem label="Revenus" value={annualRevenus} avg={avgRevenus} nbMois={nbMonthsRevenus} color="text-emerald-400" prev={prevYearRevenus} />
          <SummaryItem label="Charges" value={annualCharges} avg={avgCharges} nbMois={nbMonthsCharges} color="text-rose-400" prev={prevYearCharges} invertEvo />
          <SummaryItem label="Variables" value={annualDepenses} avg={avgDepenses} nbMois={nbMonthsDepenses} color="text-pink-400" prev={prevYearDepenses} invertEvo />
          <SummaryItem label="Épargne" value={annualEpargne} avg={avgEpargne} nbMois={nbMonthsEpargne} color="text-amber-400" prev={prevYearEpargne} />
        </div>

        <div className="bg-indigo-900/50 rounded-lg p-3 flex justify-between items-center">
          <span className="text-xs text-indigo-300">Solde annuel</span>
          <span className={`text-lg font-bold ${annualSolde >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatEuro(annualSolde)}
          </span>
        </div>

        {/* Graphique mensuel */}
        <button type="button" onClick={() => setShowDetails(!showDetails)} className="text-xs text-indigo-400 flex items-center gap-1">
          {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Détail mensuel
        </button>

        {showDetails && monthlyData.length > 0 && (
          <div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyData.map((d, i) => ({ ...d, label: moisLabels[i] || d.mois }))}>
                <XAxis dataKey="label" tick= {{fontSize: 10, fill: '#94a3b8'}}  />
                <YAxis tick= {{fontSize: 9, fill: '#64748b'}}  width={45} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => [formatEuro(value), name]}
                  labelFormatter={(label) => `Mois : ${label}`}
                />
                <Bar dataKey="revenus" name="Revenus" fill="#34d399" radius={[2, 2, 0, 0]} />
                <Bar dataKey="charges" name="Charges" fill="#fb7185" radius={[2, 2, 0, 0]} />
                <Bar dataKey="depenses" name="Variables" fill="#f9a8d4" radius={[2, 2, 0, 0]} />
                <Bar dataKey="epargne" name="Épargne" fill="#fbbf24" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Solde mensuel */}
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={monthlyData.map((d, i) => ({ label: moisLabels[i] || d.mois, solde: d.solde }))}>
                <XAxis dataKey="label" tick= {{fontSize: 10, fill: '#94a3b8'}}  />
                <YAxis tick= {{fontSize: 9, fill: '#64748b'}}  width={45} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatEuro(v), 'Solde']} />
                <Bar dataKey="solde" name="Solde" radius={[2, 2, 0, 0]}>
                  {monthlyData.map((d, i) => (
                    <Cell key={i} fill={d.solde >= 0 ? '#34d399' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Catégories annuelles */}
        <button type="button" onClick={() => setShowCatDetails(!showCatDetails)} className="text-xs text-indigo-400 flex items-center gap-1">
          {showCatDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Détail par catégorie
        </button>

        {showCatDetails && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-indigo-500 border-b border-indigo-800">
                  <th className="text-left py-1 font-medium">Catégorie</th>
                  <th className="text-right py-1 font-medium">Total</th>
                  <th className="text-right py-1 font-medium">Moy.</th>
                  <th className="text-right py-1 font-medium">Min</th>
                  <th className="text-right py-1 font-medium">Max</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => {
                  const stats = catAnnualStats[cat.id]
                  if (!stats || stats.total === 0) return null
                  return (
                    <tr key={cat.id} className="border-b border-indigo-900">
                      <td className="py-1.5 text-indigo-200">{cat.icone} {cat.nom}</td>
                      <td className="text-right text-white font-semibold">{formatEuro(stats.total)}</td>
                      <td className="text-right text-slate-400">{formatEuro(stats.avg)}</td>
                      <td className="text-right text-slate-500">{formatEuro(stats.min)}</td>
                      <td className="text-right text-slate-500">{formatEuro(stats.max)}</td>
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

function SummaryItem({ label, value, avg, nbMois, color, prev, invertEvo }: {
  label: string; value: number; avg: number; nbMois: number; color: string; prev?: number; invertEvo?: boolean
}) {
  return (
    <div className="bg-indigo-900/50 rounded-lg p-2">
      <p className="text-indigo-400">{label}</p>
      <p className={`text-base font-bold ${color}`}>{formatEuro(value)}</p>
      <p className="text-indigo-600 text-[10px]">
        Moy : {formatEuro(avg)} ({nbMois} mois)
      </p>
      {prev !== undefined && <EvoBadge current={value} previous={prev} invertColors={invertEvo} />}
    </div>
  )
}