'use client'

import { useMemo, useState } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useApp } from '@/components/AppContext'
import { useCategories } from '@/lib/hooks/useCategories'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { useChargesFixes } from '@/lib/hooks/useChargesFixes'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { formatEuro, getMontantNet } from '@/lib/utils'

const palette = ['#3b82f6','#ef476f','#4ade80','#a855f7','#06b6d4','#f59e0b','#8b5cf6','#f97316','#14b8a6','#64748b']

type Mode = 'actual'|'planned'
export default function RepartitionDepensesV2() {
  const { moisId, espace } = useApp()
  const { data: categories=[] } = useCategories(espace?.id)
  const { data: budgets=[] } = useBudgets(moisId)
  const { data: charges=[] } = useChargesFixes(moisId)
  const { allFlat: transactions=[] } = useTransactions(moisId)
  const [mode,setMode] = useState<Mode>('actual')
  const [selected,setSelected] = useState<string|null>(null)
  const parents = useMemo(()=>categories.filter((c:any)=>c.actif!==false&&!c.parent_id),[categories])
  const parentOf = (id:string|null|undefined) => { if(!id) return null; const c=categories.find((x:any)=>x.id===id); return c?.parent_id || c?.id || null }
  const rows = useMemo(()=>parents.map((cat:any)=>{
    const plannedFixed=charges.filter((c:any)=>parentOf(c.categorie_id)===cat.id).reduce((s:number,c:any)=>s+Number(c.montant),0)
    const actualFixed=charges.filter((c:any)=>c.payee&&parentOf(c.categorie_id)===cat.id).reduce((s:number,c:any)=>s+Number(c.montant_reel??c.montant),0)
    const plannedVariable=budgets.filter((b:any)=>b.categorie_id===cat.id).reduce((s:number,b:any)=>s+Number(b.prevu||0),0)
    const actualVariable=transactions.filter((t:any)=>parentOf(t.categorie_id)===cat.id).reduce((s:number,t:any)=>s+getMontantNet(t),0)
    return {id:cat.id,name:cat.nom,icon:cat.icone||'📂',actual:actualFixed+actualVariable,planned:plannedFixed+plannedVariable}
  }).filter((r:any)=>r.actual>0||r.planned>0).sort((a:any,b:any)=>(mode==='actual'?b.actual-a.actual:b.planned-a.planned)),[parents,charges,budgets,transactions,categories,mode])
  const total=rows.reduce((s:number,r:any)=>s+Number(r[mode]),0)
  const selectedCat=parents.find((c:any)=>c.id===selected)
  const subRows = selected ? categories.filter((c:any)=>c.parent_id===selected).map((sub:any)=>{
    const actual=transactions.filter((t:any)=>t.sous_categorie_id===sub.id).reduce((s:number,t:any)=>s+getMontantNet(t),0)+charges.filter((c:any)=>c.payee&&c.sous_categorie_id===sub.id).reduce((s:number,c:any)=>s+Number(c.montant_reel??c.montant),0)
    const planned=budgets.filter((b:any)=>b.categorie_id===sub.id).reduce((s:number,b:any)=>s+Number(b.prevu||0),0)+charges.filter((c:any)=>c.sous_categorie_id===sub.id).reduce((s:number,c:any)=>s+Number(c.montant),0)
    return {id:sub.id,name:sub.nom,icon:sub.icone||'•',value:mode==='actual'?actual:planned}
  }).filter((r:any)=>r.value>0).sort((a:any,b:any)=>b.value-a.value) : []
  const details = selected ? (mode==='actual' ? [...transactions.filter((t:any)=>parentOf(t.categorie_id)===selected).map((t:any)=>({id:t.id,label:t.nom||t.description||'Dépense',value:getMontantNet(t)})),...charges.filter((c:any)=>c.payee&&parentOf(c.categorie_id)===selected).map((c:any)=>({id:c.id,label:c.nom,value:Number(c.montant_reel??c.montant)}))] : charges.filter((c:any)=>parentOf(c.categorie_id)===selected).map((c:any)=>({id:c.id,label:c.nom,value:Number(c.montant)}))) : []

  return <Card className="nf-card-hover h-full"><CardHeader className="pb-2"><CardTitle className="flex items-center justify-between gap-2 text-base text-slate-100"><span>Répartition des dépenses</span><select value={mode} onChange={e=>{setMode(e.target.value as Mode);setSelected(null)}} className="select select-bordered select-xs bg-slate-950"><option value="actual">Réel</option><option value="planned">Prévu</option></select></CardTitle></CardHeader><CardContent className="p-3 pt-1">
    {selected && selectedCat ? <div className="space-y-3"><button onClick={()=>setSelected(null)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"><X className="h-3.5 w-3.5"/>Fermer le détail</button><div><p className="text-sm font-semibold">{selectedCat.icone} {selectedCat.nom}</p><p className="text-[11px] text-slate-500">Sous-catégories et opérations du mois</p></div>{subRows.length>0&&<div className="space-y-1.5">{subRows.slice(0,6).map((r:any)=><div key={r.id} className="flex justify-between rounded-lg bg-slate-950/35 px-3 py-2 text-xs"><span>{r.icon} {r.name}</span><strong>{formatEuro(r.value)}</strong></div>)}</div>}<div className="max-h-40 space-y-1 overflow-y-auto border-t border-slate-800 pt-2">{details.slice(0,12).map((d:any)=><div key={d.id} className="flex justify-between gap-3 text-[11px]"><span className="truncate text-slate-500">{d.label}</span><span className="shrink-0 text-slate-300">{formatEuro(d.value)}</span></div>)}{details.length===0&&<p className="text-xs text-slate-600">Aucun détail disponible.</p>}</div></div> : rows.length===0 ? <div className="flex min-h-56 items-center justify-center text-sm text-slate-600">Aucune dépense à répartir.</div> : <div className="grid gap-3 md:grid-cols-[220px_1fr]"><div className="relative h-[220px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={rows} dataKey={mode} nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={1} onClick={(d:any)=>d?.id&&setSelected(d.id)}>{rows.map((r:any,i:number)=><Cell key={r.id} fill={palette[i%palette.length]} className="cursor-pointer" />)}</Pie><Tooltip formatter={(v:number)=>formatEuro(v)} contentStyle={{backgroundColor:'#0f172a',border:'1px solid #334155',borderRadius:'10px'}} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-base">{formatEuro(total)}</strong><span className="text-[10px] text-slate-600">Total</span></div></div><div className="space-y-1">{rows.slice(0,7).map((r:any,i:number)=>{const v=Number(r[mode]);const pct=total>0?Math.round(v/total*100):0;return <button key={r.id} onClick={()=>setSelected(r.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-800/50"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{backgroundColor:palette[i%palette.length]}}/><span className="min-w-0 flex-1 truncate text-xs">{r.icon} {r.name}</span><span className="text-[11px] text-slate-400">{formatEuro(v)} <span className="text-slate-600">({pct}%)</span></span><ChevronRight className="h-3 w-3 text-slate-700"/></button>})}</div></div>}
  </CardContent></Card>
}
