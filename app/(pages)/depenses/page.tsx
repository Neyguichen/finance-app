'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/components/AppContext'
import MonthSelector from '@/components/layout/MonthSelector'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarClock, Pencil, ReceiptText } from 'lucide-react'
import { formatDate, formatEuro } from '@/lib/utils'
import { useCategories } from '@/lib/hooks/useCategories'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { useChargesFixes, useChargesFixesRecurrentes } from '@/lib/hooks/useChargesFixes'
import { useAdminMoisData } from '@/lib/hooks/useAdminMoisData'
import ChargeFixeCard from '@/components/pages/charges-fixes/ChargeFixeCard'
import BudgetCard from '@/components/pages/variables/BudgetCard'
import DepenseCard from '@/components/pages/variables/DepenseCard'
import DepenseForm from '@/components/pages/variables/DepenseForm'
import DepenseEditDialog from '@/components/pages/variables/DepenseEditDialog'
import DepenseDeleteDialog from '@/components/pages/variables/DepenseDeleteDialog'
import ChargeFixeForm from '@/components/pages/charges-fixes/ChargeFixeForm'
import { ChargeFixeEditDialog, ChargeFixeDeleteDialog, ChargeFixeScopeDialog } from '@/components/pages/charges-fixes/ChargeFixeDialogs'
import SplitDialog from '@/components/pages/variables/SplitDialog'
import { useRemboursements } from '@/lib/hooks/useRemboursements'
import ArchiveDialog from '@/components/pages/variables/ArchiveDialog'
import RemboursementDialog from '@/components/pages/variables/RemboursementDialog'
import { summarizeAnalyticalExpenses } from '@/lib/expense-summary'
import EmptyStateV2 from '@/components/ui/EmptyStateV2'
import DepensesFab from '@/components/pages/depenses/DepensesFab'

