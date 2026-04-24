'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import MonthSelector from '@/components/layout/MonthSelector'
import { useCategories } from '@/lib/hooks/useCategories'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { formatEuro, formatDate, pct } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { useApp } from '@/components/AppContext'
import { Progress } from '@/components/ui/progress'

export default function VariablesPage() {
  const { moisId, month, setMonth, espace } = useApp()
  const espaceId = espace?.id
  const [catOpen, setCatOpen] = useState(false)
  const [txOpen, setTxOpen] = useState(false)

  const { data: categories = [], create: createCat, remove: removeCat } = useCategories(espaceId)
  const { data: budgets = [], upsert: upsertBudget } = useBudgets(moisId)
  const { data: transactions = [], create: createTx, remove: removeTx } = useTransactions(moisId)

  // Totaux par catégorie
  const catStats = categories.map(cat => {
    const budget = budgets.find(b => b.categorie_id === cat.id)
    const depenses = transactions
      .filter(t => t.categorie_id === cat.id)
      .reduce((s, t) => s + Number(t.montant), 0)
    return { ...cat, prevu: budget?.prevu || 0, reel: depenses }
  })

  const totalPrevu = catStats.reduce((s, c) => s + Number(c.prevu), 0)
  const totalReel = catStats.reduce((s, c) => s + c.reel, 0)

  // Form catégorie
  const catForm = useForm({ defaultValues: { nom: '', icone: '', couleur: '#8B5CF6' } })
  const onAddCat = async (values: any) => {
    if (!espaceId) return
    await createCat.mutateAsync({
      espace_id: espaceId, nom: values.nom,
      icone: values.icone || null, couleur: values.couleur, ordre: categories.length,
    })
    catForm.reset()
    setCatOpen(false)
  }

  // Form transaction
  const txForm = useForm({ defaultValues: { date: '', categorie_id: '', montant: 0, infos: '' } })
  const onAddTx = async (values: any) => {
    if (!moisId) return
    await createTx.mutateAsync({
      mois_id: moisId, categorie_id: values.categorie_id,
      date: values.date, montant: values.montant, infos: values.infos || null,
    })
    txForm.reset()
    setTxOpen(false)
  }

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />
      <div className="p-4 space-y-4">
        {/* En-tête + boutons */}
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Variables</h1>
          <div className="flex gap-2">
            <Dialog open={catOpen} onOpenChange={setCatOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Catégorie</Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700">
                <DialogHeader><DialogTitle>Nouvelle catégorie</DialogTitle></DialogHeader>
                <form onSubmit={catForm.handleSubmit(onAddCat)} className="space-y-4">
                  <Input placeholder="Nom (ex: Courses)" {...catForm.register('nom', { required: true })} />
                  <Input placeholder="Icône (emoji)" {...catForm.register('icone')} />
                  <Input type="color" {...catForm.register('couleur')} />
                  <Button type="submit" className="w-full">Créer</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={txOpen} onOpenChange={setTxOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" />Dépense</Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700">
                <DialogHeader><DialogTitle>Nouvelle dépense</DialogTitle></DialogHeader>
                <form onSubmit={txForm.handleSubmit(onAddTx)} className="space-y-4">
                  <Input type="date" {...txForm.register('date', { required: true })} />
                  <select
                    className="select select-bordered w-full bg-slate-800 border-slate-700"
                    {...txForm.register('categorie_id', { required: true })}
                  >
                    <option value="">Catégorie...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icone} {c.nom}</option>
                    ))}
                  </select>
                  <Input type="number" step="0.01" placeholder="Montant" {...txForm.register('montant', { valueAsNumber: true })} />
                  <Input placeholder="Infos (ex: Carrefour)" {...txForm.register('infos')} />
                  <Button type="submit" className="w-full">Ajouter</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Totaux */}
        <Card className="bg-rose-950 border-rose-800">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Budget prévu</span>
              <span className="font-bold">{formatEuro(totalPrevu)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Dépensé réel</span>
              <span className="font-bold text-rose-300">{formatEuro(totalReel)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Reste</span>
              <span className={`font-bold ${totalPrevu - totalReel >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatEuro(totalPrevu - totalReel)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* BUDGETS EN GRILLE COMPACTE (2 par ligne) */}
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
                    <div className="flex justify-between text-xs">
                      <span className={isOver ? 'text-red-400 font-semibold' : 'text-pink-400 font-semibold'}>{formatEuro(depense)}</span>
                      <span className="text-slate-500">/ {formatEuro(prevu)}</span>
                    </div>
                    <Progress value={Math.min(ratio, 100)} className="h-1" />
                    <Input
                      type="number" step="0.01"
                      className="h-6 text-xs bg-slate-800 border-slate-700 px-2"
                      placeholder="Budget"
                      defaultValue={prevu || ''}
                      onBlur={e => {
                        if (!moisId) return
                        const val = parseFloat(e.target.value) || 0
                        upsertBudget.mutate({ mois_id: moisId, categorie_id: cat.id, prevu: val })
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Liste des transactions récentes */}
        <h2 className="font-semibold text-sm text-slate-400 mt-4">Dernières dépenses</h2>
        <div className="space-y-2">
          {transactions.slice(0, 20).map((tx) => (
            <Card key={tx.id} className="bg-slate-900 border-slate-800">
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium">{tx.categorie?.nom || 'Sans catégorie'}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(tx.date)}{tx.infos ? ` — ${tx.infos}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-400">{formatEuro(Number(tx.montant))}</span>
                  <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8" onClick={() => removeTx.mutate(tx.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}