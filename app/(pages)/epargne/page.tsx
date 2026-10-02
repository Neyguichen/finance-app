'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArchiveRestore, ChevronDown, PiggyBank, Plus } from 'lucide-react'

import { useApp } from '@/components/AppContext'
import MonthSelector from '@/components/layout/MonthSelector'
import EpargneResume from '@/components/pages/epargne/EpargneResume'
import EnveloppeCard from '@/components/pages/epargne/EnveloppeCard'
import EnveloppeEditDialog from '@/components/pages/epargne/EnveloppeEditDialog'
import EnveloppeForm from '@/components/pages/epargne/EnveloppeForm'
import SavingsInitializationDialog from '@/components/pages/epargne/SavingsInitializationDialog'
import EnveloppeDetailPanel from '@/components/pages/epargne/EnveloppeDetailPanel'
import MouvementForm from '@/components/pages/epargne/MouvementForm'
import { MouvementEditDialog, MouvementScopeDialog, MouvementDeleteDialog } from '@/components/pages/epargne/MouvementDialogs'
import DettesPanel from '@/components/pages/epargne/DettesPanel'
import { Button } from '@/components/ui/button'

import { useEnveloppes, useMouvements, useEpargneRecurrentes } from '@/lib/hooks/useEpargne'
import { useEnveloppesAtMonth } from '@/lib/hooks/useEnveloppesAtMonth'
import { usePlannedSavings } from '@/lib/hooks/usePlannedSavings'
import { useAdminMoisData } from '@/lib/hooks/useAdminMoisData'
import { useSavingsHistory } from '@/lib/hooks/useSavingsHistory'

type MovementType = 'epargne' | 'reprise' | 'transfert'
type SortMode = 'az' | 'balance'

