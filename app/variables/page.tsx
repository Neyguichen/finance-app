'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Pencil, Plus, Trash2, ReceiptText } from 'lucide-react'
import MonthSelector from '@/components/layout/MonthSelector'
import { useCategories } from '@/lib/hooks/useCategories'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { formatEuro, formatDate, pct } from '@/lib/utils'
import { useApp } from '@/components/AppContext'
import { useRemboursements } from '@/lib/hooks/useRemboursements'

export default function VariablesPage() {
  const { moisId, month, setMonth, espace } = useApp()
  const espaceId = espace?.id

  const [catOpen, setCatOpen] = useState(false)
  const [txOpen, setTxOpen] = useState(false)
  const [newCatNom, setNewCatNom] = useState('')
  const [newCatIcone, setNewCatIcone] = useState('🛒')
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; nom: string } | null>(null)

  // Édition dépense
  const [editTx, setEditTx] = useState<any>(null)
  const [editTxMontant, setEditTxMontant] = useState(0)
  const [editTxInfos, setEditTxInfos] = useState('')
  const [editTxDate, setEditTxDate] = useState('')
  const [editTxCat, setEditTxCat] = useState('')

  // Remboursements
  const [rembTx, setRembTx] = useState<any>(null)
  const [newRembMontant, setNewRembMontant] = useState(0)
  const [newRembNote, setNewRembNote] = useState('')
  const [newRembDate, setNewRembDate] = useState(new Date().toISOString().split('T')[0])

  const { data: categories = [], create: createCat, remove: removeCat } = useCategories(espaceId)
  const activeCategories = categories.filter(c => (c as any).actif !== false)
  const { data: budgets = [], upsert: upsertBudget } = useBudgets(moisId)
  const { data: transactions = [], create: createTx, update: updateTx, remove: removeTx } = useTransactions(moisId)
  const { data: remboursements = [], create: createRemb, remove: removeRemb } = useRemboursements(rembTx?.id)

  const [txCat, setTxCat] = useState('')
  const [txMontant, setTxMontant] = useState(0)
  const [txInfos, setTxInfos] = useState('')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])

  const getBudget = (catId: string) => budgets.find(b => b.categorie_id === catId)
  const getDepenses = (catId: string) => transactions
    .filter(t => t.categorie_id === catId)
    .reduce((s, t) => s + getMontantNet(t), 0)
  const getMontantNet = (tx: any) => {
    const rembs = tx.remboursements || []
    const totalRemb = rembs.reduce((s: number, r: any) => s + Number(r.montant), 0)
    return Number(tx.montant) - totalRemb
  }

  const totalPrevu = budgets.reduce((s, b) => s + Number(b.prevu), 0)
  const totalReel = transactions.reduce((s, t) => s + getMontantNet(t), 0)

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
                    {[...categories].sort((a, b) => a.nom.localeCompare(b.nom)).map(c => <option key={c.id} value={c.id}>{c.icone} {c.nom}</option>)}
                  </select>
                  <CalculatorInput value={txMontant} onChange={setTxMontant} placeholder="Montant" />
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
        {activeCategories.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-400 mb-2">Budgets</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {[...activeCategories].sort((a, b) => a.nom.localeCompare(b.nom)).map(cat => {
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
                        onClick={() => setArchiveTarget({ id: cat.id, nom: cat.nom })}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-right">
                      {formatEuro(depense)}
                      <span className="text-slate-500"> / {formatEuro(prevu)}</span>
                    </div>
                    <div className="text-xs text-right">
                      <span className="text-slate-500">Reste </span>
                      <span className={prevu - depense >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                        {formatEuro(prevu - depense)}
                      </span>
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
            {transactions.map(tx => {
              const net = getMontantNet(tx)
              const hasRemb = (tx as any).remboursements?.length > 0
              return (
              <Card key={tx.id} className="bg-slate-900 border-slate-800">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span>{tx.categorie?.icone || '📦'}</span>
                      <div>
                        <p className="text-sm font-medium">{tx.categorie?.nom || 'Sans catégorie'}</p>
                        {tx.infos && <p className="text-xs text-slate-500">{tx.infos}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-bold text-pink-400">{formatEuro(net)}</p>
                        {hasRemb && (
                          <p className="text-xs text-emerald-400 line-through">{formatEuro(Number(tx.montant))}</p>
                        )}
                        <p className="text-xs text-slate-500">{formatDate(tx.date)}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7"
                        onClick={() => {
                          setEditTx(tx)
                          setEditTxMontant(Number(tx.montant))
                          setEditTxInfos(tx.infos || '')
                          setEditTxDate(tx.date)
                          setEditTxCat(tx.categorie_id)
                        }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7"
                        onClick={() => setRembTx(tx)}>
                        <ReceiptText className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7"
                        onClick={() => removeTx.mutate(tx.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              )
            })}
          </div>
        </div>
      </div>

      {/* DIALOG ÉDITION DÉPENSE */}
      <Dialog open={!!editTx} onOpenChange={(v) => { if (!v) setEditTx(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader><DialogTitle>Modifier la d&eacute;pense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <select className="select select-bordered w-full bg-slate-800 border-slate-700"
              value={editTxCat} onChange={e => setEditTxCat(e.target.value)}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icone} {c.nom}</option>)}
            </select>
            <CalculatorInput value={txMontant} onChange={setTxMontant} placeholder="Montant" />
            <Input type="date" value={editTxDate} onChange={e => setEditTxDate(e.target.value)} />
            <Input placeholder="Infos" value={editTxInfos} onChange={e => setEditTxInfos(e.target.value)} />
            <Button className="w-full" onClick={async () => {
              if (!editTx) return
              await updateTx.mutateAsync({ id: editTx.id, montant: editTxMontant, date: editTxDate, infos: editTxInfos || null, categorie_id: editTxCat })
              setEditTx(null)
            }}>Enregistrer</Button>
            <Button className="w-full" variant="ghost" onClick={() => setEditTx(null)}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG REMBOURSEMENTS */}
      <Dialog open={!!rembTx} onOpenChange={(v) => { if (!v) setRembTx(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle>Remboursements — {rembTx?.infos || rembTx?.categorie?.nom || 'Dépense'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-slate-400">
              D&eacute;pense initiale : <span className="text-pink-400 font-bold">{formatEuro(Number(rembTx?.montant || 0))}</span>
            </div>

            {/* Liste des remboursements existants */}
            {remboursements.length > 0 && (
              <div className="space-y-2">
                {remboursements.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-slate-800 rounded-lg p-2">
                    <div>
                      <span className="text-sm text-emerald-400 font-semibold">+{formatEuro(Number(r.montant))}</span>
                      {r.note && <span className="text-xs text-slate-500 ml-2">{r.note}</span>}
                    </div>
                    <Button variant="ghost" size="icon" className="text-slate-500 h-6 w-6"
                      onClick={() => removeRemb.mutate(r.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Ajouter un remboursement */}
            <div className="border-t border-slate-700 pt-3 space-y-3">
              <p className="text-sm font-semibold">Ajouter un remboursement</p>
              <CalculatorInput value={txMontant} onChange={setTxMontant} placeholder="Montant" />
              <Input placeholder="Note (optionnel)" value={newRembNote} onChange={e => setNewRembNote(e.target.value)} />
              <Input type="date" value={newRembDate} onChange={e => setNewRembDate(e.target.value)} />
              <Button className="w-full" onClick={async () => {
                if (!rembTx || !newRembMontant) return
                await createRemb.mutateAsync({
                  transaction_id: rembTx.id,
                  montant: newRembMontant,
                  note: newRembNote || null,
                  date: newRembDate,
                })
                setNewRembMontant(0)
                setNewRembNote('')
              }}>Ajouter</Button>
            </div>

            <Button className="w-full" variant="ghost" onClick={() => setRembTx(null)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG D'ARCHIVAGE */}
      <Dialog open={!!archiveTarget} onOpenChange={(v) => { if (!v) setArchiveTarget(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle>Archiver la cat&eacute;gorie &laquo; {archiveTarget?.nom} &raquo; ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">
            Elle ne sera plus visible sur les prochains mois, mais les budgets et d&eacute;penses existants seront conserv&eacute;s.
          </p>
          <div className="space-y-3 mt-2">
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => {
              if (!archiveTarget) return
              removeCat.mutate(archiveTarget.id)
              setArchiveTarget(null)
            }}>
              Archiver
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => setArchiveTarget(null)}>
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}