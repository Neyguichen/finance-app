'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Info, Trash2 } from 'lucide-react'
import MonthSelector from '@/components/layout/MonthSelector'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { formatEuro, pct } from '@/lib/utils'
import { useApp } from '@/components/AppContext'
import { useCategories } from '@/lib/hooks/useCategories'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { useRevenus } from '@/lib/hooks/useRevenus'
import { useChargesFixes } from '@/lib/hooks/useChargesFixes'
import { useMouvements } from '@/lib/hooks/useEpargne'
import { useYearData } from '@/lib/hooks/useYearData'
import { useRemboursements } from '@/lib/hooks/useRemboursements'
import { useAdminMoisData } from '@/lib/hooks/useAdminMoisData'

import BudgetCard from '@/components/pages/variables/BudgetCard'
import DepenseCard from '@/components/pages/variables/DepenseCard'
import DepenseForm from '@/components/pages/variables/DepenseForm'
import DepenseEditDialog from '@/components/pages/variables/DepenseEditDialog'
import DepenseDeleteDialog from '@/components/pages/variables/DepenseDeleteDialog'
import SplitDialog from '@/components/pages/variables/SplitDialog'
import ArchiveDialog from '@/components/pages/variables/ArchiveDialog'
import VariablesFab from '@/components/pages/variables/VariablesFab'

