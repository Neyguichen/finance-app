'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2 } from 'lucide-react'
import MonthSelector from '@/components/layout/MonthSelector'
import { useCategories } from '@/lib/hooks/useCategories'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { formatEuro, formatDate, pct } from '@/lib/utils'
import { useApp } from '@/components/AppContext'

export default function VariablesPage() {
  const { moisId, month, setMonth, espace } = useApp()
  const espaceId = espace?.id

  const [catOpen, setCatOpen] = useState(false)
  const [txOpen, setTxOpen] = useState(false)
  const [newCatNom, setNewCatNom] = useState('')
  const [newCatIcone, setNewCatIcone] = useState('🛒')

  const { data: categories = [], create: createCat, remove: removeCat } = useCategories(espaceId)
  const { data: budgets = [], upsert: upsertBudget } = useBudgets(moisId)
  const { data: transactions = [], create: createTx, remove: removeTx } = useTransactions(moisId)

  const [txCat, setTxCat] = useState('')
  const [txMontant, setTxMontant] = useState(0)
  const [txInfos, setTxInfos] = useState('')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])

  const getBudget = (catId: string) => budgets.find(b => b.categorie_id === catId)
  const getDepenses = (catId: string) => transactions
    .filter(t => t.categorie_id === catId)
    .reduce((s, t) => s + Number(t.montant), 0)

  const totalPrevu = budgets.reduce((s, b) => s + Number(b.prevu), 0)
  const totalReel = transactions.reduce((s, t) => s + Number(t.montant), 0)

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Variables</h1>
          <div className="flex gap-2">
            <Dialog open={catOpen} onOpenChange={setCatOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Catégorie</Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700">
                <DialogHeader><DialogTitle>Nouvelle catégorie</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Nom (ex: Courses)" value={newCatNom} onChange={e => setNewCatNom(e.target.value)} />
                  <EmojiPicker value={newCatIcone} onChange={setNewCatIcone} />
                  <Button className="w-full" onClick={async () => {
                    if (!newCatNom.trim() || !espaceId) return
                    await createCat.mutateAsync({ espace_id: espaceId, nom: newCatNom.trim(), icone: newCatIcone, couleur: '#8B5CF6', ordre: categories.length })
                    setNewCatNom('')
                    setCatOpen(false)
                  }}>Créer</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={txOpen} onOpenChange={setTxOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" />Dépense</Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700">
                <DialogHeader><DialogTitle>Nouvelle dépense</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <select className="select select-bordered w-full bg-slate-800 border-slate-700"
                    value={txCat} onChange={e => setTxCat(e.target.value)}>
                    <option value="">Catégorie...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icone} {c.nom}</option>)}
                  </select>
                  <Input type="number" step="0.01" placeholder="Montant" value={txMontant || ''} onChange={e => setTxMontant(parseFloat(e.target.value) || 0)} />
                  <Input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} />
                  <Input placeholder="Infos (optionnel)" value={txInfos} onChange={e => setTxInfos(e.target.value)} />
                  <Button className="w-full" onClick={async () => {
                    if (!txCat || !moisId) return
                    await createTx.mutateAsync({ mois_id: moisId, categorie_id: txCat, montant: txMontant, date: txDate, infos: txInfos || null })                    
                    setTxMontant(0)
                    setTxInfos('')
                    setTxOpen(false)
                  }}>Ajouter</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 1. TOTAL EN HAUT */}
        <Card className="bg-pink-950 border-pink-800">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Budget prévu</span>
              <span className="font-bold">{formatEuro(totalPrevu)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Dépensé réel</span>
              <span>{formatEuro(totalReel)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Reste</span>
              <span className={totalPrevu - totalReel >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {formatEuro(totalPrevu - totalReel)}
              </span>
            </div>
            <Progress value={totalPrevu > 0 ? pct(totalReel, totalPrevu) : 0} className="h-2" />
          </CardContent>
        </Card>

        {/* 2. BUDGETS EN GRILLE COMPACTE (3 par ligne) */}
        {categories.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-400 mb-2">Budgets</h2>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(cat => {
                const budget = getBudget(cat.id)
                const depense = getDepenses(cat.id)
                const prevu = budget ? Number(budget.prevu) : 0
                const ratio = prevu > 0 ? pct(depense, prevu) : 0
                const isOver = depense > prevu && prevu > 0
                return (
                  <div key={cat.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-base">{cat.icone}</span>
                        <span className="text-xs font-medium truncate">{cat.nom}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="text-slate-600 h-5 w-5 flex-shrink-0"
                        onClick={() => removeCat.mutate(cat.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-right">
                      <span className={isOver ? 'text-red-400 font-semibold' : 'text-pink-400 font-semibold'}>{formatEuro(depense)}</span>
                      <span className="text-slate-500"> / {formatEuro(prevu)}</span>
                    </div>
                    <Progress value={Math.min(ratio, 100)} className="h-1" />
                    <div className="flex gap-1">
                      <Input
                        type="number" step="0.01"
                        className="h-6 text-xs bg-slate-800 border-slate-700 px-2 flex-1"
                        placeholder="Budget"
                        defaultValue={prevu || ''}
                        id={`budget-${cat.id}`}
                      />
                      <button
                        className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                        onClick={() => {
                          if (!moisId) return
                          const input = document.getElementById(`budget-${cat.id}`) as HTMLInputElement
                          const val = parseFloat(input?.value) || 0
                          upsertBudget.mutate({ mois_id: moisId, categorie_id: cat.id, prevu: val })
                        }}
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 3. LISTE DES DÉPENSES */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 mb-2">Dépenses du mois</h2>
          {transactions.length === 0 && (
            <p className="text-sm text-slate-600 text-center py-4">Aucune dépense ce mois-ci</p>
          )}
          <div className="space-y-2">
            {transactions.map(tx => (
              <Card key={tx.id} className="bg-slate-900 border-slate-800">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span>{tx.categorie?.icone || '📦'}</span>
                    <div>
                      <p className="text-sm font-medium">{tx.categorie?.nom || 'Sans catégorie'}</p>
                      {tx.infos && <p className="text-xs text-slate-500">{tx.infos}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-bold text-pink-400">{formatEuro(Number(tx.montant))}</p>
                      <p className="text-xs text-slate-500">{formatDate(tx.date)}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7"
                      onClick={() => removeTx.mutate(tx.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}