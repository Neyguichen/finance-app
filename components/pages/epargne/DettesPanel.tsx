'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarClock, ChevronRight, Handshake, Plus, WalletCards } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import DebtFab from '@/components/pages/dette/DebtFab'
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
  const [createTab, setCreateTab] = useState<'je_dois' | 'jai_prete'>('je_dois')
  const [openRepayment, setOpenRepayment] = useState(false)
  const [repDebtId, setRepDebtId] = useState('')
  const [repAmount, setRepAmount] = useState('')
  const [repDate, setRepDate] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [repImpactsBudget, setRepImpactsBudget] = useState(false)
  const [repSaving, setRepSaving] = useState(false)
  const [repError, setRepError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'stats' | 'upcoming' | 'history'>('stats')
  const [historySort, setHistorySort] = useState<'recent' | 'oldest' | 'amount'>('recent')
  useEffect(() => {
    const v = sessionStorage.getItem('dettes_mobile_view')
    if (v === 'stats' || v === 'upcoming' || v === 'history') setMobileView(v)
    const sort = localStorage.getItem('dettes_history_sort')
    if (sort === 'recent' || sort === 'oldest' || sort === 'amount') setHistorySort(sort)
  }, [])

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
  const mobileDetail = [...active, ...archived].find(dette => dette.id === selectedId) || null
  const openDebtDetail = (id: string) => {
    setSelectedId(id)
    document.querySelector('main.overflow-y-auto')?.scrollTo({top: 0, behavior: 'instant'})
  }
  const upcoming = active.filter(dette => getReste(dette) > 0)
    .sort((a,b) => String(a.date_echeance || '9999').localeCompare(String(b.date_echeance || '9999')))
  const recorded = rembData.filter(r => [...active, ...archived].some(d => d.id === r.dette_id))
    .sort((a,b) => historySort === 'amount' ? Number(b.montant)-Number(a.montant)
      : historySort === 'oldest' ? String(a.date).localeCompare(String(b.date)) : String(b.date).localeCompare(String(a.date)))
  const changeMobileView = (view: typeof mobileView) => {
    setSelectedId(null)
    setMobileView(view)
    sessionStorage.setItem('dettes_mobile_view',view)
  }

  const openNewDebt = (type: 'je_dois' | 'jai_prete') => {
    setCreateTab(type)
    setOpenAdd(true)
  }
  const showRepayment = (debtId?: string) => {
    setRepDebtId(debtId || dettes.find(debt => !debt.archived)?.id || '')
    setRepAmount('')
    setRepDate(new Date().toLocaleDateString('en-CA'))
    setRepImpactsBudget(false)
    setRepError('')
    setOpenRepayment(true)
  }
  const recordRepayment = async () => {
    if (!repDebtId || !(Number(repAmount)>0) || !repDate || repSaving) return
    setRepSaving(true)
    setRepError('')
    try {
      await addRemboursement.mutateAsync({dette_id: repDebtId, montant:Number(repAmount), date:repDate, impacte_budget:repImpactsBudget})
      setOpenRepayment(false)
      setSelectedId(repDebtId)
    } catch (error) {
      setRepError(error instanceof Error ? error.message : 'Impossible de créer ce remboursement.')
    } finally { setRepSaving(false) }
  }

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
    const created = await create.mutateAsync({ espace_id: espace.id, type: createTab, ...data })
    setOpenAdd(false)
    if (created?.id) openDebtDetail(created.id)
  }

  const isDebt = tab === 'je_dois'

  return (
    <section className="debts-mobile-page min-w-0 max-w-full space-y-3">
      <DetteForm open={openAdd} onOpenChange={setOpenAdd} tab={createTab} onSubmit={handleAdd} />
      {!isAdminViewing && <DebtFab onDebt={() => openNewDebt('je_dois')} onClaim={() => openNewDebt('jai_prete')} onRepayment={() => showRepayment(mobileDetail?.archived ? undefined : mobileDetail?.id)} />}
      <Dialog open={openRepayment} onOpenChange={open => {if (!repSaving) setOpenRepayment(open)}}>
        <DialogContent className="debt-form-dialog max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter un remboursement</DialogTitle>
            <DialogDescription>Associer un paiement à une dette ou à une créance existante.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-xs text-slate-300">Dette ou créance concernée
              <select className="mt-1 h-11 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" value={repDebtId} onChange={event => setRepDebtId(event.target.value)}>
                <option value="">Choisir un engagement</option>
                {dettes.filter(debt => !debt.archived).map(debt => <option key={debt.id} value={debt.id}>{debt.type === 'je_dois' ? 'Je dois' : 'On me doit'} · {debt.titre}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="min-w-0 text-xs text-slate-300">Montant
                <Input className="mt-1 min-w-0" type="number" inputMode="decimal" min="0.01" step="0.01" value={repAmount} onChange={event => setRepAmount(event.target.value)} placeholder="0,00" />
              </label>
              <label className="min-w-0 text-xs text-slate-300">Date
                <Input className="mt-1 min-w-0" type="date" value={repDate} onChange={event => setRepDate(event.target.value)} />
              </label>
            </div>
            <div className="rounded-xl border border-slate-700/50 bg-slate-950/30 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input type="checkbox" className="checkbox checkbox-sm shrink-0" checked={repImpactsBudget} onChange={event => setRepImpactsBudget(event.target.checked)} />
                Inclure dans le solde du compte
              </label>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">Coche cette case si le paiement est réellement entré ou sorti du compte suivi dans ce budget. Sinon, il réduit la dette sans affecter le solde bancaire calculé.</p>
            </div>
            {repError && <p role="alert" className="rounded-lg bg-rose-500/10 p-2 text-xs text-rose-300">{repError}</p>}
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="ghost" className="min-w-0 flex-1" disabled={repSaving} onClick={() => setOpenRepayment(false)}>Annuler</Button>
            <Button className="min-w-0 flex-1" disabled={!repDebtId || !(Number(repAmount)>0) || !repDate || repSaving} onClick={() => void recordRepayment()}>{repSaving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center gap-2">
        <div className="grid grid-cols-2 rounded-xl border border-slate-800/80 bg-slate-950/35 p-1">
          <button type="button" onClick={() => { setTab('je_dois'); setSelectedId(null) }} className={'rounded-lg px-4 py-2 text-sm font-medium transition ' + (tab === 'je_dois' ? 'bg-rose-500/15 text-rose-300' : 'text-slate-500 hover:text-slate-300')}>Dettes</button>
          <button type="button" onClick={() => { setTab('jai_prete'); setSelectedId(null) }} className={'rounded-lg px-4 py-2 text-sm font-medium transition ' + (tab === 'jai_prete' ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-500 hover:text-slate-300')}>On me doit</button>
        </div>
        {!isAdminViewing && <Button size="sm" className="ml-auto hidden md:inline-flex" onClick={() => openNewDebt(tab)}><Plus className="mr-1 h-4 w-4" />Ajouter</Button>}
      </div>

      <nav aria-label="Vues des dettes" className="debts-mobile-tabs md:hidden">
        {([['stats','Statistiques'],['upcoming','À venir'],['history','Historique']] as const).map(([view,label]) => (
          <button type="button" key={view} aria-current={mobileView === view ? 'page' : undefined}
            className={'debts-mobile-tab '+(mobileView === view ? 'debts-mobile-tab-active':'')}
            onClick={() => changeMobileView(view)}>{label}
            {view === 'upcoming' && upcoming.length > 0 && <span className="debts-mobile-count">{upcoming.length}</span>}
          </button>
        ))}
      </nav>
      {mobileDetail && <div className="space-y-3 md:hidden">
        <button type="button" className="inline-flex min-h-10 items-center gap-2 text-sm text-indigo-300" onClick={() => setSelectedId(null)}>
          <ArrowLeft className="h-4 w-4" />Retour à la liste
        </button>
        <DetteDetail key={mobileDetail.id} dette={mobileDetail}
          rembList={rembData.filter(r => r.dette_id === mobileDetail.id)}
          onUpdate={data => update.mutateAsync(data)}
          onAddRemboursement={data => addRemboursement.mutateAsync(data).then(() => undefined)}
          onRemoveRemboursement={id => removeRemboursement.mutateAsync(id)}
          onUpdateRemboursement={data => updateRemboursement.mutateAsync(data)}
          onArchive={async id => {await archive.mutateAsync(id);setSelectedId(null)}}
          onUnarchive={async id => {await unarchive.mutateAsync(id);setSelectedId(null)}} />
      </div>}
      <section aria-label="Statistiques des dettes" className={mobileDetail ? 'hidden md:block' : mobileView === 'stats' ? 'block' : 'hidden md:block'}>
      <div className="grid min-w-0 max-w-full gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
        <div className="min-w-0 space-y-3">
          <div className="debts-summary-grid grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
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

        <Card className="nf-card-hover hidden min-w-0 max-w-full md:block">
          <CardContent className="min-w-0 p-0">
            <div className="border-b border-slate-800/70 px-3 py-2 text-sm font-semibold text-slate-200">{isDebt ? 'Mes dettes' : 'Mes créances'}</div>
            {active.length === 0 ? (
              <div className="p-8 text-center"><Handshake className="mx-auto h-6 w-6 text-slate-700"/><p className="mt-2 text-sm text-slate-500">{isDebt ? 'Aucune dette enregistrée.' : 'Aucune créance enregistrée.'}</p></div>
            ) : (
              <div className="hidden w-full max-w-full overflow-x-auto overscroll-x-contain md:block">
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
      <div className="space-y-2 md:hidden">
        <h3 className="text-sm font-semibold text-slate-200">{isDebt ? 'Mes dettes' : 'Mes créances'}</h3>
        {active.length === 0 ? <p className="debts-mobile-empty">Aucun engagement actif.</p> : active.map(dette => (
          <button type="button" key={dette.id} onClick={() => openDebtDetail(dette.id)}
            className="debts-mobile-entry flex w-full min-w-0 items-center gap-2 rounded-xl border p-3 text-left">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-100">{dette.titre}</p>
              <p className="mt-1 truncate text-xs text-slate-400">{dette.personne}</p>
              {dette.date_echeance && <p className="mt-1 text-xs text-slate-400">Fin : {formatDate(dette.date_echeance)}</p>}
            </div>
            <strong className="shrink-0 text-sm text-rose-300">{formatEuro(getReste(dette))}</strong>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
          </button>
        ))}
      </div>
      </section>

      <section aria-label="Échéances à venir" className={mobileDetail ? 'hidden' : mobileView === 'upcoming' ? 'space-y-2 md:hidden' : 'hidden'}>
        <div className="debts-mobile-entry rounded-xl border p-3">
          <h3 className="text-sm font-semibold text-slate-100">Échéances à venir</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">Les montants sont indicatifs, calculés à partir des données de chaque engagement : aucune opération n’est programmée automatiquement ici.</p>
        </div>
        {upcoming.length === 0 ? <p className="debts-mobile-empty">Aucune dette ou créance en cours.</p> : upcoming.map(dette => {
          const monthly = dette.mode === 'credit' ? Number(dette.mensualite || 0) + Number(dette.assurance_mensuelle || 0) : 0
          return <button type="button" key={dette.id} onClick={() => openDebtDetail(dette.id)} className="debts-mobile-entry flex w-full min-w-0 items-center gap-2 rounded-xl border p-3 text-left">
            <CalendarClock className="h-5 w-5 shrink-0 text-indigo-300" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-100">{dette.titre}</p>
              <p className="mt-1 text-xs text-slate-400">{dette.date_echeance ? 'Fin prévue : '+formatDate(dette.date_echeance) : 'Pas de date de fin renseignée'}</p>
              {monthly > 0 && <p className="mt-1 text-xs text-slate-300">Mensualité : {formatEuro(monthly)}</p>}
            </div>
            <span className="shrink-0 text-xs font-semibold text-amber-300">{formatEuro(getReste(dette))} restant</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
          </button>
        })}
      </section>

      <section aria-label="Historique des remboursements" className={mobileDetail ? 'hidden' : mobileView === 'history' ? 'space-y-2 md:hidden' : 'hidden'}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-100">Remboursements enregistrés</h3>
          <select value={historySort} aria-label="Trier les remboursements" className="min-w-0 max-w-[135px] rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-200"
            onChange={event => {const next = event.target.value as typeof historySort;setHistorySort(next);localStorage.setItem('dettes_history_sort',next)}}>
            <option value="recent">Plus récents</option><option value="oldest">Plus anciens</option><option value="amount">Montant</option>
          </select>
        </div>
        {recorded.length === 0 ? <p className="debts-mobile-empty">Aucun remboursement enregistré.</p> : recorded.map(item => (
          <button type="button" key={item.id} onClick={() => openDebtDetail(item.dette_id)}
            className="debts-mobile-entry flex w-full min-w-0 items-center gap-2 rounded-xl border p-3 text-left">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-100">{[...active,...archived].find(d => d.id === item.dette_id)?.titre || 'Engagement'}</p>
              <p className="mt-1 text-xs text-slate-400">{formatDate(item.date)}</p>
            </div>
            <strong className="shrink-0 text-sm font-semibold text-emerald-300">{formatEuro(Number(item.montant))}</strong>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
          </button>
        ))}
        {archived.length > 0 && <details className="debts-mobile-entry rounded-xl border p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-200">Engagements archivés ({archived.length})</summary>
          <div className="mt-3 space-y-2">
            {archived.map(dette => <button type="button" key={dette.id} onClick={() => openDebtDetail(dette.id)}
              className="flex w-full min-w-0 items-center gap-2 rounded-lg bg-slate-950/30 p-3 text-left">
              <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{dette.titre}</span>
              <span className="shrink-0 text-xs text-slate-300">{formatEuro(getReste(dette))}</span>
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </button>)}
          </div>
        </details>}
      </section>

      {selected && (
        <div className="hidden md:block"><DetteDetail
          dette={selected}
          rembList={rembData.filter(r => r.dette_id === selected.id)}
          onUpdate={data => update.mutateAsync(data)}
          onAddRemboursement={data => addRemboursement.mutateAsync(data).then(() => undefined)}
          onRemoveRemboursement={id => removeRemboursement.mutateAsync(id)}
          onUpdateRemboursement={data => updateRemboursement.mutateAsync(data)}
          onArchive={id => archive.mutateAsync(id)}
          onUnarchive={id => unarchive.mutateAsync(id)}
        /></div>
      )}

      {archived.length > 0 && (
        <details className="hidden rounded-xl border border-slate-800/60 bg-slate-950/20 p-3 md:block">
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
