'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MonthSelector from '@/components/layout/MonthSelector'
import { useRevenus } from '@/lib/hooks/useRevenus'
import { useChargesFixes } from '@/lib/hooks/useChargesFixes'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { formatEuro, currentMonth, pct } from '@/lib/utils'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip,
} from 'recharts'

// Tu remplaceras par ton propre contexte de compte/mois
export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonth())
  // TODO: Remplacer par le vrai moisId depuis le hook useMois
  const moisId = undefined // à connecter

  const { data: revenus = [] } = useRevenus(moisId)
  const { data: charges = [] } = useChargesFixes(moisId)
  const { data: transactions = [] } = useTransactions(moisId)

  const totalRevenus = revenus.reduce((s, r) => s + Number(r.montant), 0)
  const totalActif = revenus.filter(r => r.type === 'actif').reduce((s, r) => s + Number(r.montant), 0)
  const totalPassif = revenus.filter(r => r.type === 'passif').reduce((s, r) => s + Number(r.montant), 0)
  const totalChargesFixes = charges.reduce((s, c) => s + Number(c.montant), 0)
  const totalChargesPayees = charges.filter(c => c.payee).reduce((s, c) => s + Number(c.montant), 0)
  const totalDepenses = transactions.reduce((s, t) => s + Number(t.montant), 0)
  const totalSortants = totalChargesPayees + totalDepenses
  const resteReel = totalRevenus - totalSortants

  const pieData = [
    { name: 'Charges fixes', value: totalChargesPayees, color: '#8B5CF6' },
    { name: 'Dépenses', value: totalDepenses, color: '#EC4899' },
    { name: 'Reste', value: Math.max(resteReel, 0), color: '#22C55E' },
  ]

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />

      <div className="p-4 space-y-4">
        {/* Cartes résumé */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-emerald-950 border-emerald-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-emerald-400">Entrants</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-emerald-300">{formatEuro(totalRevenus)}</p>
              <p className="text-xs text-emerald-600">
                Actif {formatEuro(totalActif)} ({pct(totalActif, totalRevenus)}%)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-rose-950 border-rose-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-rose-400">Sortants</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-rose-300">{formatEuro(totalSortants)}</p>
              <p className="text-xs text-rose-600">
                Fixes {formatEuro(totalChargesPayees)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-blue-950 border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-400">Reste Réel</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-xl font-bold ${resteReel >= 0 ? 'text-blue-300' : 'text-red-400'}`}>
                {formatEuro(resteReel)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-purple-950 border-purple-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-purple-400">Charges Fixes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-purple-300">{formatEuro(totalChargesFixes)}</p>
              <p className="text-xs text-purple-600">
                Payé {pct(totalChargesPayees, totalChargesFixes)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Graphique camembert */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm">Répartition</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatEuro(value)}
                  contentStyle= backgroundColor: '#1e293b', border: 'none' 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}