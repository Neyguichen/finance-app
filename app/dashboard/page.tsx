'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import MonthSelector from '@/components/layout/MonthSelector'
import { useRevenus } from '@/lib/hooks/useRevenus'
import { useChargesFixes } from '@/lib/hooks/useChargesFixes'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { useMouvements } from '@/lib/hooks/useEpargne'
import { formatEuro, pct } from '@/lib/utils'
import { useApp } from '@/components/AppContext'
import { Plus, Trash2 } from 'lucide-react'
import type { Remboursement } from '@/lib/types'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts'

export default function DashboardPage() {
  const { moisId, month, setMonth, espaces, espace, loading, addEspace, removeEspace } = useApp()
  const [openEspace, setOpenEspace] = useState(false)
  const [newNom, setNewNom] = useState('')
  const [newIcone, setNewIcone] = useState('🏠')

  const { data: revenus = [] } = useRevenus(moisId)
  const { data: charges = [] } = useChargesFixes(moisId)
  const { data: transactions = [] } = useTransactions(moisId)
  const { data: mouvements = [] } = useMouvements(moisId)

  const getMontantNet = (tx: any) => {
    const rembs = tx.remboursements || []
    const totalRemb = rembs.reduce((s: number, r: any) => s + Number(r.montant), 0)
    return Number(tx.montant) - totalRemb
  }

  // Épargne : alimentations = sorties, reprises = entrées, transferts = neutres
  const totalEpargnes = mouvements
  .filter(m => m.type === 'alimentation')
  .reduce((s, m) => s + Number(m.montant), 0)
  const totalReprises = mouvements
  .filter(m => m.type === 'reprise')
  .reduce((s, m) => s + Number(m.montant), 0)

  const totalActif = revenus.filter(r => r.type === 'actif').reduce((s, r) => s + Number(r.montant), 0)
  const totalPassif = revenus.filter(r => r.type === 'passif').reduce((s, r) => s + Number(r.montant), 0)
  const totalRevenus = totalActif + totalPassif + totalReprises

  const totalChargesFixes = charges.reduce((s, c) => s + Number(c.montant), 0)
  const totalChargesPayees = charges.filter(c => c.payee).reduce((s, c) => s + Number(c.montant), 0)
  const totalDepenses = transactions.reduce((s, t) => s + getMontantNet(t), 0)
  const totalSortants = totalChargesPayees + totalDepenses + totalEpargnes

  const resteReel = totalRevenus - totalSortants

  const revenusChartData = [
    { name: 'Actif', value: totalActif, color: '#10B981' },
    { name: 'Passif', value: totalPassif, color: '#3B82F6' },
    { name: 'Reprises épargne', value: totalReprises, color: '#27c4bf' },
  ].filter(d => d.value > 0)

  const pieData = [
    { name: 'Charges fixes', value: totalChargesPayees, color: '#8B5CF6' },
    { name: 'Dépenses', value: totalDepenses, color: '#EC4899' },
    { name: 'Épargne', value: totalEpargnes, color: '#27c4bf' },
    { name: 'Reste', value: Math.max(resteReel, 0), color: '#22C55E' },
  ]

  const tooltipStyle = { backgroundColor: '#1e293b', border: 'none' }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><span className="loading loading-spinner loading-lg"></span></div>

  // Écran de bienvenue si aucun espace
  if (espaces.length === 0) {
    return (
      <div className="p-6 space-y-4 text-center">
        <h1 className="text-2xl font-bold">Bienvenue !</h1>
        <p className="text-slate-400">Crée ton premier espace pour commencer.</p>
        <div className="max-w-xs mx-auto space-y-3">
          <Input placeholder="Nom (ex: Perso)" value={newNom} onChange={e => setNewNom(e.target.value)} />
          <EmojiPicker value={newIcone} onChange={setNewIcone} />
          <Button className="w-full" onClick={async () => {
            if (!newNom.trim()) return
            await addEspace(newNom.trim(), newIcone || undefined)
            setNewNom('')
          }}>Créer l&apos;espace</Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />

      <div className="p-4 space-y-4">
        {/* Espace actif + bouton ajouter */}
        <div className="flex items-center justify-between">
        {espace && (
          <div className="flex items-center gap-2">
            <span className="text-xl">{espace.icone}</span>
            <span className="font-semibold">{espace.nom}</span>
            {espaces.length > 1 && (
              <button
                onClick={() => {
                  if (confirm(`Supprimer l'espace "${espace.nom}" et toutes ses données ?`)) {
                    removeEspace(espace.id)
                  }
                }}
                className="text-slate-500 hover:text-red-400 ml-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
          <Dialog open={openEspace} onOpenChange={setOpenEspace}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Espace</Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
              <DialogHeader><DialogTitle>Nouvel espace</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Nom (ex: Joint)" value={newNom} onChange={e => setNewNom(e.target.value)} />
                <EmojiPicker value={newIcone} onChange={setNewIcone} />
                <Button className="w-full" onClick={async () => {
                  if (!newNom.trim()) return
                  await addEspace(newNom.trim(), newIcone || undefined)
                  setNewNom('')
                  setNewIcone('\ud83c\udfe0')
                  setOpenEspace(false)
                }}>Créer l&apos;espace</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Cartes résumé */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-emerald-950 border-emerald-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-emerald-400">Entrants</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Donut */}
                <div className="relative w-28 h-28 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {revenusChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Total au centre */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{formatEuro(totalRevenus)}</span>
                  </div>
                </div>

                {/* Légende */}
                <div className="space-y-2 flex-1">
                  {revenusChartData.map(d => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style= {{backgroundColor: d.color}}  />
                        <span className="text-xs text-slate-300">{d.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-white">{formatEuro(d.value)}</span>
                        <span className="text-xs text-slate-500 ml-1">
                          ({totalRevenus > 0 ? Math.round((d.value / totalRevenus) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-rose-950 border-rose-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-rose-400">Sortants</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-rose-300">{formatEuro(totalSortants)}</p>
              {totalEpargnes > 0 && (
                <p className="text-xs text-rose-600">Épargne {formatEuro(totalEpargnes)}</p>
              )}
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
              <p className="text-xs text-purple-600">Payé {pct(totalChargesPayees, totalChargesFixes)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Graphique */}
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
                  contentStyle={tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}