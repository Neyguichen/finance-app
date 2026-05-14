'use client'

import { useState } from 'react'
import { useDbUsage } from '@/lib/hooks/useDbUsage'
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
import { useResteM1 } from '@/lib/hooks/useResteM1'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { useYearData } from '@/lib/hooks/useYearData'
import { useApp } from '@/components/AppContext'
import type { Remboursement } from '@/lib/types'
import { formatEuro, pct, getCategoryColor } from '@/lib/utils'
import { Plus, Database, TrendingUp, TrendingDown, Minus, Calendar, Target, Award, ShieldCheck, Info } from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts'

export default function DashboardPage() {
  const { moisId, month, setMonth, espaces, espace, loading, addEspace, removeEspace } = useApp()
  const currentMonth = month
  const [openEspace, setOpenEspace] = useState(false)
  const [newNom, setNewNom] = useState('')
  const [newIcone, setNewIcone] = useState('🏠')
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  const { data: dbUsage } = useDbUsage()
  const { data: revenus = [] } = useRevenus(moisId)
  const { data: charges = [] } = useChargesFixes(moisId)
  const { data: transactions = [] } = useTransactions(moisId)
  const { data: mouvements = [] } = useMouvements(moisId)
  const { data: categories = [] } = useCategories(espace?.id)
  const { data: budgets = [] } = useBudgets(moisId)
  const { data: resteM1 } = useResteM1(espace?.id, month, espace?.solde_initial ?? 0)
  const { data: yearData } = useYearData(espace?.id, month)

  // Calcul du mois précédent côté dashboard (évite le cache périmé)
  const prevMonthData = (() => {
    if (!yearData?.monthlyData) return null
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    return yearData.monthlyData[key] ?? null
  })()

  const getMontantNet = (tx: any) => {
    const rembs = tx.remboursements || []
    const totalRemb = rembs.reduce((s: number, r: any) => s + Number(r.montant), 0)
    return Number(tx.montant) - totalRemb
  }

  // Épargne : épargnes = sorties, reprises = entrées, transferts = neutres
  const totalEpargnes = mouvements
  .filter(m => m.type === 'epargne')
  .reduce((s, m) => s + Number(m.montant), 0)
  const totalReprises = mouvements
  .filter(m => m.type === 'reprise')
  .reduce((s, m) => s + Number(m.montant), 0)

  const totalActif = revenus.filter(r => r.type === 'actif').reduce((s, r) => s + Number(r.montant), 0)
  const totalPassif = revenus.filter(r => r.type === 'passif').reduce((s, r) => s + Number(r.montant), 0)
  const totalRevenus = totalActif + totalPassif + totalReprises

  // Revenus cochés (reçus) uniquement — pour le reste réel
  const totalActifRecu = revenus.filter(r => r.type === 'actif' && r.recu).reduce((s, r) => s + Number(r.montant), 0)
  const totalPassifRecu = revenus.filter(r => r.type === 'passif' && r.recu).reduce((s, r) => s + Number(r.montant), 0)
  const totalRevenusRecus = totalActifRecu + totalPassifRecu + totalReprises

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

  const resteM1Value = resteM1 ?? 0

  const restePrevu = resteM1Value + totalRevenus - totalChargesFixes - totalVariablesPrevu - totalEpargnes

  // Reste à vivre — RÉEL
  const resteReel = resteM1Value + totalRevenusRecus - totalChargesPayees - totalDepenses - totalEpargnes

  const revenusChartData = [
    { name: 'Actif', value: totalActif, color: '#10B981' },       // emerald-500 — vert vif
    { name: 'Passif', value: totalPassif, color: '#6EE7B7' },     // emerald-300 — vert clair
    { name: 'Reprises épargne', value: totalReprises, color: '#064E3B' }, // emerald-900 — vert foncé
  ].filter(d => d.value > 0)

  // Somme brute des budgets prévisionnels (pour affichage)
  const totalVariablesBudget = categories.reduce((sum, cat) => {
    const budget = budgets.find(b => b.categorie_id === cat.id)
    return sum + (budget ? Number(budget.prevu) : 0)
  }, 0)

  // tiret au lieu de zéro
  const fmtOrDash = (v: number) => v === 0 ? '—' : formatEuro(v)

  // Nom de mois en français
  const moisNomFr = (m: string) => {
    const [, mo] = m.split('-').map(Number)
    return ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][mo - 1] || ''
  }

  // Badge d'évolution en %
  const EvoBadge = ({ current, previous, invertColors = false }: { current: number; previous: number | undefined | null; invertColors?: boolean }) => {
    if (previous === undefined || previous === null) return null
    if (previous === 0 && current === 0) return null
    if (previous === 0 && current > 0) return (
      <span className={`inline-flex items-center gap-0.5 text-xs ml-2 ${invertColors ? 'text-red-400' : 'text-emerald-400'}`}>
        <TrendingUp className="w-3 h-3" />nouveau
      </span>
    )
    const pctChange = Math.round(((current - previous) / previous) * 100)
    if (pctChange === 0) return (
      <span className="inline-flex items-center gap-0.5 text-xs text-slate-500 ml-2">
        <Minus className="w-3 h-3" />0%
      </span>
    )
    const isUp = pctChange > 0
    // invertColors : pour les dépenses, "en hausse" = mauvais (rouge), "en baisse" = bon (vert)
    const colorUp = invertColors ? 'text-red-400' : 'text-emerald-400'
    const colorDown = invertColors ? 'text-emerald-400' : 'text-red-400'
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs ml-2 ${isUp ? colorUp : colorDown}`}>
        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isUp ? '+' : ''}{pctChange}%
      </span>
    )
  }

  const sortantsChartData = [
    { name: 'Fixes', value: totalChargesFixes, color: '#E11D48' },    // rose-600 — rose vif (principal)
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
  
  // Construire les données du donut Répartition Catégories
  const repartitionChartData = [
    // 1. Charges fixes
    ...(totalChargesFixes > 0
      ? [{ name: 'Charges fixes', value: totalChargesFixes, color: '#E11D48', icon: '📌' }]
      : []),
    // 2. Épargne
    ...(totalEpargnes > 0
      ? [{ name: 'Épargne', value: totalEpargnes, color: '#881337', icon: '🐷' }]
      : []),
    // 3. Catégories variables — chacune prend un violet différent
    ...catStats.map((cat, i) => ({
      name: cat.nom,
      value: cat.depense,
      color: getCategoryColor(i),
      icon: cat.icone || '📂',
    })).filter(d => d.value > 0),
  ]

  const tooltipStyle = { backgroundColor: '#344869', border: 'none' }

  // ===== INDICATEURS MENSUELS =====

  // Top 3 dépenses du mois
  const top3Depenses = [...transactions]
  .sort((a, b) => getMontantNet(b) - getMontantNet(a))
  .slice(0, 3)

  // Maîtrise des dépenses : dépensé réel vs budget prévu total
  // Inclut TOUTES les dépenses, même celles sans budget
  const tauxMaitrise = totalVariablesBudget > 0
  ? Math.round((totalDepenses / totalVariablesBudget) * 100)
  : null

  // Ratio charges fixes / revenus
  const ratioChargesRevenus = totalRevenus > 0
  ? Math.round((totalChargesFixes / totalRevenus) * 100)
  : null

  // Capacité d'épargne réelle (ce qui reste vraiment après tous les sortants)
  const capaciteEpargne = totalRevenus > 0
  ? Math.round(((totalRevenus - totalSortantsAll) / totalRevenus) * 100)
  : null

  // ===== DONNÉES ANNUELLES POUR LINE CHARTS =====

  const lineChartData = yearData?.monthlyData
  ? Object.entries(yearData.monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mois, data]) => ({
        mois: moisNomFr(mois),
        revenus: Math.round(data.revenus),
        sortants: Math.round(data.charges + data.depenses + data.epargne),
        reste: Math.round(data.revenus - data.charges - data.depenses - data.epargne),
      }))
  : []

  // Catégorie la plus variable (plus grand écart min-max)
  const catPlusVariable = yearData?.catAnnualStats
  ? Object.entries(yearData.catAnnualStats)
      .filter(([, stats]) => stats.total > 0 && stats.max > stats.min)
      .sort(([, a], [, b]) => (b.max - b.min) - (a.max - a.min))[0] ?? null
  : null
  const catPlusVariableInfo = catPlusVariable
  ? catStats.find(c => c.id === catPlusVariable[0])
  : null

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
        {/* bouton ajouter */}
        <div className="flex items-center justify-between">
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
            <h3 className="font-semibold text-blue-400">Reste M-1</h3>
            <div className="flex justify-between text-sm">
            <span className={resteM1Value >= 0 ? 'font-bold text-slate-300' : 'font-bold text-red-400'}>
              {resteM1 !== null && resteM1 !== undefined ? formatEuro(resteM1Value) : '—'}
            </span>
            </div>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="bg-emerald-950 border-emerald-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-emerald-400">Entrants</CardTitle>
            </CardHeader>
            <CardContent>
            <p className="text-xl font-bold text-emerald-400">
              {formatEuro(totalRevenus)}
              <EvoBadge current={totalRevenus} previous={prevMonthData?.revenus} />
            </p>
              {revenusChartData.length > 1 && (
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
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style= {{backgroundColor: d.color}}  />
                          <span className="text-xs text-slate-300 truncate">{d.name}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-semibold text-white">{formatEuro(d.value)}</span>
                          <span className="text-xs text-slate-500 ml-1">
                            ({totalRevenus > 0 ? Math.round((d.value / totalRevenus) * 100) : 0}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              {sortantsChartData.length > 1 && (
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

                    {/* Variables */}
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

                    {/* Variables — Prévu (hors diagramme) */}
                    <div className="flex items-center justify-between gap-2 pl-5">
                      <span className="text-xs text-slate-500">Prévu</span>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 flex-shrink-0">{formatEuro(totalVariablesBudget)}</span>
                        <span className="text-xs text-slate-600 ml-1">
                          ({totalSortantsAll > 0 ? Math.round((totalVariablesBudget / totalSortantsAll) * 100) : 0}%)
                        </span>
                      </div>
                    </div>

                    {/* Épargne */}
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
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Répartition Catégories */}
        <Card className="bg-purple-950 border-purple-800">
          <CardHeader>
            <CardTitle className="text-sm text-purple-400">Répartition Catégories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {repartitionChartData.length > 1 && (
              /* Donut */
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
            )}

            {/* Légende + Tableau catégories */}
            <div className="overflow-x-auto">
            <table className="w-full text-xs table-fixed">
              <thead>
              <tr className="text-purple-600 border-b border-purple-800">
                <th className="text-left py-2 font-medium w-1/3 truncate">Catégorie</th>
                <th className="text-right py-2 font-medium w-1/6">Prévu</th>
                <th className="text-right py-2 font-medium w-1/6">Dépensé</th>
                <th className="text-right py-2 font-medium w-1/6">Reste</th>
                <th className="text-right py-2 font-medium w-1/6">Évol.</th>
              </tr>
              </thead>
              <tbody>
                {/* Charges fixes */}
                <tr className="border-b border-purple-900">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style= {{backgroundColor: '#E11D48'}}  />
                      <span className="text-purple-200 truncate">📌 Charges fixes</span>
                    </div>
                  </td>
                  <td className="text-right text-purple-200">{fmtOrDash(totalChargesFixes)}</td>
                  <td className="text-right text-purple-200">{fmtOrDash(totalChargesPayees)}</td>
                  <td className={`text-right ${chargesFixesNonPayees === 0 ? 'text-purple-600' : chargesFixesNonPayees > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtOrDash(chargesFixesNonPayees)}</td>
                  <td className="text-right">
                    <EvoBadge current={totalChargesFixes} previous={prevMonthData?.charges} invertColors />
                  </td>
                </tr>

                {/* Épargne */}
                <tr className="border-b border-purple-900">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style= {{backgroundColor: '#881337'}}  />
                      <span className="text-purple-200 truncate">💰 Épargne</span>
                    </div>
                  </td>
                  <td className="text-right text-purple-600"></td>
                  <td className="text-right text-purple-200">{fmtOrDash(totalEpargnes)}</td>
                  <td className="text-right text-purple-600"></td>
                  <td className="text-right">
                    <EvoBadge current={totalEpargnes} previous={prevMonthData?.epargne} />
                  </td>
                </tr>

                {/* Catégories variables */}
                {catStats.map((cat, i) => {
                  const chartColor = getCategoryColor(i)
                  return (
                    <tr key={cat.id} className="border-b border-purple-900">
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style= {{backgroundColor: chartColor }} />
                          <span className="text-purple-200 truncate">{cat.icone || '📂'} {cat.nom}</span>
                        </div>
                      </td>
                      <td className="text-right text-purple-200">{fmtOrDash(cat.prevu)}</td>
                      <td className="text-right text-white">{fmtOrDash(cat.depense)}</td>
                      <td className={`text-right ${cat.reste === 0 ? 'text-white' : cat.reste > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtOrDash(cat.reste)}</td>
                      <td className="text-right">
                        <EvoBadge current={cat.depense} previous={prevMonthData?.catDepenses[cat.id]} invertColors />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>

        {/* Indicateurs du mois */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm text-slate-400">Indicateurs du mois</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {/* Ratio charges / revenus */}
              <div className="bg-slate-800 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-slate-500">🏠 Fixes/Rev.</p>
                  <button onClick={() => setActiveTooltip(activeTooltip === 'ratio' ? null : 'ratio')} className="text-slate-600 hover:text-slate-400">
                    <Info className="w-3 h-3" />
                  </button>
                </div>
                <p className={`text-lg font-bold ${ratioChargesRevenus !== null && ratioChargesRevenus <= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {ratioChargesRevenus !== null ? `${ratioChargesRevenus}%` : '—'}
                </p>
              </div>
              {/* Maîtrise dépenses */}
              <div className="bg-slate-800 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-slate-500">🎯 Maîtrise</p>
                  <button onClick={() => setActiveTooltip(activeTooltip === 'maitrise' ? null : 'maitrise')} className="text-slate-600 hover:text-slate-400">
                    <Info className="w-3 h-3" />
                  </button>
                </div>
                <p className={`text-lg font-bold ${tauxMaitrise !== null && tauxMaitrise <= 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tauxMaitrise !== null ? `${tauxMaitrise}%` : '—'}
                </p>
                <p className="text-xs text-slate-600">
                  {formatEuro(totalDepenses)} / {formatEuro(totalVariablesBudget)}
                </p>
              </div>
              {/* Capacité d'épargne réelle */}
              <div className="bg-slate-800 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-slate-500">💪 Capacité d&apos;épargne réelle</p>
                  <button onClick={() => setActiveTooltip(activeTooltip === 'surplus' ? null : 'surplus')} className="text-slate-600 hover:text-slate-400">
                    <Info className="w-3 h-3" />
                  </button>
                </div>
                <p className={`text-lg font-bold ${capaciteEpargne !== null && capaciteEpargne >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {capaciteEpargne !== null ? `${capaciteEpargne}%` : '—'}
                </p>
                <p className={`text-xs ${(totalRevenus - totalSortantsAll) >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                  {formatEuro(totalRevenus - totalSortantsAll)}
                </p>
              </div>
            </div>

            {/* Tooltips explicatifs */}
            {activeTooltip === 'ratio' && (
              <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-2">
                Part des charges fixes dans vos revenus. Idéalement en dessous de 50%.
              </div>
            )}
            {activeTooltip === 'maitrise' && (
              <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-2">
                Dépenses réelles par rapport au budget total prévu. En dessous de 100% = vous êtes dans les clous.
              </div>
            )}
            {activeTooltip === 'surplus' && (
              <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-2">
                Ce qui reste réellement après tous les sortants (charges + variables + épargne), en % des revenus.
              </div>
            )}

            {/* Top 3 dépenses */}
            {top3Depenses.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1.5">🏆 Top 3 dépenses du mois</p>
                <div className="space-y-1">
                  {top3Depenses.map((tx, i) => (
                    <div key={tx.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-2 py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-slate-600">{i + 1}.</span>
                        <span className="text-xs">{(tx as any).categorie?.icone || '📦'}</span>
                        <span className="text-xs text-slate-300 truncate">
                          {(tx as any).infos || (tx as any).categorie?.nom || 'Dépense'}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-pink-400 flex-shrink-0">{formatEuro(getMontantNet(tx))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card Annuelle */}
        {yearData && yearData.nbMonths > 1 && (
          <Card className="bg-amber-950 border-amber-800">
            <CardHeader>
              <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Bilan Annuel {currentMonth?.slice(0, 4)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Résumé */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-900/30 rounded-lg p-3">
                  <p className="text-xs text-amber-500">Total Revenus</p>
                  <p className="text-sm font-bold text-emerald-400">{formatEuro(yearData.annualTotals.revenus)}</p>
                </div>
                <div className="bg-amber-900/30 rounded-lg p-3">
                  <p className="text-xs text-amber-500">Total Dépenses</p>
                  <p className="text-sm font-bold text-rose-400">
                    {formatEuro(yearData.annualTotals.charges + yearData.annualTotals.depenses + yearData.annualTotals.epargne)}
                  </p>
                </div>
                <div className="bg-amber-900/30 rounded-lg p-3">
                  <p className="text-xs text-amber-500">Taux d&apos;épargne</p>
                  <p className={`text-sm font-bold ${yearData.tauxEpargne >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {yearData.tauxEpargne}%
                  </p>
                </div>
                <div className="bg-amber-900/30 rounded-lg p-3">
                  <p className="text-xs text-amber-500">Épargne nette</p>
                  <p className="text-sm font-bold text-teal-400">{formatEuro(yearData.annualTotals.epargne)}</p>
                </div>
              </div>

              {/* Mois extrêmes */}
              <div className="flex gap-3">
                {yearData.moisMaxDepense.mois && (
                  <div className="flex-1 bg-red-900/20 rounded-lg p-2">
                    <p className="text-xs text-red-400">📈 Plus dépensier</p>
                    <p className="text-xs font-bold text-white">
                      {moisNomFr(yearData.moisMaxDepense.mois)} — {formatEuro(yearData.moisMaxDepense.total)}
                    </p>
                  </div>
                )}
                {yearData.moisMinDepense.mois && (
                  <div className="flex-1 bg-emerald-900/20 rounded-lg p-2">
                    <p className="text-xs text-emerald-400">📉 Plus économe</p>
                    <p className="text-xs font-bold text-white">
                      {moisNomFr(yearData.moisMinDepense.mois)} — {formatEuro(yearData.moisMinDepense.total)}
                    </p>
                  </div>
                )}
              </div>

              {/* Courbe Revenus vs Sortants */}
              {lineChartData.length > 1 && (
                <div>
                  <p className="text-xs text-amber-500 mb-2">📈 Revenus vs Sortants</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#78350f" />
                      <XAxis dataKey="mois" tick= {{fontSize: 10, fill: '#d97706'}}  />
                      <YAxis tick= {{fontSize: 10, fill: '#d97706'}}  width={45} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatEuro(v)} />
                      <Line type="monotone" dataKey="revenus" stroke="#10B981" strokeWidth={2} dot= {{r: 3}}  name="Revenus" />
                      <Line type="monotone" dataKey="sortants" stroke="#E11D48" strokeWidth={2} dot= {{r: 3}}  name="Sortants" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Courbe Reste à vivre */}
              {lineChartData.length > 1 && (
                <div>
                  <p className="text-xs text-amber-500 mb-2">💰 Reste à vivre mensuel</p>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#78350f" />
                      <XAxis dataKey="mois" tick= {{fontSize: 10, fill: '#d97706' }} />
                      <YAxis tick= {{fontSize: 10, fill: '#d97706'}}  width={45} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatEuro(v)} />
                      <Line type="monotone" dataKey="reste" stroke="#3B82F6" strokeWidth={2} dot= {{r: 3}}  name="Reste" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Catégorie la plus variable */}
              {catPlusVariableInfo && catPlusVariable && (
                <div className="bg-amber-900/20 rounded-lg p-2">
                  <p className="text-xs text-amber-500">📊 Catégorie la plus variable</p>
                  <p className="text-xs font-bold text-white">
                    {catPlusVariableInfo.icone} {catPlusVariableInfo.nom} — écart de {formatEuro(catPlusVariable[1].max - catPlusVariable[1].min)}
                  </p>
                  <p className="text-xs text-amber-400">
                    Min {formatEuro(catPlusVariable[1].min)} — Max {formatEuro(catPlusVariable[1].max)}
                  </p>
                </div>
              )}

              {/* Tableau par catégorie : Moy / Min / Max */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs table-fixed">
                  <thead>
                    <tr className="text-amber-600 border-b border-amber-800">
                      <th className="text-left py-2 font-medium w-2/5 truncate">Catégorie</th>
                      <th className="text-right py-2 font-medium w-1/5">Total</th>
                      <th className="text-right py-2 font-medium w-1/5">Moy/mois</th>
                      <th className="text-right py-2 font-medium w-1/5">Min — Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Charges fixes annuelles */}
                    <tr className="border-b border-amber-900">
                      <td className="py-2 text-amber-200">📌 Charges fixes</td>
                      <td className="text-right text-amber-200">{formatEuro(yearData.annualTotals.charges)}</td>
                      <td className="text-right text-amber-200">{formatEuro(Math.round(yearData.annualTotals.charges / yearData.nbMonths))}</td>
                      <td className="text-right text-amber-500">—</td>
                    </tr>
                    {/* Épargne annuelle */}
                    <tr className="border-b border-amber-900">
                      <td className="py-2 text-amber-200">💰 Épargne</td>
                      <td className="text-right text-amber-200">{formatEuro(yearData.annualTotals.epargne)}</td>
                      <td className="text-right text-amber-200">{formatEuro(Math.round(yearData.annualTotals.epargne / yearData.nbMonths))}</td>
                      <td className="text-right text-amber-500">—</td>
                    </tr>
                    {/* Catégories variables */}
                    {catStats.map(cat => {
                      const annual = yearData.catAnnualStats[cat.id]
                      if (!annual || annual.total === 0) return null
                      return (
                        <tr key={cat.id} className="border-b border-amber-900">
                          <td className="py-2 text-amber-200 truncate">{cat.icone} {cat.nom}</td>
                          <td className="text-right text-amber-200">{formatEuro(annual.total)}</td>
                          <td className="text-right text-amber-200">{formatEuro(annual.avg)}</td>
                          <td className="text-right text-amber-400 whitespace-nowrap">
                            {formatEuro(annual.min)} — {formatEuro(annual.max)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}