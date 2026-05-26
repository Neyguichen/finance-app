'use client'

import { useState } from 'react'
import MonthSelector from '@/components/layout/MonthSelector'
import { useCategories } from '@/lib/hooks/useCategories'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { useRevenus } from '@/lib/hooks/useRevenus'
import { useChargesFixes as useChargesFixesData } from '@/lib/hooks/useChargesFixes'
import { useMouvements } from '@/lib/hooks/useEpargne'
import { useYearData } from '@/lib/hooks/useYearData'
import { useResteM1 } from '@/lib/hooks/useResteM1'
import { useApp } from '@/components/AppContext'
import { useAdminMoisData } from '@/lib/hooks/useAdminMoisData'

import VariablesResume from '@/components/pages/variables/VariablesResume'
import BudgetCard from '@/components/pages/variables/BudgetCard'
import DepenseCard from '@/components/pages/variables/DepenseCard'
import DepenseForm from '@/components/pages/variables/DepenseForm'
import DepenseEditDialog from '@/components/pages/variables/DepenseEditDialog'
import DepenseDeleteDialog from '@/components/pages/variables/DepenseDeleteDialog'
import RemboursementDialog from '@/components/pages/variables/RemboursementDialog'
import CategorieDialog from '@/components/pages/variables/CategorieDialog'
import ArchiveDialog from '@/components/pages/variables/ArchiveDialog'
import VariablesFab from '@/components/pages/variables/VariablesFab'
import SplitDialog from '@/components/pages/variables/SplitDialog'