export default function EpargnePage() {
  const { moisId, month, setMonth, espace, isAdminViewing } = useApp()
  const [section, setSection] = useState<'savings' | 'debts'>('savings')
  const [sortMode, setSortMode] = useState<SortMode>('az')
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string | null>(null)
  const [movementType, setMovementType] = useState<MovementType>('epargne')
  const [movementSourceId, setMovementSourceId] = useState<string | null>(null)
  const [movementDestId, setMovementDestId] = useState<string | null>(null)
  const [openMvt, setOpenMvt] = useState(false)
  const [openEnvelope, setOpenEnvelope] = useState(false)
  const [openSavingsInitialization, setOpenSavingsInitialization] = useState(false)

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search)
      setSection(params.get('view') === 'debts' ? 'debts' : 'savings')
      const requestedEnvelope = params.get('selectedEnvelope')
      if (requestedEnvelope) setSelectedEnvelopeId(requestedEnvelope)
    }
    syncFromUrl()
    window.addEventListener('popstate', syncFromUrl)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [])

  const changeSection = (next: 'savings' | 'debts') => {
    setSection(next)
    const url = new URL(window.location.href)
    if (next === 'debts') url.searchParams.set('view', 'debts')
    else url.searchParams.delete('view')
    window.history.replaceState({}, '', url.toString())
  }

  const { create: createEnv, update: updateEnv, archive, unarchive } = useEnveloppes(espace?.id)
  const { data: enveloppes = [] } = useEnveloppesAtMonth(espace?.id, month)
  const { data: mouvements = [], create: createMvt, update: updateMvt, remove: removeMvt, removeDefinitif } = useMouvements(moisId)
  const { data: plannedSavings = [] } = usePlannedSavings(isAdminViewing ? undefined : moisId)
  const { create: createRecurrent, update: updateRecurrent } = useEpargneRecurrentes(espace?.id)
  const { data: adminData } = useAdminMoisData(month)
  const savingsHistory = useSavingsHistory(espace?.id)

  const effectiveEnveloppes = isAdminViewing ? (adminData?.enveloppes || []) : enveloppes
  const effectiveMouvements = isAdminViewing ? (adminData?.mouvements_epargne || []) : mouvements
  const effectivePlannedSavings = isAdminViewing ? [] : plannedSavings

  const activeEnvelopes = effectiveEnveloppes.filter((env: any) => !env.archived)
  const archivedEnvelopes = effectiveEnveloppes.filter((env: any) => env.archived)

  const sortedEnvelopes = useMemo(() => {
    const copy = [...activeEnvelopes]
    if (sortMode === 'balance') return copy.sort((a:any,b:any) => Number(b.solde)-Number(a.solde))
    return copy.sort((a:any,b:any) => String(a.nom).localeCompare(String(b.nom), 'fr', { sensitivity:'base' }))
  }, [activeEnvelopes, sortMode])

  useEffect(() => {
    if (!sortedEnvelopes.length) {
      setSelectedEnvelopeId(null)
      return
    }
    if (!selectedEnvelopeId || !sortedEnvelopes.some((env:any) => env.id === selectedEnvelopeId)) {
      setSelectedEnvelopeId(sortedEnvelopes[0].id)
    }
  }, [sortedEnvelopes, selectedEnvelopeId])

  const selectedEnvelope = sortedEnvelopes.find((env:any) => env.id === selectedEnvelopeId) || null

  const totalEpargne = effectiveMouvements.filter((m:any) => m.type === 'epargne').reduce((sum:number,m:any) => sum + Number(m.montant),0)
  const totalReprise = effectiveMouvements.filter((m:any) => m.type === 'reprise').reduce((sum:number,m:any) => sum + Number(m.montant),0)
  const totalDisponible = activeEnvelopes.reduce((sum:number,env:any) => sum + Number(env.solde),0)

  const monthlyNetFor = (envId:string) => effectiveMouvements.reduce((sum:number,m:any) => {
    if (m.type === 'epargne' && m.enveloppe_dest_id === envId) return sum + Number(m.montant)
    if (m.type === 'reprise' && m.enveloppe_source_id === envId) return sum - Number(m.montant)
    if (m.type === 'transfert') {
      if (m.enveloppe_dest_id === envId) sum += Number(m.montant)
      if (m.enveloppe_source_id === envId) sum -= Number(m.montant)
    }
    return sum
  },0)

  const plannedFor = (envId:string) => effectivePlannedSavings
    .filter((item:any) => item.enveloppe_dest_id === envId)
    .reduce((sum:number,item:any) => sum + Number(item.montant),0)

  const getEnvNom = (id:string|null) => effectiveEnveloppes.find((env:any) => env.id === id)?.nom || '—'

  const [editEnv, setEditEnv] = useState<any|null>(null)
  const [editMvt, setEditMvt] = useState<{ id:string; montant:number; note:string|null; recurrentId:string|null }|null>(null)
  const [scopeMvt, setScopeMvt] = useState<{ id:string; montant:number; note:string|null; recurrentId:string }|null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id:string; recurrentId:string|null; note:string|null }|null>(null)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    if (!isAdminViewing && moisId && new URLSearchParams(window.location.search).get('add') === 'movement') {
      setMovementType('epargne')
      setOpenMvt(true)
    }
  }, [isAdminViewing, moisId])

  const openMovement = (type:MovementType, envelopeId?:string) => {
    setMovementType(type)
    setMovementSourceId(type === 'reprise' ? (envelopeId || null) : null)
    setMovementDestId(type === 'epargne' ? (envelopeId || null) : null)
    setOpenMvt(true)
  }

  const handleCreateEnvelope = async (data: { nom: string; objectif: number | null; solde_initial: number | null }) => {
    if (!data.nom.trim() || !espace || isAdminViewing) return
    const initial = Number(data.solde_initial || 0)
    const created = await createEnv.mutateAsync({
      espace_id: espace.id,
      nom: data.nom.trim(),
      solde_initial: initial,
      solde: initial,
      objectif: data.objectif,
      ordre: effectiveEnveloppes.length,
    })
    setOpenEnvelope(false)
    setSelectedEnvelopeId(created.id)
  }

  const handleCreateEnvelopeInline = async (name:string) => {
    if (isAdminViewing || !espace) throw new Error('Budget indisponible')
    const created = await createEnv.mutateAsync({
      espace_id: espace.id, nom:name, solde_initial:0, solde:0, objectif:null, ordre:effectiveEnveloppes.length,
    })
    return { id:created.id }
  }

  const handleInitializeSavings = async (date: string, balances: Array<{ id: string; balance: number }>) => {
    if (isAdminViewing) return
    for (const item of balances) {
      await updateEnv.mutateAsync({
        id: item.id,
        solde_reference: item.balance,
        date_solde_reference: date,
      })
    }
  }

  const handleSaveEditEnv = async (data:any) => {
    if (isAdminViewing) return
    await updateEnv.mutateAsync(data)
    setEditEnv(null)
  }

  const handleCreateMvt = async (data:{ type:MovementType; montant:number; note:string|null; sourceId:string|null; destId:string|null; frequence:number }) => {
    if (isAdminViewing || !moisId || !espace || data.montant <= 0) return
    if (data.type === 'reprise' && !data.sourceId) return
    if (data.type === 'epargne' && !data.destId) return
    if (data.type === 'transfert' && (!data.sourceId || !data.destId)) return

    if (data.frequence === 0) {
      await createMvt.mutateAsync({
        mois_id:moisId, recurrent_id:null, enveloppe_source_id:data.sourceId, enveloppe_dest_id:data.destId,
        montant:data.montant, type:data.type, date:month, note:data.note,
      })
    } else {
      const rec = await createRecurrent.mutateAsync({
        espace_id:espace.id, enveloppe_dest_id:data.destId!, montant:data.montant, actif:true,
        frequence_mois:data.frequence, note:data.note, ordre:0, mois_debut:month,
      })
      await createMvt.mutateAsync({
        mois_id:moisId, recurrent_id:rec.id, enveloppe_source_id:null, enveloppe_dest_id:data.destId,
        montant:data.montant, type:'epargne', date:month, note:data.note,
      })
    }
    setOpenMvt(false)
  }

  const handleEditMvtSave = (id:string,montant:number,note:string|null,recurrentId:string|null) => {
    if (isAdminViewing) return
    if (recurrentId) setScopeMvt({id,montant,note,recurrentId})
    else updateMvt.mutateAsync({id,montant,note})
    setEditMvt(null)
  }

  const handleScopeEditMvt = async (scope:'mois'|'tous') => {
    if (isAdminViewing || !scopeMvt) return
    await updateMvt.mutateAsync({id:scopeMvt.id,montant:scopeMvt.montant,note:scopeMvt.note})
    if (scope === 'tous') await updateRecurrent.mutateAsync({id:scopeMvt.recurrentId,montant:scopeMvt.montant,note:scopeMvt.note})
    setScopeMvt(null)
  }

  const handleDeleteMvt = (mode:'mois'|'definitif') => {
    if (isAdminViewing || !deleteTarget) return
    if (mode === 'definitif' && deleteTarget.recurrentId) removeDefinitif.mutate({mouvementId:deleteTarget.id,recurrentId:deleteTarget.recurrentId})
    else removeMvt.mutate(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} showPreparationAction={false} />
      <div className="mx-auto max-w-7xl space-y-3 p-3 pb-24 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">Épargne & Dette</h1>
          <div className="grid grid-cols-2 rounded-xl border border-slate-800/80 bg-slate-950/35 p-1">
            <button type="button" onClick={() => changeSection('savings')} className={'rounded-lg px-5 py-2 text-sm font-medium transition ' + (section === 'savings' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300')}>Épargne</button>
            <button type="button" onClick={() => changeSection('debts')} className={'rounded-lg px-5 py-2 text-sm font-medium transition ' + (section === 'debts' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300')}>Dette</button>
          </div>
        </div>

        {section === 'savings' ? (
          <div className="space-y-3">
            <EpargneResume
              totalDisponible={totalDisponible}
              totalEpargne={totalEpargne}
              totalReprise={totalReprise}
              enveloppes={activeEnvelopes.map((env:any) => ({id:env.id,name:env.nom,balance:Number(env.solde)}))}
              onSave={() => openMovement('epargne')}
              onWithdraw={() => openMovement('reprise')}
              onTransfer={() => openMovement('transfert')}
              readOnly={isAdminViewing}
            />

            <div className="grid gap-3 xl:grid-cols-[1.35fr_.9fr]">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-100">Mes enveloppes d’épargne</h2>
                  <label className="relative ml-auto">
                    <select value={sortMode} onChange={event => setSortMode(event.target.value as SortMode)} className="h-8 appearance-none rounded-lg border border-slate-700 bg-slate-950 pl-3 pr-8 text-xs text-slate-300 outline-none">
                      <option value="az">A → Z</option>
                      <option value="balance">Solde</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"/>
                  </label>
                  {!isAdminViewing && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setOpenSavingsInitialization(true)}>Initialiser l’épargne</Button>
                      <Button size="sm" onClick={() => setOpenEnvelope(true)}><Plus className="mr-1 h-4 w-4"/>Nouvelle enveloppe</Button>
                    </div>
                  )}
                </div>

                {sortedEnvelopes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/20 p-8 text-center"><PiggyBank className="mx-auto h-7 w-7 text-slate-700"/><p className="mt-2 text-sm text-slate-500">Aucune enveloppe active.</p></div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2">
                    {sortedEnvelopes.map((env:any) => (
                      <EnveloppeCard
                        key={env.id}
                        env={env}
                        readOnly={isAdminViewing}
                        selected={selectedEnvelopeId === env.id}
                        monthlyNet={monthlyNetFor(env.id)}
                        onSelect={() => setSelectedEnvelopeId(env.id)}
                        onEdit={setEditEnv}
                        onArchive={id => archive.mutate(id)}
                      />
                    ))}
                  </div>
                )}

                {archivedEnvelopes.length > 0 && (
                  <div>
                    <button onClick={() => setShowArchived(!showArchived)} className="text-xs text-slate-500 hover:text-slate-300">{showArchived ? '▼' : '▶'} Archivées ({archivedEnvelopes.length})</button>
                    {showArchived && <div className="mt-2 grid gap-2 sm:grid-cols-2">{archivedEnvelopes.map((env:any) => <div key={env.id} className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-950/20 px-3 py-2"><div><p className="text-sm text-slate-400">{env.nom}</p><p className="text-xs text-slate-600">{Number(env.solde).toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}</p></div>{!isAdminViewing&&<button onClick={()=>unarchive.mutate(env.id)} className="rounded-md p-2 text-slate-500 hover:text-indigo-300" title="Désarchiver"><ArchiveRestore className="h-4 w-4"/></button>}</div>)}</div>}
                  </div>
                )}
              </div>

              {selectedEnvelope && (
                <EnveloppeDetailPanel
                  env={selectedEnvelope}
                  movements={(savingsHistory.data?.movements || []) as any}
                  currentMonth={month.slice(0,7)}
                  plannedMonthly={plannedFor(selectedEnvelope.id)}
                  onSave={() => openMovement('epargne', selectedEnvelope.id)}
                  onWithdraw={() => openMovement('reprise', selectedEnvelope.id)}
                  onTransfer={() => openMovement('transfert')}
                />
              )}
            </div>

            <div className="rounded-xl border border-slate-800/70 bg-slate-900/50">
              <div className="border-b border-slate-800/70 px-3 py-2 text-sm font-semibold text-slate-200">Mouvements du mois</div>
              {effectiveMouvements.length === 0 ? <p className="p-5 text-center text-xs text-slate-600">Aucun mouvement ce mois.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-xs">
                    <thead className="bg-slate-950/30 text-slate-500"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Enveloppe</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-right">Montant</th><th className="px-3 py-2 text-left">Note</th><th className="w-20"></th></tr></thead>
                    <tbody>{effectiveMouvements.map((mvt:any) => {
                      const destination = mvt.type === 'epargne' ? getEnvNom(mvt.enveloppe_dest_id) : mvt.type === 'reprise' ? getEnvNom(mvt.enveloppe_source_id) : getEnvNom(mvt.enveloppe_source_id) + ' → ' + getEnvNom(mvt.enveloppe_dest_id)
                      const positive = mvt.type === 'epargne'
                      return <tr key={mvt.id} className="border-t border-slate-800/50"><td className="px-3 py-2 text-slate-500">{String(mvt.date).slice(0,10)}</td><td className="px-3 py-2 text-slate-300">{destination}</td><td className="px-3 py-2 text-slate-400">{mvt.type === 'epargne' ? 'Épargne' : mvt.type === 'reprise' ? 'Reprise' : 'Transfert'}</td><td className={'px-3 py-2 text-right font-semibold ' + (positive ? 'text-emerald-300' : mvt.type === 'reprise' ? 'text-rose-300' : 'text-cyan-300')}>{positive ? '+' : mvt.type === 'reprise' ? '−' : ''}{Number(mvt.montant).toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}</td><td className="max-w-[220px] truncate px-3 py-2 text-slate-600">{mvt.note || '—'}</td><td className="px-2 py-2 text-right">{!isAdminViewing&&<><button className="px-1 text-slate-600 hover:text-indigo-300" onClick={()=>setEditMvt({id:mvt.id,montant:Number(mvt.montant),note:mvt.note||null,recurrentId:mvt.recurrent_id||null})}>✎</button><button className="px-1 text-slate-700 hover:text-rose-400" onClick={()=>setDeleteTarget({id:mvt.id,recurrentId:mvt.recurrent_id||null,note:mvt.note||null})}>×</button></>}</td></tr>
                    })}</tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : <DettesPanel />}

        <EnveloppeEditDialog editEnv={editEnv} onClose={() => setEditEnv(null)} onSave={handleSaveEditEnv} />
        <MouvementForm
          open={openMvt}
          onOpenChange={setOpenMvt}
          enveloppesActives={activeEnvelopes}
          onCreateEnvelope={handleCreateEnvelopeInline}
          initialType={movementType}
          initialSourceId={movementSourceId}
          initialDestId={movementDestId}
          onSubmit={handleCreateMvt}
        />
        <MouvementEditDialog editMvt={editMvt} onClose={() => setEditMvt(null)} onSave={handleEditMvtSave} />
        <MouvementScopeDialog target={scopeMvt} onClose={() => setScopeMvt(null)} onSave={handleScopeEditMvt} />
        <MouvementDeleteDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} onDelete={handleDeleteMvt} />

        <EnveloppeForm open={openEnvelope} onOpenChange={setOpenEnvelope} onSubmit={handleCreateEnvelope} />
        <SavingsInitializationDialog
          open={openSavingsInitialization}
          onOpenChange={setOpenSavingsInitialization}
          envelopes={activeEnvelopes as any[]}
          onSave={handleInitializeSavings}
        />
      </div>
    </div>
  )
}
