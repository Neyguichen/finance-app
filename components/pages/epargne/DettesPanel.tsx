'use client'

import { useEffect, useMemo, useState } from 'react'
import { Handshake, Plus, WalletCards } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import DetteForm from '@/components/pages/dette/DetteForm'
import DetteDetail from '@/components/pages/dette/DetteDetail'
import { useApp } from '@/components/AppContext'
import { useDettes } from '@/lib/hooks/useDettes'
import { formatEuro, formatDate } from '@/lib/utils'
import type { Dette } from '@/lib/types'

const colors = ['#fb7185','#f59e0b','#a78bfa','#38bdf8','#34d399','#64748b']

export default function DettesPanel() {
  const { espace, isAdminViewing, month } = useApp()
  const {
    data: dettes = [], create, remboursements, update,
    addRemboursement, removeRemboursement, updateRemboursement, archive, unarchive,
  } = useDettes(espace?.id)

  const [tab, setTab] = useState<'je_dois' | 'jai_prete'>('je_dois')
  const [openAdd, setOpenAdd] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedTab = params.get('debtTab')
    const requestedDebt = params.get('selectedDebt')
    if (requestedTab === 'je_dois' || requestedTab === 'jai_prete') setTab(requestedTab)
    if (requestedDebt) setSelectedId(requestedDebt)
  }, [])
  const rembData = remboursements?.data || []
  const currentMonth = month.slice(0, 7)

  const getReste = (dette: Dette) => {
    const repayments = rembData.filter(r => r.dette_id === dette.id)
    const repaid = repayments.reduce(
      (sum, r) => sum + Number(dette.mode === 'credit' ? (r.capital_rembourse || 0) : r.montant),
      0,
    )
    return Math.max(0, Number(dette.montant) - repaid)
  }

  const active = dettes.filter(dette => !dette.archived && dette.type === tab)
  const archived = dettes.filter(dette => dette.archived && dette.type === tab)
  const totalRemaining = active.reduce((sum, dette) => sum + getReste(dette), 0)
  const repaidThisMonth = rembData
    .filter(r => String(r.date).slice(0,7) === currentMonth && active.some(d => d.id === r.dette_id))
    .reduce((sum, r) => sum + Number(r.montant), 0)

  const estimatedMonthly = active.reduce((sum, dette) => {
    if (dette.mode === 'credit' && Number(dette.mensualite || 0) > 0) {
      return sum + Number(dette.mensualite || 0) + Number(dette.assurance_mensuelle || 0)
    }
    if (!dette.date_echeance) return sum
    const end = new Date(dette.date_echeance + 'T12:00:00')
    const now = new Date(month.slice(0,7) + '-01T12:00:00')
    const monthsLeft = Math.max(1, (end.getFullYear()-now.getFullYear())*12 + end.getMonth()-now.getMonth())
    return sum + (getReste(dette) / monthsLeft)
  }, 0)

  const pieData = active
    .map(dette => ({ id:dette.id, name:dette.titre, value:getReste(dette) }))
    .filter(item => item.value > 0)
    .sort((a,b) => b.value-a.value)

  const selected = active.find(dette => dette.id === selectedId) || active[0] || null

  const handleAdd = async (data: {
    titre: string
    description: string | null
    personne: string
    montant: number
    date_echeance: string | null
    mode?: 'simple' | 'credit'
    taux_annuel?: number | null
    mensualite?: number | null
    assurance_mensuelle?: number | null
    date_debut?: string | null
    duree_mois?: number | null
  }) => {
    if (!espace || isAdminViewing) return
    const created = await create.mutateAsync({ espace_id: espace.id, type: tab, ...data })
    setOpenAdd(false)
    if (created?.id) setSelectedId(created.id)
  }

  const isDebt = tab === 'je_dois'

  return (
    <section className="min-w-0 max-w-full space-y-3">
      <DetteForm open={openAdd} onOpenChange={setOpenAdd} tab={tab} onSubmit={handleAdd} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="grid grid-cols-2 rounded-xl border border-slate-800/80 bg-slate-950/35 p-1">
          <button type="button" onClick={() => { setTab('je_dois'); setSelectedId(null) }} className={'rounded-lg px-4 py-2 text-sm font-medium transition ' + (tab === 'je_dois' ? 'bg-rose-500/15 text-rose-300' : 'text-slate-500 hover:text-slate-300')}>Dettes</button>
          <button type="button" onClick={() => { setTab('jai_prete'); setSelectedId(null) }} className={'rounded-lg px-4 py-2 text-sm font-medium transition ' + (tab === 'jai_prete' ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-500 hover:text-slate-300')}>On me doit</button>
        </div>
        {!isAdminViewing && <Button size="sm" className="ml-auto" onClick={() => setOpenAdd(true)}><Plus className="mr-1 h-4 w-4" />Ajouter</Button>}
      </div>

      <div className="grid min-w-0 max-w-full gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
        <div className="min-w-0 space-y-3">
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
            <Summary label={isDebt ? 'Total restant dû' : 'Total à récupérer'} value={formatEuro(totalRemaining)} tone={isDebt ? 'text-rose-300' : 'text-emerald-300'} />
            <Summary label={isDebt ? 'Remboursé ce mois' : 'Récupéré ce mois'} value={formatEuro(repaidThisMonth)} tone="text-emerald-300" />
            <Summary label="Mensualité estimée" value={formatEuro(estimatedMonthly)} tone="text-amber-300" help="selon les échéances renseignées" />
          </div>

          <Card className="nf-card-hover">
            <CardContent className="p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300"><WalletCards className="h-4 w-4 text-indigo-300" />Répartition</div>
              {pieData.length ? (
                <div className="grid items-center gap-3 sm:grid-cols-[170px_1fr]">
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={66} paddingAngle={1}>
                          {pieData.map((item,index) => <Cell key={item.id} fill={colors[index%colors.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value:number) => formatEuro(value)} contentStyle={{backgroundColor:'#020617',border:'1px solid #475569',borderRadius:'10px'}} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1">
                    {pieData.slice(0,6).map((item,index) => {
                      const pct = totalRemaining > 0 ? Math.round(item.value/totalRemaining*100) : 0
                      return <button key={item.id} onClick={() => setSelectedId(item.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-800/50"><span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:colors[index%colors.length]}}/><span className="min-w-0 flex-1 truncate text-xs text-slate-300">{item.name}</span><span className="text-[11px] text-slate-500">{pct}%</span></button>
                    })}
                  </div>
                </div>
              ) : <div className="flex h-36 items-center justify-center text-xs text-slate-600">Aucun engagement actif.</div>}
            </CardContent>
          </Card>
        </div>

        <Card className="nf-card-hover min-w-0 max-w-full">
          <CardContent className="min-w-0 p-0">
            <div className="border-b border-slate-800/70 px-3 py-2 text-sm font-semibold text-slate-200">{isDebt ? 'Mes dettes' : 'Mes créances'}</div>
            {active.length === 0 ? (
              <div className="p-8 text-center"><Handshake className="mx-auto h-6 w-6 text-slate-700"/><p className="mt-2 text-sm text-slate-500">{isDebt ? 'Aucune dette enregistrée.' : 'Aucune créance enregistrée.'}</p></div>
            ) : (
              <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-[620px] text-xs">
                  <thead className="bg-slate-950/40 text-slate-500"><tr><th className="px-3 py-2 text-left">Nom</th><th className="px-3 py-2 text-left">Personne / organisme</th><th className="px-3 py-2 text-right">Restant</th><th className="px-3 py-2 text-right">Fin prévue</th><th className="px-3 py-2 text-right">Statut</th></tr></thead>
                  <tbody>
                    {active.map(dette => {
                      const reste = getReste(dette)
                      const selectedRow = selected?.id === dette.id
                      return <tr key={dette.id} onClick={() => setSelectedId(dette.id)} className={'cursor-pointer border-t border-slate-800/60 transition hover:bg-slate-800/30 ' + (selectedRow ? 'bg-indigo-500/[0.06]' : '')}><td className="px-3 py-2.5 font-medium text-slate-200"><span>{dette.titre}</span>{dette.mode === 'credit' && <span className="ml-2 rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-medium text-indigo-300">Crédit</span>}</td><td className="px-3 py-2.5 text-slate-500">{dette.personne}</td><td className="px-3 py-2.5 text-right font-semibold text-slate-200">{formatEuro(reste)}</td><td className="px-3 py-2.5 text-right text-slate-500">{dette.date_echeance ? formatDate(dette.date_echeance) : '—'}</td><td className="px-3 py-2.5 text-right"><span className={'rounded-md px-2 py-1 text-[10px] ' + (reste <= 0 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-indigo-500/10 text-indigo-300')}>{reste <= 0 ? 'Soldé' : 'En cours'}</span></td></tr>
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selected && (
        <DetteDetail
          dette={selected}
          rembList={rembData.filter(r => r.dette_id === selected.id)}
          onUpdate={data => update.mutateAsync(data)}
          onAddRemboursement={data => addRemboursement.mutateAsync(data).then(() => undefined)}
          onRemoveRemboursement={id => removeRemboursement.mutateAsync(id)}
          onUpdateRemboursement={data => updateRemboursement.mutateAsync(data)}
          onArchive={id => archive.mutateAsync(id)}
          onUnarchive={id => unarchive.mutateAsync(id)}
        />
      )}

      {archived.length > 0 && (
        <details className="rounded-xl border border-slate-800/60 bg-slate-950/20 p-3">
          <summary className="cursor-pointer text-sm text-slate-500">Archives ({archived.length})</summary>
          <div className="mt-3 space-y-2">
            {archived.map(dette => <DetteDetail key={dette.id} dette={dette} rembList={rembData.filter(r => r.dette_id === dette.id)} onUpdate={data => update.mutateAsync(data)} onAddRemboursement={data => addRemboursement.mutateAsync(data).then(() => undefined)} onRemoveRemboursement={id => removeRemboursement.mutateAsync(id)} onUpdateRemboursement={data => updateRemboursement.mutateAsync(data)} onArchive={id => archive.mutateAsync(id)} onUnarchive={id => unarchive.mutateAsync(id)} />)}
          </div>
        </details>
      )}
    </section>
  )
}

function Summary({label,value,tone,help}:{label:string;value:string;tone:string;help?:string}) {
  return <Card className="nf-card-hover min-w-0"><CardContent className="min-w-0 p-3"><p className="text-[10px] text-slate-500">{label}</p><p className={'mt-1 break-words text-base font-bold '+tone}>{value}</p>{help&&<p className="mt-1 text-[9px] text-slate-700">{help}</p>}</CardContent></Card>
}