export default function DepensesPage() {
  const { moisId, month, setMonth, espace, isAdminViewing } = useApp()
  const [view, setView] = useState<'planned' | 'actual'>('planned')
  const [actualFilter, setActualFilter] = useState<'all' | 'fixed' | 'variable'>('all')
  const [txOpen, setTxOpen] = useState(false)
  const [editTx, setEditTx] = useState<any>(null)
  const [deleteTx, setDeleteTx] = useState<any>(null)
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; nom: string } | null>(null)
  const [fixedOpen, setFixedOpen] = useState(false)
  const [editFixed, setEditFixed] = useState<any>(null)

  useEffect(() => {
    if (isAdminViewing || !moisId) return
    const add = new URLSearchParams(window.location.search).get('add')
    if (add === 'fixed') setFixedOpen(true)
    if (add === 'variable') setTxOpen(true)
  }, [isAdminViewing, moisId])
  const [deleteFixed, setDeleteFixed] = useState<any>(null)
  const [scopeFixed, setScopeFixed] = useState<any>(null)
  const [splitTx, setSplitTx] = useState<any>(null)
  const [rembTx, setRembTx] = useState<any>(null)
  const { data: categories = [], create: createCat, remove: archiveCat } = useCategories(espace?.id)
  const { data: budgets = [], upsert: upsertBudget } = useBudgets(moisId)
  const { data: transactions = [], allFlat, create: createTx, update: updateTx, remove: removeTx, split, unsplit } = useTransactions(moisId)
  const { data: charges = [], togglePayee, create: createFixed, update: updateFixed, remove: removeFixed, removeDefinitif } = useChargesFixes(moisId)
  const { create: createFixedRecurring, update: updateFixedRecurring } = useChargesFixesRecurrentes(espace?.id)
  const { data: adminData } = useAdminMoisData(month)
  const { data: remboursements = [], create: createRemb, remove: removeRemb } = useRemboursements(rembTx?.id)

  const effectiveCategories: any[] = isAdminViewing ? (adminData?.categories || []) : categories
  const effectiveBudgets: any[] = isAdminViewing ? (adminData?.budgets || []) : budgets
  const effectiveTransactions: any[] = isAdminViewing ? (adminData?.transactions || []) : transactions
  const effectiveFlat: any[] = isAdminViewing ? (adminData?.transactions || []).filter((t: any) => !t.is_split) : allFlat
  const effectiveCharges: any[] = (isAdminViewing ? (adminData?.charges_fixes || []) : charges).map((charge: any) => {
    const category = effectiveCategories.find((item: any) => item.id === charge.categorie_id)
    const subcategory = effectiveCategories.find((item: any) => item.id === charge.sous_categorie_id)
    return {
      ...charge,
      categorie_nom: category?.nom ?? null,
      categorie_icone: category?.icone ?? null,
      sous_categorie_nom: subcategory?.nom ?? null,
    }
  })
  const parentCategories = effectiveCategories.filter((c: any) => c.actif !== false && !c.parent_id)
  const subCats = (id: string) => effectiveCategories.filter((c: any) => c.parent_id === id && c.actif !== false)
  const budget = (id: string) => Number(effectiveBudgets.find((b: any) => b.categorie_id === id)?.prevu || 0)
  const net = (tx: any) => Number(tx.montant) - (tx.remboursements || []).reduce((s: number, r: any) => s + Number(r.montant), 0)
  const spent = (id: string, sub = false) => effectiveFlat.filter((t: any) => (sub ? t.sous_categorie_id : t.categorie_id) === id).reduce((s: number, t: any) => s + net(t), 0)
  const parentCategoryIds = new Set(parentCategories.map((c: any) => c.id))
  const parentBudgets = effectiveBudgets.filter((b: any) => parentCategoryIds.has(b.categorie_id))
  const expenseSummary = summarizeAnalyticalExpenses(effectiveCharges, parentBudgets, effectiveFlat)
  const { plannedFixed, actualFixed: paidFixed, plannedVariable, actualVariable } = expenseSummary

  const createTransaction = async (data: any) => { if (!moisId || isAdminViewing) return; await createTx.mutateAsync({ mois_id: moisId, ...data }) }
  const createSplitTransaction = async (data: any, lines: any[]) => { if (!moisId || isAdminViewing) return; const parent = await createTx.mutateAsync({ mois_id: moisId, ...data }); await split.mutateAsync({ parentId: parent.id, lines }) }
  const createFixedExpense = async (v: { nom: string; montant: number; frequence: number; categorie_id?: string | null; sous_categorie_id?: string | null }) => {
    if (!moisId || !espace || isAdminViewing) return
    let recurrent_id: string | null = null
    if (v.frequence > 0) {
      const rec = await createFixedRecurring.mutateAsync({
        espace_id: espace.id,
        nom: v.nom,
        montant: v.montant,
        categorie_id: v.categorie_id ?? null,
        sous_categorie_id: v.sous_categorie_id ?? null,
        actif: true,
        frequence_mois: v.frequence,
        ordre: charges.length,
        mois_debut: month,
      })
      recurrent_id = rec.id
    }
    await createFixed.mutateAsync({
      mois_id: moisId,
      recurrent_id,
      nom: v.nom,
      montant: v.montant,
      categorie_id: v.categorie_id ?? null,
      sous_categorie_id: v.sous_categorie_id ?? null,
      payee: false,
      ordre: charges.length,
    })
    setFixedOpen(false)
  }
  const saveFixed = (
    id: string,
    nom: string,
    montant: number,
    recurrentId: string | null,
    categorieId?: string | null,
    sousCategorieId?: string | null,
  ) => {
    if (recurrentId) {
      setScopeFixed({
        id,
        nom,
        montant,
        recurrentId,
        categorieId: categorieId ?? null,
        sousCategorieId: sousCategorieId ?? null,
      })
    } else {
      updateFixed.mutateAsync({
        id,
        nom,
        montant,
        categorie_id: categorieId ?? null,
        sous_categorie_id: sousCategorieId ?? null,
      })
    }
    setEditFixed(null)
  }
  const saveFixedScope = async (scope: 'mois' | 'tous') => {
    if (!scopeFixed || isAdminViewing) return
    await updateFixed.mutateAsync({
      id: scopeFixed.id,
      nom: scopeFixed.nom,
      montant: scopeFixed.montant,
      categorie_id: scopeFixed.categorieId ?? null,
      sous_categorie_id: scopeFixed.sousCategorieId ?? null,
    })
    if (scope === 'tous') {
      await updateFixedRecurring.mutateAsync({
        id: scopeFixed.recurrentId,
        nom: scopeFixed.nom,
        montant: scopeFixed.montant,
        categorie_id: scopeFixed.categorieId ?? null,
        sous_categorie_id: scopeFixed.sousCategorieId ?? null,
      })
    }
    setScopeFixed(null)
  }
  const removeFixedExpense = (mode: 'mois' | 'definitif') => { if (!deleteFixed || isAdminViewing) return; if (mode === 'definitif' && deleteFixed.recurrentId) removeDefinitif.mutate({ chargeId: deleteFixed.id, recurrentId: deleteFixed.recurrentId }); else removeFixed.mutate(deleteFixed.id); setDeleteFixed(null) }

  return <div>
    <MonthSelector currentMonth={month} onChange={setMonth} />
    <div className="mx-auto w-full max-w-6xl space-y-5 p-3 pb-28 sm:p-4">
      <PageHeader
        eyebrow="Sorties"
        title="Dépenses"
        description="Prévisions, charges fixes et dépenses variables réunies dans une seule vue, sans mélanger prévu et réel."
        icon={ReceiptText}
      />
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-900 p-1 border border-slate-800">
        <Button variant={view === 'planned' ? 'default' : 'ghost'} onClick={() => setView('planned')}><CalendarClock className="w-4 h-4 mr-2" /> Prévues</Button>
        <Button variant={view === 'actual' ? 'default' : 'ghost'} onClick={() => setView('actual')}><ReceiptText className="w-4 h-4 mr-2" /> Réelles</Button>
      </div>

      <Card className="bg-slate-900 border-slate-800"><CardContent className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div><p className="text-slate-500">Fixes {view === 'planned' ? 'prévues' : 'payées'}</p><p className="text-lg font-bold">{formatEuro(view === 'planned' ? plannedFixed : paidFixed)}</p></div>
        <div><p className="text-slate-500">Variables {view === 'planned' ? 'prévues' : 'enregistrées'}</p><p className="text-lg font-bold">{formatEuro(view === 'planned' ? plannedVariable : actualVariable)}</p></div>
      </CardContent></Card>

      {view === 'planned' ? <>
        <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-400">Charges fixes prévues</h2>
          {effectiveCharges.length === 0 ? (
            <EmptyStateV2
              icon={CalendarClock}
              title="Aucune charge fixe prévue"
              description={moisId
                ? "Ajoute uniquement les charges que tu veux prévoir pour ce mois, ou configure tes récurrences dans les paramètres."
                : "Ce mois n’est pas encore préparé. Prépare-le depuis le Dashboard avant d’ajouter des prévisions."}
              actionLabel={!isAdminViewing && moisId ? "Ajouter une charge fixe" : undefined}
              onAction={!isAdminViewing && moisId ? () => setFixedOpen(true) : undefined}
            />
          ) : effectiveCharges.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/35 p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{c.nom}</p>
                {c.date_prevue && <p className="text-xs text-slate-500">Prévu le {formatDate(c.date_prevue)}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-semibold">{formatEuro(Number(c.montant))}</span>
                {!isAdminViewing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500"
                    onClick={() => setEditFixed({
                      id: c.id,
                      nom: c.nom,
                      montant: Number(c.montant),
                      recurrentId: c.recurrent_id ?? null,
                      categorieId: c.categorie_id ?? null,
                      sousCategorieId: c.sous_categorie_id ?? null,
                    })}
                    aria-label="Modifier la charge fixe"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </section>
        <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-400">Budgets variables</h2>
          {parentCategories.length === 0 ? (
            <EmptyStateV2
              icon={ReceiptText}
              title="Aucune catégorie variable"
              description="Crée des catégories depuis Paramètres pour répartir ton budget variable sans mélanger prévision et dépense réelle."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {parentCategories.map((cat: any) => { const subs=subCats(cat.id); const subBudgets=subs.map((sc:any)=>({id:sc.id,nom:sc.nom,icone:sc.icone,prevu:budget(sc.id),depense:spent(sc.id,true)})); return <BudgetCard key={cat.id} cat={cat} prevu={budget(cat.id)} depense={spent(cat.id)} readOnly={isAdminViewing} subCats={subBudgets} onUpsertBudget={(id,v)=>{if(moisId&&!isAdminViewing)upsertBudget.mutate({mois_id:moisId,categorie_id:id,prevu:v})}} onArchive={setArchiveTarget} /> })}
            </div>
          )}
        </section>
      </> : <>
        <div className="flex gap-2 overflow-x-auto pb-1">{(['all','fixed','variable'] as const).map(f=><Button key={f} size="sm" variant={actualFilter===f?'default':'outline'} onClick={()=>setActualFilter(f)}>{f==='all'?'Toutes':f==='fixed'?'Fixes':'Variables'}</Button>)}</div>
        {(actualFilter==='all'||actualFilter==='fixed') && <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-400">Charges fixes</h2>{effectiveCharges.map((c:any)=><ChargeFixeCard key={c.id} charge={c} readOnly={isAdminViewing} doubleDate={espace?.double_date ?? false} onTogglePayee={(id,p,date)=>togglePayee.mutate({id,payee:p,dateReelle:date})} onActualAmountChange={(id,montant_reel)=>updateFixed.mutate({id,montant_reel})} onEdit={setEditFixed} onDelete={setDeleteFixed} />)}</section>}
        {(actualFilter==='all'||actualFilter==='variable') && <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-400">Transactions variables</h2>{effectiveTransactions.length===0 ? (
          <EmptyStateV2
            icon={ReceiptText}
            title="Aucune dépense enregistrée"
            description={moisId ? "Ajoute une dépense réelle quand elle a eu lieu. Les budgets prévus restent séparés." : "Prépare d’abord ce mois depuis le Dashboard avant de saisir des opérations."}
            actionLabel={!isAdminViewing && moisId ? "Ajouter une dépense" : undefined}
            onAction={!isAdminViewing && moisId ? () => setTxOpen(true) : undefined}
          />
        ) : effectiveTransactions.map((tx:any)=><DepenseCard key={tx.id} tx={tx} readOnly={isAdminViewing} doubleDate={espace?.double_date??false} getMontantNet={net} onEdit={setEditTx} onDelete={setDeleteTx} />)}</section>}
      </>}
      {!isAdminViewing && moisId && (
        <DepensesFab
          onFixed={() => setFixedOpen(true)}
          onVariable={() => setTxOpen(true)}
        />
      )}
      <ChargeFixeForm
        open={fixedOpen}
        onOpenChange={setFixedOpen}
        categories={effectiveCategories}
        espaceId={espace?.id}
        createCat={createCat}
        onSubmit={createFixedExpense}
      />
      <ChargeFixeEditDialog editTarget={editFixed} categories={effectiveCategories} onClose={() => setEditFixed(null)} onSave={saveFixed} />
      <ChargeFixeDeleteDialog target={deleteFixed} onClose={() => setDeleteFixed(null)} onDelete={removeFixedExpense} />
      <ChargeFixeScopeDialog target={scopeFixed} onClose={() => setScopeFixed(null)} onSave={saveFixedScope} />
      <DepenseForm open={txOpen} onOpenChange={setTxOpen} categories={effectiveCategories} espaceId={espace?.id} createCat={createCat} doubleDate={espace?.double_date ?? false} onSubmit={createTransaction} onSubmitSplit={createSplitTransaction} />
      <DepenseEditDialog editTx={editTx} onClose={() => setEditTx(null)} categories={effectiveCategories} espaceId={espace?.id} createCat={createCat} doubleDate={espace?.double_date ?? false} onSave={async (data:any)=>{ await updateTx.mutateAsync(data); setEditTx(null) }} onRemb={(tx:any)=>{ setEditTx(null); setRembTx(tx) }} onSplit={(tx:any)=>{ setEditTx(null); setSplitTx(tx) }} onUnsplit={async(tx:any)=>{ await unsplit.mutateAsync(tx.id); setEditTx(null) }} />
      <DepenseDeleteDialog target={deleteTx} onClose={() => setDeleteTx(null)} onDelete={(id:string)=>{ removeTx.mutate(id); setDeleteTx(null) }} />
      <ArchiveDialog target={archiveTarget} onClose={() => setArchiveTarget(null)} onArchive={(id:string)=>{ if(!isAdminViewing) archiveCat.mutate(id); setArchiveTarget(null) }} />
      <SplitDialog tx={splitTx} onClose={() => setSplitTx(null)} categories={effectiveCategories} espaceId={espace?.id} createCat={createCat} onSave={async(parentId:string, lines:any[])=>{ await split.mutateAsync({ parentId, lines }); setSplitTx(null) }} />
      <RemboursementDialog
        tx={rembTx}
        reimbursements={remboursements}
        onClose={() => setRembTx(null)}
        onCreate={data => createRemb.mutateAsync(data).then(() => undefined)}
        onRemove={id => removeRemb.mutateAsync(id)}
      />
      <p className="text-xs text-slate-600">La gestion des transactions, splits et remboursements est maintenant intégrée à cette vue.</p>
    </div>
  </div>
}
