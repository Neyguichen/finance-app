'use client'

import { useState } from 'react'
import { useHabits } from '@/lib/hooks/useHabits'
import { useCategories } from '@/lib/hooks/useCategories'

const labels={income:'Revenu',fixed:'Charge fixe',savings:'Épargne',budget:'Budget variable'} as const

export default function HabitudesSection({espaceId}:{espaceId?:string}) {
  const {data=[],isLoading,toggle,saveBudget,removeBudget}=useHabits(espaceId)
  const {data:categories=[]}=useCategories(espaceId)
  const [categoryId,setCategoryId]=useState('')
  const [amount,setAmount]=useState('')
  const [frequency,setFrequency]=useState(1)
  if(!espaceId) return <p className="text-sm text-slate-500">Sélectionne un Budget.</p>
  if(isLoading) return <p className="text-sm text-slate-500">Chargement des récurrences…</p>
  const parentCategories=categories.filter(c=>!c.parent_id && c.actif!==false)
  const submit=()=>{const value=Number(amount);if(!categoryId||!Number.isFinite(value)||value<0)return;saveBudget.mutate({categoryId,amount:value,frequence_mois:frequency});setAmount('')}
  return <div className="space-y-3">
    <div className="rounded-lg border border-base-300 p-3 space-y-2">
      <div className="font-medium">Budget variable récurrent</div>
      <div className="grid gap-2 sm:grid-cols-4">
        <select className="select select-bordered select-sm sm:col-span-2" value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">Catégorie…</option>{parentCategories.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}</select>
        <input className="input input-bordered input-sm" type="number" min="0" step="0.01" placeholder="Montant €" value={amount} onChange={e=>setAmount(e.target.value)} />
        <select className="select select-bordered select-sm" value={frequency} onChange={e=>setFrequency(Number(e.target.value))}><option value={1}>Chaque mois</option><option value={2}>Tous les 2 mois</option><option value={3}>Tous les 3 mois</option><option value={6}>Tous les 6 mois</option><option value={12}>Chaque année</option></select>
      </div>
      <button className="btn btn-primary btn-sm" disabled={!categoryId||!amount||saveBudget.isPending} onClick={submit}>Enregistrer la récurrence</button>
    </div>
    {!data.length && <p className="text-sm text-slate-500">Aucune récurrence pour ce Budget.</p>}
    <p className="text-sm text-slate-500">Ces modèles sont proposés lors de la préparation d&apos;un mois. Les désactiver ne supprime aucune donnée historique.</p>
    {data.map(h=><div key={h.kind+':'+h.id} className="flex items-center gap-3 rounded-lg border border-base-300 p-3">
      <div className="min-w-0 flex-1"><div className="font-medium truncate">{h.label}</div><div className="text-xs text-slate-500">{labels[h.kind]} · {h.frequence_mois===1?'Tous les mois':`Tous les ${h.frequence_mois} mois`} · {h.amount.toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}</div></div>
      <input type="checkbox" className="toggle toggle-sm" checked={h.actif} disabled={toggle.isPending} onChange={()=>toggle.mutate(h)} aria-label={`Activer ${h.label}`} />
      {h.kind==='budget' && <button className="btn btn-ghost btn-xs text-error" disabled={removeBudget.isPending} onClick={()=>removeBudget.mutate(h.id)}>Supprimer</button>}
    </div>)}
  </div>
}