export default function VariablesPage() {
  const { moisId, month, setMonth, espace, isAdminViewing } = useApp()
  const espaceId = espace?.id
  const doubleDate = espace?.double_date ?? false

  // Hooks data
  const { data: categories = [], create: createCat, remove: removeCat } = useCategories(espaceId)
  const { data: budgets = [], upsert: upsertBudget } = useBudgets(moisId)
  const { data: transactions = [], allFlat, create: createTx, update: updateTx, remove: removeTx, split, unsplit } = useTransactions(moisId)
  const { data: revenusList = [] } = useRevenus(moisId)
  const { data: chargesList = [] } = useChargesFixes(moisId)
  const { data: mouvementsList = [] } = useMouvements(moisId)
  const { data: yearData } = useYearData(espaceId, month)

  // Admin mode
  const { data: adminData } = useAdminMoisData(month)
  const effectiveCategories = isAdminViewing ? (adminData?.categories || []) : categories
  const effectiveBudgets = isAdminViewing ? (adminData?.budgets || []) : budgets
  const effectiveTransactions = isAdminViewing ? (adminData?.transactions || []) : transactions
  const effectiveAllFlat = isAdminViewing
    ? (adminData?.transactions || []).filter((t: any) => !t.is_split)
    : allFlat
  const effectiveRevenusList = isAdminViewing ? (adminData?.revenus || []) : revenusList
  const effectiveChargesList = isAdminViewing ? (adminData?.charges_fixes || []) : chargesList
  const effectiveMouvementsList = isAdminViewing ? (adminData?.mouvements_epargne || []) : mouvementsList

  // === STATE ===
  const [fabOpen, setFabOpen] = useState(false)
  const [txOpen, setTxOpen] = useState(false)
  const [editTx, setEditTx] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [splitTx, setSplitTx] = useState<any>(null)
  const [rembTx, setRembTx] = useState<any>(null)
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; nom: string } | null>(null)
  const [showBudgetInfo, setShowBudgetInfo] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [newCatNom, setNewCatNom] = useState('')
  const [newCatIcone, setNewCatIcone] = useState('🛒')

  // Remboursements
  const { data: remboursements = [], create: createRemb, remove: removeRemb } = useRemboursements(rembTx?.id)
  const [newRembMontant, setNewRembMontant] = useState(0)
  const [newRembNote, setNewRembNote] = useState('')
  const [newRembDate, setNewRembDate] = useState(new Date().toISOString().split('T')[0])

  // === CATÉGORIES ===
  const parentCategories = effectiveCategories.filter((c: any) => c.actif !== false && !c.parent_id)
  const getSubCats = (parentId: string) =>
    effectiveCategories.filter((c: any) => c.parent_id === parentId && c.actif !== false)
      .sort((a: any, b: any) => a.nom.localeCompare(b.nom))

  // === BUDGETS & DÉPENSES ===
  const getBudgetPrevu = (catId: string) => {
    const b = effectiveBudgets.find((b: any) => b.categorie_id === catId)
    return b ? Number(b.prevu) : 0
  }

  const getMontantNet = (tx: any) => {
    const rembs = tx.remboursements || []
    const totalRemb = rembs.reduce((s: number, r: any) => s + Number(r.montant), 0)
    return Number(tx.montant) - totalRemb
  }

  const getDepenses = (catId: string) => effectiveAllFlat
    .filter((t: any) => t.categorie_id === catId)
    .reduce((s: number, t: any) => s + getMontantNet(t), 0)

  const getSubCatDepenses = (subCatId: string) => effectiveAllFlat
    .filter((t: any) => t.sous_categorie_id === subCatId)
    .reduce((s: number, t: any) => s + getMontantNet(t), 0)

  // === TOTAUX ===
  const totalRevenusVar = effectiveRevenusList.reduce((s: number, r: any) => s + Number(r.montant), 0)
  const totalChargesVar = effectiveChargesList.reduce((s: number, c: any) => s + Number(c.montant), 0)
  const totalEpargneVar = effectiveMouvementsList
    .filter((m: any) => m.type === 'epargne')
    .reduce((s: number, m: any) => s + Number(m.montant), 0)
  const budgetDisponible = totalRevenusVar - totalChargesVar - totalEpargneVar
  const totalPrevu = effectiveBudgets.reduce((s: number, b: any) => s + Number(b.prevu), 0)
  const totalReel = effectiveAllFlat.reduce((s: number, t: any) => s + getMontantNet(t), 0)

  // Catégories avec/sans activité
  const categoriesAvecActivite = parentCategories.filter((cat: any) => {
    const subCats = getSubCats(cat.id)
    const prevu = subCats.length > 0
      ? subCats.reduce((s: number, sc: any) => s + getBudgetPrevu(sc.id), 0)
      : getBudgetPrevu(cat.id)
    return prevu > 0 || getDepenses(cat.id) > 0
  })
  const categoriesSansActivite = parentCategories.filter((cat: any) => {
    const subCats = getSubCats(cat.id)
    const prevu = subCats.length > 0
      ? subCats.reduce((s: number, sc: any) => s + getBudgetPrevu(sc.id), 0)
      : getBudgetPrevu(cat.id)
    return prevu === 0 && getDepenses(cat.id) === 0
  })

  // === HANDLERS ===
  const handleCreateTx = async (data: any) => {
    if (isAdminViewing || !moisId) return
    await createTx.mutateAsync({ mois_id: moisId, ...data })
  }

  const handleCreateSplit = async (data: any, lines: any[]) => {
    if (isAdminViewing || !moisId) return
    const parent = await createTx.mutateAsync({ mois_id: moisId, ...data })
    await split.mutateAsync({ parentId: parent.id, lines })
  }

  const handleSaveTx = async (data: any) => {
    if (isAdminViewing) return
    await updateTx.mutateAsync(data)
  }

  const handleDeleteTx = (id: string) => {
    if (isAdminViewing) return
    removeTx.mutate(id)
  }

  const handleSplit = async (parentId: string, lines: any[]) => {
    await split.mutateAsync({ parentId, lines })
  }

  const handleUnsplit = (tx: any) => {
    unsplit.mutate(tx.id)
  }

  const handleArchive = (id: string) => {
    if (isAdminViewing) return
    removeCat.mutate(id)
  }

  const handleUpsertBudget = (catId: string, prevu: number) => {
    if (isAdminViewing || !moisId) return
    upsertBudget.mutate({ mois_id: moisId, categorie_id: catId, prevu })
  }

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />

      <div className="p-4 space-y-4 pb-24">
        <h1 className="text-xl font-bold">Variables</h1>

        {/* 1. RÉSUMÉ */}
        <Card className="bg-pink-950 border-pink-800">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-pink-300">Budget disponible</span>
                <button onClick={() => setShowBudgetInfo(!showBudgetInfo)} className="text-slate-500 hover:text-slate-300">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className={`font-bold ${budgetDisponible >= 0 ? 'text-pink-300' : 'text-red-400'}`}>
                {formatEuro(budgetDisponible)}
              </span>
            </div>
            {showBudgetInfo && (
              <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-2">
                Revenus ({formatEuro(totalRevenusVar)}) − Charges fixes ({formatEuro(totalChargesVar)}) − Épargne ({formatEuro(totalEpargneVar)}) = Montant à répartir dans vos catégories
              </div>
            )}
            <div className="border-t border-pink-900 pt-2" />
            <div className="flex justify-between">
              <span className="font-semibold">Budget prévu</span>
              <span className="font-bold">{formatEuro(totalPrevu)}</span>
            </div>
            {totalPrevu > budgetDisponible && budgetDisponible > 0 && (
              <p className="text-xs text-amber-400">⚠️ Budget prévu supérieur au disponible ({formatEuro(totalPrevu - budgetDisponible)} de dépassement)</p>
            )}
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

        {/* 2. BUDGETS EN GRILLE */}
        {parentCategories.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-400 mb-2">Catégories utilisées</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {Array.from(categoriesAvecActivite).sort((a: any, b: any) => a.nom.localeCompare(b.nom)).map((cat: any) => {
                const subCats = getSubCats(cat.id)
                const depense = getDepenses(cat.id)
                const subCatBudgets = subCats.map((sc: any) => ({
                  id: sc.id, nom: sc.nom, icone: sc.icone,
                  prevu: getBudgetPrevu(sc.id), depense: getSubCatDepenses(sc.id),
                }))
                return (
                  <BudgetCard key={cat.id} cat={cat} prevu={getBudgetPrevu(cat.id)} depense={depense}
                    avgMois={yearData?.catAnnualStats?.[cat.id]?.avg} readOnly={isAdminViewing}
                    subCats={subCatBudgets} onUpsertBudget={handleUpsertBudget} onArchive={setArchiveTarget} />
                )
              })}
            </div>

            {categoriesSansActivite.length > 0 && (
              <div className="mt-2">
                <button onClick={() => setShowInactive(!showInactive)}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                  {showInactive ? '▼' : '▶'} Autres catégories ({categoriesSansActivite.length})
                </button>
                {showInactive && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    {Array.from(categoriesSansActivite).sort((a: any, b: any) => a.nom.localeCompare(b.nom)).map((cat: any) => {
                      const subCats = getSubCats(cat.id)
                      const subCatBudgets = subCats.map((sc: any) => ({
                        id: sc.id, nom: sc.nom, icone: sc.icone,
                        prevu: getBudgetPrevu(sc.id), depense: getSubCatDepenses(sc.id),
                      }))
                      return (
                        <BudgetCard key={cat.id} cat={cat} prevu={getBudgetPrevu(cat.id)} depense={0}
                          inactive readOnly={isAdminViewing} subCats={subCatBudgets}
                          onUpsertBudget={handleUpsertBudget} onArchive={setArchiveTarget} />
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. LISTE DES DÉPENSES */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 mb-2">Dépenses du mois</h2>
          {effectiveTransactions.length === 0 && (
            <p className="text-sm text-slate-600 text-center py-4">Aucune dépense ce mois-ci</p>
          )}
          <div className="space-y-2">
            {effectiveTransactions.map((tx: any) => (
              <DepenseCard key={tx.id} tx={tx} readOnly={isAdminViewing} doubleDate={doubleDate}
                getMontantNet={getMontantNet} onEdit={setEditTx} onDelete={setDeleteTarget} />
            ))}
          </div>
        </div>
      </div>

      {/* === DIALOGS === */}

      {/* Nouvelle dépense (avec mode split intégré) */}
      <DepenseForm open={txOpen} onOpenChange={setTxOpen} categories={effectiveCategories}
        espaceId={espaceId} createCat={createCat} doubleDate={doubleDate}
        onSubmit={handleCreateTx} onSubmitSplit={handleCreateSplit} />

      {/* Édition dépense (remb + split à l'intérieur) */}
      <DepenseEditDialog editTx={editTx} onClose={() => setEditTx(null)} categories={effectiveCategories}
        espaceId={espaceId} createCat={createCat} doubleDate={doubleDate} onSave={handleSaveTx}
        onRemb={(tx: any) => { setEditTx(null); setRembTx(tx) }}
        onSplit={(tx: any) => { setEditTx(null); setSplitTx(tx) }}
        onUnsplit={(tx: any) => { handleUnsplit(tx); setEditTx(null) }} />

      {/* Confirmation suppression */}
      <DepenseDeleteDialog target={deleteTarget} onClose={() => setDeleteTarget(null)}
        onDelete={(id: string) => { handleDeleteTx(id); setDeleteTarget(null) }} />

      {/* Split dialog */}
      <SplitDialog tx={splitTx} onClose={() => setSplitTx(null)} categories={effectiveCategories}
        espaceId={espaceId} createCat={createCat} onSave={handleSplit} />

      {/* Archive catégorie */}
      <ArchiveDialog target={archiveTarget} onClose={() => setArchiveTarget(null)} onArchive={handleArchive} />

      {/* Nouvelle catégorie */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader><DialogTitle>➕ Nouvelle catégorie</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nom (ex: Courses)" value={newCatNom} onChange={e => setNewCatNom(e.target.value)} />
            <EmojiPicker value={newCatIcone} onChange={setNewCatIcone} />
            <Button className="w-full" onClick={async () => {
              if (isAdminViewing || !newCatNom.trim() || !espaceId) return
              await createCat.mutateAsync({ espace_id: espaceId, nom: newCatNom.trim(), icone: newCatIcone, couleur: '#8B5CF6', ordre: effectiveCategories.length })
              setNewCatNom(''); setNewCatIcone('🛒'); setCatOpen(false)
            }}>Créer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remboursements */}
      <Dialog open={!!rembTx} onOpenChange={(v) => { if (!v) setRembTx(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle>Remboursements — {rembTx?.infos || rembTx?.categorie?.nom || 'Dépense'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-slate-400">
              Dépense initiale : <span className="text-pink-400 font-bold">{formatEuro(Number(rembTx?.montant || 0))}</span>
            </div>
            {remboursements.length > 0 && (
              <div className="space-y-2">
                {remboursements.map((r: any) => (
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
            <div className="border-t border-slate-700 pt-3 space-y-3">
              <p className="text-sm font-semibold">Ajouter un remboursement</p>
              <CalculatorInput value={newRembMontant} onChange={setNewRembMontant} placeholder="Montant" />
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
                setNewRembMontant(0); setNewRembNote('')
              }}>Ajouter</Button>
            </div>
            <Button className="w-full" variant="ghost" onClick={() => setRembTx(null)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FAB */}
      {!isAdminViewing && (
        <VariablesFab open={fabOpen} onToggle={() => setFabOpen(!fabOpen)}
          onBudget={() => { setFabOpen(false); setCatOpen(true) }}
          onDepense={() => { setFabOpen(false); setTxOpen(true) }} />
      )}
    </div>
  )
}