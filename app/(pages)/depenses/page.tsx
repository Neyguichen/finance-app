'use client'

import { useState } from 'react'
import { useApp } from '@/components/AppContext'
import MonthSelector from '@/components/layout/MonthSelector'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarClock, ReceiptText } from 'lucide-react'
import { formatEuro, localDateISO } from '@/lib/utils'
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
import { Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import SplitDialog from '@/components/pages/variables/SplitDialog'
import { useRemboursements } from '@/lib/hooks/useRemboursements'
import ArchiveDialog from '@/components/pages/variables/ArchiveDialog'
import { summarizeAnalyticalExpenses } from '@/lib/expense-summary'

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
  const [deleteFixed, setDeleteFixed] = useState<any>(null)
  const [scopeFixed, setScopeFixed] = useState<any>(null)
  const [splitTx, setSplitTx] = useState<any>(null)
  const [rembTx, setRembTx] = useState<any>(null)
  const [newRembMontant, setNewRembMontant] = useState(0)
  const [newRembNote, setNewRembNote] = useState('')
  const [newRembDate, setNewRembDate] = useState(localDateISO())
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
  const effectiveCharges: any[] = isAdminViewing ? (adminData?.charges_fixes || []) : charges
  const parentCategories = effectiveCategories.filter((c: any) => c.actif !== false && !c.parent_id)
  const subCats = (id: string) => effectiveCategories.filter((c: any) => c.parent_id === id && c.actif !== false)
  const budget = (id: string) => Number(effectiveBudgets.find((b: any) => b.categorie_id === id)?.prevu || 0)
  const net = (tx: any) => Number(tx.montant) - (tx.remboursements || []).reduce((s: number, r: any) => s + Number(r.montant), 0)
  const spent = (id: string, sub = false) => effectiveFlat.filter((t: any) => (sub ? t.sous_categorie_id : t.categorie_id) === id).reduce((s: number, t: any) => s + net(t), 0)
  const expenseSummary = summarizeAnalyticalExpenses(effectiveCharges, effectiveBudgets, effectiveFlat)
  const { plannedFixed, actualFixed: paidFixed, plannedVariable, actualVariable } = expenseSummary

  const createTransaction = async (data: any) => { if (!moisId || isAdminViewing) return; await createTx.mutateAsync({ mois_id: moisId, ...data }) }
  const createSplitTransaction = async (data: any, lines: any[]) => { if (!moisId || isAdminViewing) return; const parent = await createTx.mutateAsync({ mois_id: moisId, ...data }); await split.mutateAsync({ parentId: parent.id, lines }) }
  const createFixedExpense = async (v: { nom: string; montant: number; frequence: number; categorie_id?: string | null }) => { if (!moisId || !espace || isAdminViewing) return; let recurrent_id: string | null = null; if (v.frequence > 0) { const rec = await createFixedRecurring.mutateAsync({ espace_id: espace.id, nom: v.nom, montant: v.montant, categorie_id: v.categorie_id ?? null, actif: true, frequence_mois: v.frequence, ordre: charges.length, mois_debut: month }); recurrent_id = rec.id } await createFixed.mutateAsync({ mois_id: moisId, recurrent_id, nom: v.nom, montant: v.montant, categorie_id: v.categorie_id ?? null, payee: false, ordre: charges.length }); setFixedOpen(false) }
  const saveFixed = (id: string, nom: string, montant: number, recurrentId: string | null, categorieId?: string | null) => { if (recurrentId) setScopeFixed({ id, nom, montant, recurrentId, categorieId: categorieId ?? null }); else updateFixed.mutateAsync({ id, nom, montant, categorie_id: categorieId ?? null }); setEditFixed(null) }
  const saveFixedScope = async (scope: 'mois' | 'tous') => { if (!scopeFixed || isAdminViewing) return; await updateFixed.mutateAsync({ id: scopeFixed.id, nom: scopeFixed.nom, montant: scopeFixed.montant, categorie_id: scopeFixed.categorieId ?? null }); if (scope === 'tous') await updateFixedRecurring.mutateAsync({ id: scopeFixed.recurrentId, nom: scopeFixed.nom, montant: scopeFixed.montant, categorie_id: scopeFixed.categorieId ?? null }); setScopeFixed(null) }
  const removeFixedExpense = (mode: 'mois' | 'definitif') => { if (!deleteFixed || isAdminViewing) return; if (mode === 'definitif' && deleteFixed.recurrentId) removeDefinitif.mutate({ chargeId: deleteFixed.id, recurrentId: deleteFixed.recurrentId }); else removeFixed.mutate(deleteFixed.id); setDeleteFixed(null) }

  return <div>
    <MonthSelector currentMonth={month} onChange={setMonth} />
    <div className="p-4 space-y-4 pb-24">
      <div><h1 className="text-xl font-bold">Dépenses</h1><p className="text-sm text-slate-500">Prévu et réel réunis, sans mélanger les deux.</p></div>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-900 p-1 border border-slate-800">
        <Button variant={view === 'planned' ? 'default' : 'ghost'} onClick={() => setView('planned')}><CalendarClock className="w-4 h-4 mr-2" /> Prévues</Button>
        <Button variant={view === 'actual' ? 'default' : 'ghost'} onClick={() => setView('actual')}><ReceiptText className="w-4 h-4 mr-2" /> Réelles</Button>
      </div>

      <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-slate-500">Fixes {view === 'planned' ? 'prévues' : 'payées'}</p><p className="text-lg font-bold">{formatEuro(view === 'planned' ? plannedFixed : paidFixed)}</p></div>
        <div><p className="text-slate-500">Variables {view === 'planned' ? 'prévues' : 'enregistrées'}</p><p className="text-lg font-bold">{formatEuro(view === 'planned' ? plannedVariable : actualVariable)}</p></div>
      </CardContent></Card>

      {view === 'planned' ? <>
        <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-400">Charges fixes prévues</h2>
          {effectiveCharges.length === 0 ? <p className="text-sm text-slate-600">Aucune charge fixe prévue.</p> : effectiveCharges.map((c: any) => <div key={c.id} className="flex justify-between rounded-xl border border-slate-800 bg-slate-900 p-3"><div><p className="font-medium">{c.nom}</p>{c.date_prevue && <p className="text-xs text-slate-500">Prévu le {c.date_prevue}</p>}</div><span className="font-bold">{formatEuro(Number(c.montant))}</span></div>)}
        </section>
        <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-400">Budgets variables</h2><div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {parentCategories.map((cat: any) => { const subs=subCats(cat.id); const subBudgets=subs.map((sc:any)=>({id:sc.id,nom:sc.nom,icone:sc.icone,prevu:budget(sc.id),depense:spent(sc.id,true)})); return <BudgetCard key={cat.id} cat={cat} prevu={budget(cat.id)} depense={spent(cat.id)} readOnly={isAdminViewing} subCats={subBudgets} onUpsertBudget={(id,v)=>{if(moisId&&!isAdminViewing)upsertBudget.mutate({mois_id:moisId,categorie_id:id,prevu:v})}} onArchive={setArchiveTarget} /> })}
        </div></section>
      </> : <>
        <div className="flex gap-2 overflow-x-auto">{(['all','fixed','variable'] as const).map(f=><Button key={f} size="sm" variant={actualFilter===f?'default':'outline'} onClick={()=>setActualFilter(f)}>{f==='all'?'Toutes':f==='fixed'?'Fixes':'Variables'}</Button>)}</div>
        {(actualFilter==='all'||actualFilter==='fixed') && <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-400">Charges fixes</h2>{effectiveCharges.map((c:any)=><ChargeFixeCard key={c.id} charge={c} readOnly={isAdminViewing} onTogglePayee={(id,p,date)=>togglePayee.mutate({id,payee:p,dateReelle:date})} onActualAmountChange={(id,montant_reel)=>updateFixed.mutate({id,montant_reel})} onEdit={setEditFixed} onDelete={setDeleteFixed} />)}</section>}
        {(actualFilter==='all'||actualFilter==='variable') && <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-400">Transactions variables</h2>{effectiveTransactions.length===0?<p className="text-sm text-slate-600">Aucune dépense enregistrée.</p>:effectiveTransactions.map((tx:any)=><DepenseCard key={tx.id} tx={tx} readOnly={isAdminViewing} doubleDate={espace?.double_date??false} getMontantNet={net} onEdit={setEditTx} onDelete={setDeleteTx} />)}</section>}
      </>}
      {!isAdminViewing && moisId && <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-2 items-end">
        <Button size="sm" variant="outline" onClick={() => setFixedOpen(true)}>+ Charge fixe</Button>
        <Button className="rounded-full w-14 h-14 shadow-lg" onClick={() => setTxOpen(true)} aria-label="Ajouter une dépense"><Plus className="w-6 h-6" /></Button>
      </div>}
      <ChargeFixeForm open={fixedOpen} onOpenChange={setFixedOpen} categories={effectiveCategories} onSubmit={createFixedExpense} />
      <ChargeFixeEditDialog editTarget={editFixed} categories={effectiveCategories} onClose={() => setEditFixed(null)} onSave={saveFixed} />
      <ChargeFixeDeleteDialog target={deleteFixed} onClose={() => setDeleteFixed(null)} onDelete={removeFixedExpense} />
      <ChargeFixeScopeDialog target={scopeFixed} onClose={() => setScopeFixed(null)} onSave={saveFixedScope} />
      <DepenseForm open={txOpen} onOpenChange={setTxOpen} categories={effectiveCategories} espaceId={espace?.id} createCat={createCat} doubleDate={espace?.double_date ?? false} onSubmit={createTransaction} onSubmitSplit={createSplitTransaction} />
      <DepenseEditDialog editTx={editTx} onClose={() => setEditTx(null)} categories={effectiveCategories} espaceId={espace?.id} createCat={createCat} doubleDate={espace?.double_date ?? false} onSave={async (data:any)=>{ await updateTx.mutateAsync(data); setEditTx(null) }} onRemb={(tx:any)=>{ setEditTx(null); setRembTx(tx) }} onSplit={(tx:any)=>{ setEditTx(null); setSplitTx(tx) }} onUnsplit={async(tx:any)=>{ await unsplit.mutateAsync(tx.id); setEditTx(null) }} />
      <DepenseDeleteDialog target={deleteTx} onClose={() => setDeleteTx(null)} onDelete={(id:string)=>{ removeTx.mutate(id); setDeleteTx(null) }} />
      <ArchiveDialog target={archiveTarget} onClose={() => setArchiveTarget(null)} onArchive={(id:string)=>{ if(!isAdminViewing) archiveCat.mutate(id); setArchiveTarget(null) }} />
      <SplitDialog tx={splitTx} onClose={() => setSplitTx(null)} categories={effectiveCategories} espaceId={espace?.id} createCat={createCat} onSave={async(parentId:string, lines:any[])=>{ await split.mutateAsync({ parentId, lines }); setSplitTx(null) }} />
      <Dialog open={!!rembTx} onOpenChange={(v)=>{ if(!v) setRembTx(null) }}><DialogContent className="bg-slate-900 border-slate-700"><DialogHeader><DialogTitle>Remboursements — {rembTx?.infos || rembTx?.categorie?.nom || 'Dépense'}</DialogTitle></DialogHeader><div className="space-y-4"><p className="text-sm text-slate-400">Dépense initiale : <span className="font-bold text-pink-400">{formatEuro(Number(rembTx?.montant || 0))}</span></p>{remboursements.map((r:any)=><div key={r.id} className="flex items-center justify-between bg-slate-800 rounded-lg p-2"><div><span className="text-sm text-emerald-400 font-semibold">+{formatEuro(Number(r.montant))}</span>{r.note && <span className="text-xs text-slate-500 ml-2">{r.note}</span>}</div><Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500" onClick={()=>removeRemb.mutate(r.id)}><Trash2 className="w-3 h-3"/></Button></div>)}<div className="border-t border-slate-700 pt-3 space-y-3"><p className="text-sm font-semibold">Ajouter un remboursement</p><CalculatorInput value={newRembMontant} onChange={setNewRembMontant} placeholder="Montant" /><Input placeholder="Note (optionnel)" value={newRembNote} onChange={e=>setNewRembNote(e.target.value)} /><Input type="date" value={newRembDate} onChange={e=>setNewRembDate(e.target.value)} /><Button className="w-full" onClick={async()=>{ if(!rembTx||!newRembMontant)return; await createRemb.mutateAsync({transaction_id:rembTx.id,montant:newRembMontant,note:newRembNote||null,date:newRembDate}); setNewRembMontant(0);setNewRembNote('') }}>Ajouter</Button></div></div></DialogContent></Dialog>
      <p className="text-xs text-slate-600">La gestion des transactions, splits et remboursements est maintenant intégrée à cette vue.</p>
    </div>
  </div>
}
