'use client'

import { useState } from 'react'
import { useApp } from '@/components/AppContext'
import MonthSelector from '@/components/layout/MonthSelector'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarClock, ReceiptText } from 'lucide-react'
import { formatEuro } from '@/lib/utils'
import { useCategories } from '@/lib/hooks/useCategories'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { useChargesFixes } from '@/lib/hooks/useChargesFixes'
import { useAdminMoisData } from '@/lib/hooks/useAdminMoisData'
import ChargeFixeCard from '@/components/pages/charges-fixes/ChargeFixeCard'
import BudgetCard from '@/components/pages/variables/BudgetCard'
import DepenseCard from '@/components/pages/variables/DepenseCard'

export default function DepensesPage() {
  const { moisId, month, setMonth, espace, isAdminViewing } = useApp()
  const [view, setView] = useState<'planned' | 'actual'>('planned')
  const [actualFilter, setActualFilter] = useState<'all' | 'fixed' | 'variable'>('all')
  const { data: categories = [] } = useCategories(espace?.id)
  const { data: budgets = [], upsert: upsertBudget } = useBudgets(moisId)
  const { data: transactions = [], allFlat } = useTransactions(moisId)
  const { data: charges = [], togglePayee } = useChargesFixes(moisId)
  const { data: adminData } = useAdminMoisData(month)

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
  const plannedFixed = effectiveCharges.reduce((s: number, c: any) => s + Number(c.montant), 0)
  const paidFixed = effectiveCharges.filter((c: any) => c.payee).reduce((s: number, c: any) => s + Number(c.montant), 0)
  const plannedVariable = effectiveBudgets.reduce((s: number, b: any) => s + Number(b.prevu), 0)
  const actualVariable = effectiveFlat.reduce((s: number, t: any) => s + net(t), 0)

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
          {parentCategories.map((cat: any) => { const subs=subCats(cat.id); const subBudgets=subs.map((sc:any)=>({id:sc.id,nom:sc.nom,icone:sc.icone,prevu:budget(sc.id),depense:spent(sc.id,true)})); return <BudgetCard key={cat.id} cat={cat} prevu={budget(cat.id)} depense={spent(cat.id)} readOnly={isAdminViewing} subCats={subBudgets} onUpsertBudget={(id,v)=>{if(moisId&&!isAdminViewing)upsertBudget.mutate({mois_id:moisId,categorie_id:id,prevu:v})}} onArchive={()=>{}} /> })}
        </div></section>
      </> : <>
        <div className="flex gap-2 overflow-x-auto">{(['all','fixed','variable'] as const).map(f=><Button key={f} size="sm" variant={actualFilter===f?'default':'outline'} onClick={()=>setActualFilter(f)}>{f==='all'?'Toutes':f==='fixed'?'Fixes':'Variables'}</Button>)}</div>
        {(actualFilter==='all'||actualFilter==='fixed') && <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-400">Charges fixes</h2>{effectiveCharges.map((c:any)=><ChargeFixeCard key={c.id} charge={c} readOnly={isAdminViewing} onTogglePayee={(id,p,date)=>togglePayee.mutate({id,payee:p,dateReelle:date})} onEdit={()=>{}} onDelete={()=>{}} />)}</section>}
        {(actualFilter==='all'||actualFilter==='variable') && <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-400">Transactions variables</h2>{effectiveTransactions.length===0?<p className="text-sm text-slate-600">Aucune dépense enregistrée.</p>:effectiveTransactions.map((tx:any)=><DepenseCard key={tx.id} tx={tx} readOnly={true} doubleDate={espace?.double_date??false} getMontantNet={net} onEdit={()=>{}} onDelete={()=>{}} />)}</section>}
      </>}
      <p className="text-xs text-slate-600">Les actions avancées d’édition restent temporairement disponibles dans les écrans V1 pendant leur migration.</p>
    </div>
  </div>
}