export default function VariablesPage() {
  const { moisId, month, setMonth, espace, isAdminViewing } = useApp()
  const espaceId = espace?.id
  const doubleDate = !!espace?.double_date
  const [splitTx, setSplitTx] = useState<any>(null)

  const { data: categories = [], create: createCat, remove: removeCat } = useCategories(espaceId)
  const { data: budgets = [], upsert: upsertBudget } = useBudgets(moisId)
  const { data: transactions = [], allFlat, create: createTx, update: updateTx, remove: removeTx, split, unsplit } = useTransactions(moisId)
  const { data: revenusList = [] } = useRevenus(moisId)
  const { data: chargesList = [] } = useChargesFixesData(moisId)
  const { data: mouvementsList = [] } = useMouvements(moisId)
  const { data: yearData } = useYearData(espaceId, month)
  const { data: resteM1 } = useResteM1(espaceId, month, espace?.solde_initial ?? 0)
  const { data: adminData } = useAdminMoisData(month)

  const effectiveCategories = isAdminViewing ? (adminData?.categories || []) : categories
  const effectiveBudgets = isAdminViewing ? (adminData?.budgets || []) : budgets
  const effectiveTransactions = isAdminViewing ? (adminData?.transactions || []) : transactions
  const effectiveTransactionsFlat = isAdminViewing ? (adminData?.transactions || []) : allFlat
  const effectiveRevenusList = isAdminViewing ? (adminData?.revenus || []) : revenusList
  const effectiveChargesList = isAdminViewing ? (adminData?.charges_fixes || []) : chargesList
  const effectiveMouvementsList = isAdminViewing ? (adminData?.mouvements_epargne || []) : mouvementsList

  const activeCategories = effectiveCategories.filter((c: any) => c.actif !== false && !c.parent_id)
  const getBudget = (catId: string) => {
    const subs = effectiveCategories.filter((c: any) => c.parent_id === catId && c.actif !== false)
    if (subs.length > 0) {
      // Catégorie avec sous-cat : budget = somme des budgets sous-cat
      const total = subs.reduce((s: number, sc: any) => {
        const b = effectiveBudgets.find((b: any) => b.categorie_id === sc.id)
        return s + (b ? Number(b.prevu) : 0)
      }, 0)
      return total > 0 ? { prevu: total } : null
    }
    return effectiveBudgets.find((b: any) => b.categorie_id === catId)
  }
  const getDepenses = (catId: string) => effectiveTransactionsFlat
    .filter((t: any) => t.categorie_id === catId)
    .reduce((s: number, t: any) => s + getMontantNet(t), 0)
  const getMontantNet = (tx: any) => {
    const rembs = tx.remboursements || []
    return Number(tx.montant) - rembs.reduce((s: number, r: any) => s + Number(r.montant), 0)
  }

  const getSubCatBudgets = (parentId: string) => {
    const subs = effectiveCategories.filter((c: any) => c.parent_id === parentId && c.actif !== false)
    if (subs.length === 0) return []
    return subs
      .sort((a: any, b: any) => a.nom.localeCompare(b.nom))
      .map((sc: any) => {
        const budget = effectiveBudgets.find((b: any) => b.categorie_id === sc.id)
        const dep = effectiveTransactionsFlat
          .filter((t: any) => t.sous_categorie_id === sc.id)
          .reduce((s: number, t: any) => s + getMontantNet(t), 0)
        return {
          id: sc.id,
          nom: sc.nom,
          icone: sc.icone,
          prevu: budget ? Number(budget.prevu) : 0,
          depense: dep,
        }
      })
  }

  const categoriesAvecActivite = activeCategories.filter((cat: any) => {
    const prevu = getBudget(cat.id) ? Number(getBudget(cat.id).prevu) : 0
    return prevu > 0 || getDepenses(cat.id) > 0
  })
  const categoriesSansActivite = activeCategories.filter((cat: any) => {
    const prevu = getBudget(cat.id) ? Number(getBudget(cat.id).prevu) : 0
    return prevu === 0 && getDepenses(cat.id) === 0
  })

  const totalRevenusVar = effectiveRevenusList.reduce((s: number, r: any) => s + Number(r.montant), 0)
  const totalChargesVar = effectiveChargesList.reduce((s: number, c: any) => s + Number(c.montant), 0)
  const totalEpargneVar = effectiveMouvementsList.filter((m: any) => m.type === 'epargne').reduce((s: number, m: any) => s + Number(m.montant), 0)
  const totalReprisesVar = effectiveMouvementsList.filter((m: any) => m.type === 'reprise').reduce((s: number, m: any) => s + Number(m.montant), 0)
  const resteM1Value = resteM1 ?? 0
  const budgetDisponible = resteM1Value + totalRevenusVar + totalReprisesVar - totalChargesVar - totalEpargneVar
  const totalPrevu = activeCategories.reduce((s: number, cat: any) => {
    const subs = effectiveCategories.filter((c: any) => c.parent_id === cat.id && c.actif !== false)
    if (subs.length > 0) {
      // Somme des budgets sous-cat
      return s + subs.reduce((ss: number, sc: any) => {
        const b = effectiveBudgets.find((b: any) => b.categorie_id === sc.id)
        return ss + (b ? Number(b.prevu) : 0)
      }, 0)
    }
    const b = effectiveBudgets.find((b: any) => b.categorie_id === cat.id)
    return s + (b ? Number(b.prevu) : 0)
  }, 0)
  const totalReel = effectiveTransactionsFlat.reduce((s: number, t: any) => s + getMontantNet(t), 0)

  const [fabOpen, setFabOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [txOpen, setTxOpen] = useState(false)
  const [editTx, setEditTx] = useState<any>(null)
  const [deleteTxTarget, setDeleteTxTarget] = useState<any>(null)
  const [rembTx, setRembTx] = useState<any>(null)
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; nom: string } | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />
      <div className="p-4 space-y-4 pb-24">
        <h1 className="text-xl font-bold">Variables</h1>

        <VariablesResume budgetDisponible={budgetDisponible} totalPrevu={totalPrevu} totalReel={totalReel}
          resteM1Value={resteM1Value} totalRevenusVar={totalRevenusVar} totalReprisesVar={totalReprisesVar}
          totalChargesVar={totalChargesVar} totalEpargneVar={totalEpargneVar} />

        {/* Budgets grid */}
        {activeCategories.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-400 mb-2">Budgets</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {[...categoriesAvecActivite].sort((a: any, b: any) => a.nom.localeCompare(b.nom)).map((cat: any) => (
                <BudgetCard key={cat.id} cat={cat} prevu={getBudget(cat.id) ? Number(getBudget(cat.id).prevu) : 0}
                  depense={getDepenses(cat.id)} avgMois={yearData?.catAnnualStats[cat.id]?.avg}
                  readOnly={isAdminViewing}
                  subCats={getSubCatBudgets(cat.id)}
                  onUpsertBudget={(catId, prevu) => { if (moisId) upsertBudget.mutate({ mois_id: moisId, categorie_id: catId, prevu }) }}
                  onArchive={setArchiveTarget} />
              ))}
            </div>
            {categoriesSansActivite.length > 0 && (
              <div className="mt-2">
                <button onClick={() => setShowInactive(!showInactive)}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                  {showInactive ? '▼' : '▶'} Autres budgets ({categoriesSansActivite.length})
                </button>
                {showInactive && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    {[...categoriesSansActivite].sort((a: any, b: any) => a.nom.localeCompare(b.nom)).map((cat: any) => (
                      <BudgetCard key={cat.id} cat={cat} prevu={getBudget(cat.id) ? Number(getBudget(cat.id).prevu) : 0}
                        depense={0} avgMois={yearData?.catAnnualStats[cat.id]?.avg} inactive
                        readOnly={isAdminViewing}
                        subCats={getSubCatBudgets(cat.id)}
                        onUpsertBudget={(catId, prevu) => { if (moisId) upsertBudget.mutate({ mois_id: moisId, categorie_id: catId, prevu }) }}
                        onArchive={setArchiveTarget} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Dépenses */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 mb-2">Dépenses du mois</h2>
          {effectiveTransactions.length === 0 && (
            <p className="text-sm text-slate-600 text-center py-4">Aucune dépense ce mois-ci</p>
          )}
          <div className="space-y-2">
            {effectiveTransactions.map((tx: any) => (
              <DepenseCard key={tx.id} tx={tx} readOnly={isAdminViewing} doubleDate={doubleDate} getMontantNet={getMontantNet}
                onEdit={setEditTx} onDelete={setDeleteTxTarget} />
            ))}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <SplitDialog tx={splitTx} onClose={() => setSplitTx(null)}
        categories={effectiveCategories}
        onSave={async (parentId, lines) => {
          await split.mutateAsync({ parentId, lines })
        }} 
      />

      <CategorieDialog open={catOpen} onOpenChange={setCatOpen}
        categories={effectiveCategories}
        onCreate={async ({ nom, icone, parent_id }) => {
          if (isAdminViewing || !espaceId) return
          await createCat.mutateAsync({
            espace_id: espaceId, nom, icone, couleur: '#8B5CF6',
            ordre: effectiveCategories.length,
            ...(parent_id ? { parent_id } : {}),
          })
        }} 
      />
      <DepenseForm open={txOpen} onOpenChange={setTxOpen} doubleDate={doubleDate}
        categories={effectiveCategories} espaceId={espaceId} createCat={createCat}
        onSubmit={async (data) => {
          if (isAdminViewing || !moisId) return
          await createTx.mutateAsync({ mois_id: moisId, ...data })
        }}
        onSubmitSplit={async (parentData, lines) => {
          if (isAdminViewing || !moisId) return
          const parent = await createTx.mutateAsync({ mois_id: moisId, ...parentData })
          await split.mutateAsync({ parentId: parent.id, lines })
        }}
      />
      <DepenseEditDialog editTx={editTx} onClose={() => setEditTx(null)} categories={effectiveCategories} espaceId={espaceId} createCat={createCat}
        onSave={async (data) => {
          if (isAdminViewing) return
          await updateTx.mutateAsync(data)
        }} doubleDate={doubleDate}
        onRemb={(tx) => { setEditTx(null); setRembTx(tx) }}
        onSplit={(tx) => { setEditTx(null); setSplitTx(tx) }}
        onUnsplit={(tx) => { unsplit.mutate(tx.id); setEditTx(null) }}
      />
      <DepenseDeleteDialog target={deleteTxTarget} onClose={() => setDeleteTxTarget(null)}
        onDelete={(id) => removeTx.mutate(id)} />
      <RemboursementDialog tx={rembTx} onClose={() => setRembTx(null)} />
      <ArchiveDialog target={archiveTarget} onClose={() => setArchiveTarget(null)}
        onArchive={(id) => removeCat.mutate(id)} />

      {/* FAB */}
      {!isAdminViewing && (
        <VariablesFab open={fabOpen} onToggle={() => setFabOpen(!fabOpen)}
          onBudget={() => { setFabOpen(false); setCatOpen(true) }}
          onDepense={() => { setFabOpen(false); setTxOpen(true) }} />
      )}
    </div>
  )
}