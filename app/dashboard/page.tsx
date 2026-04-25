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
import { useCategories } from '@/lib/hooks/useCategories'
import { useBudgets } from '@/lib/hooks/useBudgets'
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
  const { data: categories = [] } = useCategories(espace?.id)
  const { data: budgets = [] } = useBudgets(moisId)

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
  const totalSortantsAll = totalChargesFixes + totalDepenses + totalEpargnes

  // Reste à vivre — PRÉVU
  // Pour chaque catégorie : max(budget prévu, dépenses réelles)
  const totalVariablesPrevu = categories.reduce((sum, cat) => {
    const budget = budgets.find(b => b.categorie_id === cat.id)
    const prevu = budget ? Number(budget.prevu) : 0
    const depense = transactions
      .filter(t => t.categorie_id === cat.id)
      .reduce((s, t) => s + getMontantNet(t), 0)
    return sum + Math.max(prevu, depense)
  }, 0)

  const restePrevu = totalRevenus - totalChargesFixes - totalVariablesPrevu - totalEpargnes

  // Reste à vivre — RÉEL
  const resteReel = totalRevenus - totalChargesPayees - totalDepenses - totalEpargnes

  const revenusChartData = [
    { name: 'Actif', value: totalActif, color: '#10B981' },       // emerald-500 — vert vif
    { name: 'Passif', value: totalPassif, color: '#6EE7B7' },     // emerald-300 — vert clair
    { name: 'Reprises épargne', value: totalReprises, color: '#064E3B' }, // emerald-900 — vert foncé
  ].filter(d => d.value > 0)

  const sortantsChartData = [
    { name: 'Fixes', value: totalChargesPayees, color: '#E11D48' },    // rose-600 — rose vif (principal)
    { name: 'Variables', value: totalDepenses, color: '#FDA4AF' },      // rose-300 — rose clair
    { name: 'Épargne', value: totalEpargnes, color: '#881337' },        // rose-900 — rose foncé
  ].filter(d => d.value > 0)

  // --- Répartition Catégories ---
  const chargesFixesNonPayees = totalChargesFixes - totalChargesPayees

  // Données par catégorie (ordre alphabétique)
  const catStats = [...categories]
    .sort((a, b) => a.nom.localeCompare(b.nom))
    .map(cat => {
      const budget = budgets.find(b => b.categorie_id === cat.id)
      const prevu = budget ? Number(budget.prevu) : 0
      const depense = transactions
        .filter(t => t.categorie_id === cat.id)
        .reduce((s, t) => s + getMontantNet(t), 0)
      const reste = prevu - depense
      return { id: cat.id, nom: cat.nom, icone: cat.icone, couleur: cat.couleur, prevu, depense, reste }
    })

  // Couleurs pour le donut
  const VIOLET_SHADES = [
    '#8B5CF6', // violet-500
    '#A78BFA', // violet-400
    '#6D28D9', // violet-700
    '#C4B5FD', // violet-300
    '#4C1D95', // violet-900
    '#DDD6FE', // violet-200
  ]
  
  // Construire les données du donut Répartition Catégories
  const repartitionChartData = [
    // 1. Charges fixes non payées
    ...(chargesFixesNonPayees > 0
      ? [{ name: 'Charges fixes', value: chargesFixesNonPayees, color: '#E11D48' }]
      : []),
    // 2. Épargne
    ...(totalEpargnes > 0
      ? [{ name: 'Épargne', value: totalEpargnes, color: '#881337' }]
      : []),
    // 3. Catégories variables — chacune prend un violet différent
    ...catStats.map((cat, i) => ({
      name: `${cat.icone || ''} ${cat.nom}`.trim(),
      value: cat.depense,
      color: VIOLET_SHADES[i % VIOLET_SHADES.length],
    })).filter(d => d.value > 0),
  ]

  const tooltipStyle = { backgroundColor: '#344869', border: 'none' }

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

        <Card className="bg-blue-950 border-blue-800">
          <CardContent className="p-4 space-y-2">
            <h2 className="font-semibold text-blue-400">Reste à vivre</h2>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Prévu</span>
              <span className={restePrevu >= 0 ? 'font-bold text-blue-300' : 'font-bold text-red-400'}>
                {formatEuro(restePrevu)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Réel</span>
              <span className={resteReel >= 0 ? 'font-bold text-emerald-400' : 'font-bold text-red-400'}>
                {formatEuro(resteReel)}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-emerald-950 border-emerald-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-emerald-400">Entrants</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-emerald-400">{formatEuro(totalRevenus)}</p>
              <div className="flex flex-col items-center gap-3">
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
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {revenusChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          const pourcent = totalRevenus > 0 ? Math.round((value / totalRevenus) * 100) : 0
                          return [`${formatEuro(value)} (${pourcent}%)`, name]
                        }}
                        contentStyle={tooltipStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Légende */}
                <div className="space-y-1 w-full">
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
            <p className="text-xl font-bold text-rose-300">
              {formatEuro(totalSortantsAll)}
              <span className="text-sm font-normal text-rose-500 ml-2">
                ({totalRevenus > 0 ? Math.round((totalSortantsAll / totalRevenus) * 100) : 0}% des revenus)
              </span>
            </p>
              <div className="flex flex-col items-center gap-3">
                {/* Donut */}
                <div className="relative w-28 h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sortantsChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {sortantsChartData.map((entry, i) => (
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

                {/* Légende */}
                <div className="space-y-1 w-full">
                  {/* Charges fixes */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-pink-600" />
                      <span className="text-xs text-slate-300">Fixes</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-white">{formatEuro(totalChargesFixes)}</span>
                      <span className="text-xs text-slate-500 ml-1">
                        ({totalSortantsAll > 0 ? Math.round((totalChargesFixes / totalSortantsAll) * 100) : 0}%)
                      </span>
                    </div>
                  </div>

                  {/* Variables */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-pink-300" />
                      <span className="text-xs text-slate-300">Variables</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-white">{formatEuro(totalDepenses)}</span>
                      <span className="text-xs text-slate-500 ml-1">
                        ({totalSortantsAll > 0 ? Math.round((totalDepenses / totalSortantsAll) * 100) : 0}%)
                      </span>
                    </div>
                  </div>

                  {/* Variables — Prévu (hors diagramme) */}
                  <div className="flex items-center justify-between pl-5">
                    <span className="text-xs text-slate-500">Prévu</span>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">{formatEuro(totalVariablesPrevu)}</span>
                      <span className="text-xs text-slate-600 ml-1">
                        ({totalSortantsAll > 0 ? Math.round((totalVariablesPrevu / totalSortantsAll) * 100) : 0}%)
                      </span>
                    </div>
                  </div>

                  {/* Variables — Réel (hors diagramme) */}
                  <div className="flex items-center justify-between pl-5">
                    <span className="text-xs text-slate-500">Réel</span>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">{formatEuro(totalDepenses)}</span>
                      <span className="text-xs text-slate-600 ml-1">
                        ({totalSortantsAll > 0 ? Math.round((totalDepenses / totalSortantsAll) * 100) : 0}%)
                      </span>
                    </div>
                  </div>

                  {/* Épargne */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-pink-900" />
                      <span className="text-xs text-slate-300">Épargne</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-white">{formatEuro(totalEpargnes)}</span>
                      <span className="text-xs text-slate-500 ml-1">
                        ({totalSortantsAll > 0 ? Math.round((totalEpargnes / totalSortantsAll) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Répartition Catégories */}
        <Card className="bg-purple-950 border-purple-800">
          <CardHeader>
            <CardTitle className="text-sm text-purple-400">Répartition Catégories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Donut */}
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={repartitionChartData}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {repartitionChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [formatEuro(value), name]}
                  contentStyle={tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Tableau catégories */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-purple-600 border-b border-purple-800">
                    <th className="text-left py-2 font-medium">Catégorie</th>
                    <th className="text-right py-2 font-medium">Prévu</th>
                    <th className="text-right py-2 font-medium">À Venir</th>
                    <th className="text-right py-2 font-medium">Réel</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Charges fixes */}
                  <tr className="border-b border-purple-900">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-pink-600" />
                        <span className="text-purple-200">Charges fixes</span>
                      </div>
                    </td>
                    <td className="text-right text-purple-200">{formatEuro(totalChargesFixes)}</td>
                    <td className="text-right text-purple-200">{formatEuro(chargesFixesNonPayees)}</td>
                    <td className="text-right text-purple-200">{formatEuro(totalChargesPayees)}</td>
                  </tr>

                  {/* Épargne */}
                  <tr className="border-b border-purple-900">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-pink-900" />
                        <span className="text-purple-200">Épargne</span>
                      </div>
                    </td>
                    <td className="text-right text-purple-600">—</td>
                    <td className="text-right text-purple-600">—</td>
                    <td className="text-right text-purple-200">{formatEuro(totalEpargnes)}</td>
                  </tr>

                  {/* Catégories variables triées alphabétiquement */}
                  {catStats.map(cat => (
                    <tr key={cat.id} className="border-b border-purple-900">
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style= {{backgroundColor: cat.couleur }} />
                          <span className="text-purple-200">{cat.icone} {cat.nom}</span>
                        </div>
                      </td>
                      <td className="text-right text-purple-200">{formatEuro(cat.prevu)}</td>
                      <td className={`text-right ${cat.reste >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatEuro(cat.reste)}
                      </td>
                      <td className="text-right text-purple-200">{formatEuro(cat.depense)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}