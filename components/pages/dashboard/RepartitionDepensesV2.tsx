'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
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
  const router = useRouter()
  const { moisId, espace } = useApp()
  const { data: categories=[] } = useCategories(espace?.id)
  const { data: budgets=[] } = useBudgets(moisId)
  const { data: charges=[] } = useChargesFixes(moisId)
  const { allFlat: transactions=[] } = useTransactions(moisId)
  const [mode,setMode] = useState<Mode>('actual')
  const [selected,setSelected] = useState<string|null>(null)
  const [selectedSub,setSelectedSub] = useState<string|null>(null)

  const parents = useMemo(() => categories.filter((category:any) => category.actif !== false && !category.parent_id), [categories])
  const parentOf = (id:string|null|undefined) => {
    if (!id) return null
    const category = categories.find((item:any) => item.id === id)
    return category?.parent_id || category?.id || null
  }

  const rows = useMemo(() => parents.map((cat:any) => {
    const plannedFixed = charges.filter((charge:any) => parentOf(charge.categorie_id) === cat.id).reduce((sum:number,charge:any) => sum + Number(charge.montant), 0)
    const actualFixed = charges.filter((charge:any) => charge.payee && parentOf(charge.categorie_id) === cat.id).reduce((sum:number,charge:any) => sum + Number(charge.montant_reel ?? charge.montant), 0)
    const plannedVariable = budgets.filter((budget:any) => budget.categorie_id === cat.id).reduce((sum:number,budget:any) => sum + Number(budget.prevu || 0), 0)
    const actualVariable = transactions.filter((transaction:any) => parentOf(transaction.categorie_id) === cat.id).reduce((sum:number,transaction:any) => sum + getMontantNet(transaction), 0)
    return { id:cat.id, name:cat.nom, icon:cat.icone || '📂', actual:actualFixed + actualVariable, planned:plannedFixed + plannedVariable }
  }).filter((row:any) => row.actual > 0 || row.planned > 0).sort((a:any,b:any) => mode === 'actual' ? b.actual - a.actual : b.planned - a.planned), [parents, charges, budgets, transactions, categories, mode])

  const total = rows.reduce((sum:number,row:any) => sum + Number(row[mode]), 0)
  const selectedCat = parents.find((category:any) => category.id === selected)

  const subRows = selected ? categories.filter((category:any) => category.parent_id === selected).map((sub:any) => {
    const actual = transactions.filter((transaction:any) => transaction.sous_categorie_id === sub.id).reduce((sum:number,transaction:any) => sum + getMontantNet(transaction),0)
      + charges.filter((charge:any) => charge.payee && charge.sous_categorie_id === sub.id).reduce((sum:number,charge:any) => sum + Number(charge.montant_reel ?? charge.montant),0)
    const planned = budgets.filter((budget:any) => budget.categorie_id === sub.id).reduce((sum:number,budget:any) => sum + Number(budget.prevu || 0),0)
      + charges.filter((charge:any) => charge.sous_categorie_id === sub.id).reduce((sum:number,charge:any) => sum + Number(charge.montant),0)
    return { id:sub.id, name:sub.nom, icon:sub.icone || '•', value:mode === 'actual' ? actual : planned }
  }).filter((row:any) => row.value > 0).sort((a:any,b:any) => b.value - a.value) : []

  const details = selected
    ? mode === 'actual'
      ? [
          ...transactions
            .filter((transaction:any) => selectedSub ? transaction.sous_categorie_id === selectedSub : parentOf(transaction.categorie_id) === selected)
            .map((transaction:any) => ({
              id:transaction.id,
              kind:'transaction' as const,
              label:transaction.infos || transaction.nom || transaction.description || 'Dépense',
              value:getMontantNet(transaction),
            })),
          ...charges
            .filter((charge:any) => charge.payee && (selectedSub ? charge.sous_categorie_id === selectedSub : parentOf(charge.categorie_id) === selected))
            .map((charge:any) => ({ id:charge.id, kind:'fixed' as const, label:charge.nom || 'Charge fixe', value:Number(charge.montant_reel ?? charge.montant) })),
        ]
      : charges
          .filter((charge:any) => selectedSub ? charge.sous_categorie_id === selectedSub : parentOf(charge.categorie_id) === selected)
          .map((charge:any) => ({ id:charge.id, kind:'fixed' as const, label:charge.nom || 'Charge fixe', value:Number(charge.montant) }))
    : []

  const openDetail = (detail:any) => {
    const param = detail.kind === 'transaction' ? 'focusTransaction' : 'focusFixed'
    router.push(`/depenses?${param}=${encodeURIComponent(detail.id)}`)
  }

  return (
    <Card className="nf-card-hover h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-base text-slate-100">
          <span>Répartition des dépenses</span>
          <label className="relative">
            <select
              value={mode}
              onChange={event => { setMode(event.target.value as Mode); setSelected(null); setSelectedSub(null) }}
              className="h-8 appearance-none rounded-lg border border-slate-700 bg-slate-950 pl-3 pr-8 text-xs font-medium text-slate-200 outline-none transition hover:border-slate-600 focus:border-indigo-400"
              aria-label="Afficher les dépenses réelles ou prévues"
            >
              <option value="actual">Réel</option>
              <option value="planned">Prévu</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          </label>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-3 pt-1">
        {selected && selectedCat ? (
          <div className="space-y-3">
            <button onClick={() => { setSelected(null); setSelectedSub(null) }} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"><X className="h-3.5 w-3.5"/>Fermer le détail</button>
            <div><p className="text-sm font-semibold">{selectedCat.icone} {selectedCat.nom}</p><p className="text-[11px] text-slate-500">Sous-catégories et opérations du mois</p></div>
            {subRows.length > 0 && <div className="space-y-1.5">{subRows.slice(0,6).map((row:any) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedSub(current => current === row.id ? null : row.id)}
                className={'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ' + (selectedSub === row.id ? 'bg-indigo-500/10 ring-1 ring-indigo-400/30 text-indigo-100' : 'bg-slate-950/35 hover:bg-slate-800/60')}
                aria-pressed={selectedSub === row.id}
              >
                <span>{row.icon} {row.name}</span><strong>{formatEuro(row.value)}</strong>
              </button>
            ))}</div>}
            <div className="max-h-40 space-y-1 overflow-y-auto border-t border-slate-800 pt-2">
              {selectedSub && <button type="button" onClick={() => setSelectedSub(null)} className="mb-1 text-[10px] font-medium text-indigo-300 hover:text-indigo-200">Voir toute la catégorie</button>}
              {details.slice(0,12).map((detail:any) => (
                <button key={detail.kind + '-' + detail.id} type="button" onClick={() => openDetail(detail)} className="flex w-full items-center justify-between gap-3 rounded px-1 py-0.5 text-left text-[11px] hover:bg-slate-800/50">
                  <span className="truncate text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline">{detail.label}</span>
                  <span className="shrink-0 text-slate-300">{formatEuro(detail.value)}</span>
                </button>
              ))}
              {details.length === 0 && <p className="text-xs text-slate-600">Aucun détail disponible.</p>}
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex min-h-56 items-center justify-center text-sm text-slate-600">Aucune dépense à répartir.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-[220px_1fr]">
            <div className="relative h-[220px]">
              <div className="relative z-10 h-full"><ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rows} dataKey={mode} nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={1} onClick={(data:any) => { if (data?.id) { setSelected(data.id); setSelectedSub(null) } }}>
                    {rows.map((row:any,index:number) => <Cell key={row.id} fill={palette[index % palette.length]} className="cursor-pointer" />)}
                  </Pie>
                  <Tooltip formatter={(value:number) => [formatEuro(value), 'Montant']} contentStyle={{backgroundColor:'#020617',border:'1px solid #475569',borderRadius:'10px',color:'#e2e8f0'}} labelStyle={{color:'#f8fafc',fontWeight:600}} itemStyle={{color:'#e2e8f0'}} cursor={{fill:'rgba(99,102,241,0.06)'}} wrapperStyle={{zIndex:60,pointerEvents:'none'}} />
                </PieChart>
              </ResponsiveContainer></div>
              <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center"><strong className="text-base">{formatEuro(total)}</strong><span className="text-[10px] text-slate-600">Total</span></div>
            </div>

            <div className="space-y-1">
              {rows.slice(0,7).map((row:any,index:number) => {
                const value = Number(row[mode])
                const percent = total > 0 ? Math.round(value / total * 100) : 0
                return (
                  <button key={row.id} onClick={() => { setSelected(row.id); setSelectedSub(null) }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-800/50">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{backgroundColor:palette[index % palette.length]}} />
                    <span className="min-w-0 flex-1 truncate text-xs">{row.icon} {row.name}</span>
                    <span className="text-[11px] text-slate-400">{formatEuro(value)} <span className="text-slate-600">({percent}%)</span></span>
                    <ChevronRight className="h-3 w-3 text-slate-700"/>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
