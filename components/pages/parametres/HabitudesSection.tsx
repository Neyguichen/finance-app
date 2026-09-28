'use client'

import { useHabits } from '@/lib/hooks/useHabits'

const labels={income:'Revenu',fixed:'Charge fixe',savings:'Épargne',budget:'Budget variable'} as const

export default function HabitudesSection({espaceId}:{espaceId?:string}) {
  const {data=[],isLoading,toggle}=useHabits(espaceId)
  if(!espaceId) return <p className="text-sm text-slate-500">Sélectionne un Budget.</p>
  if(isLoading) return <p className="text-sm text-slate-500">Chargement des habitudes…</p>
  if(!data.length) return <p className="text-sm text-slate-500">Aucune habitude pour ce Budget. Les anciennes récurrences apparaîtront ici automatiquement.</p>
  return <div className="space-y-2">
    <p className="text-sm text-slate-500">Ces modèles sont proposés lors de la préparation d&apos;un mois. Les désactiver ne supprime aucune donnée historique.</p>
    {data.map(h=><div key={h.kind+':'+h.id} className="flex items-center gap-3 rounded-lg border border-base-300 p-3">
      <div className="min-w-0 flex-1"><div className="font-medium truncate">{h.label}</div><div className="text-xs text-slate-500">{labels[h.kind]} · {h.frequence_mois===1?'Tous les mois':`Tous les ${h.frequence_mois} mois`} · {h.amount.toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}</div></div>
      <input type="checkbox" className="toggle toggle-sm" checked={h.actif} disabled={toggle.isPending} onChange={()=>toggle.mutate(h)} aria-label={`Activer ${h.label}`} />
    </div>)}
  </div>
}
