'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArchiveRestore, ChevronDown, PiggyBank, Plus, Repeat2 } from 'lucide-react'

import { useApp } from '@/components/AppContext'
import MonthSelector from '@/components/layout/MonthSelector'
import EpargneResume from '@/components/pages/epargne/EpargneResume'
import EnveloppeCard from '@/components/pages/epargne/EnveloppeCard'
import EnveloppeEditDialog from '@/components/pages/epargne/EnveloppeEditDialog'
import EnveloppeForm from '@/components/pages/epargne/EnveloppeForm'
import SavingsInitializationDialog from '@/components/pages/epargne/SavingsInitializationDialog'
import EnveloppeDetailPanel from '@/components/pages/epargne/EnveloppeDetailPanel'
import SavingsMonthMovementsPanel from '@/components/pages/epargne/SavingsMonthMovementsPanel'
import PlannedSavingsValidationPanel from '@/components/pages/epargne/PlannedSavingsValidationPanel'
import MouvementForm from '@/components/pages/epargne/MouvementForm'
import { EpargneRecurrenceEditDialog, MouvementEditDialog, MouvementScopeDialog, MouvementDeleteDialog } from '@/components/pages/epargne/MouvementDialogs'
import DettesPanel from '@/components/pages/epargne/DettesPanel'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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
  const [openRecurringManager, setOpenRecurringManager] = useState(false)

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
  const { data: plannedSavings = [], updateOccurrence, validateOccurrence, ignoreOccurrence, restoreOccurrence } = usePlannedSavings(isAdminViewing ? undefined : moisId)
  const { data: savingsRecurrents = [], create: createRecurrent, update: updateRecurrent, updateFromMonth: updateRecurrentFromMonth } = useEpargneRecurrentes(espace?.id)
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
    if (selectedEnvelopeId && !sortedEnvelopes.some((env:any) => env.id === selectedEnvelopeId)) {
      setSelectedEnvelopeId(null)
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
    .filter((item:any) => item.enveloppe_dest_id === envId && item.statut !== 'ignored')
    .reduce((sum:number,item:any) => sum + Number(item.montant),0)

  const [editEnv, setEditEnv] = useState<any|null>(null)
  const [editMvt, setEditMvt] = useState<{ id:string; montant:number; note:string|null; recurrentId:string|null; date:string }|null>(null)
  const [scopeMvt, setScopeMvt] = useState<{ id:string; montant:number; note:string|null; recurrentId:string; date:string }|null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id:string; recurrentId:string|null; note:string|null }|null>(null)
  const [editRecurring, setEditRecurring] = useState<any|null>(null)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    if (isAdminViewing || !moisId) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('add') === 'movement') {
      setMovementType('epargne')
      setOpenMvt(true)
    }
    const movementId = params.get('focusMovement')
    if (movementId) {
      const movement: any = effectiveMouvements.find((item: any) => item.id === movementId)
      if (movement) setEditMvt({ id:movement.id, montant:Number(movement.montant), note:movement.note || null, recurrentId:movement.recurrent_id || null, date:String(movement.date).slice(0,10) })
    }
  }, [isAdminViewing, moisId, effectiveMouvements])

  const selectEnvelope = (id: string) => {
    setSelectedEnvelopeId(id)
    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      window.setTimeout(() => document.getElementById('savings-right-panel')?.scrollIntoView({ behavior:'smooth', block:'start' }), 0)
    }
  }

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

  const handleCreateMvt = async (data:{ type:MovementType; montant:number; note:string|null; sourceId:string|null; destId:string|null; frequence:number; jourPrevu:number; date:string }) => {
    if (isAdminViewing || !moisId || !espace || data.montant <= 0) return
    if (data.type === 'reprise' && !data.sourceId) return
    if (data.type === 'epargne' && !data.destId) return
    if (data.type === 'transfert' && (!data.sourceId || !data.destId)) return

    if (data.frequence === 0) {
      await createMvt.mutateAsync({
        mois_id:moisId, recurrent_id:null, enveloppe_source_id:data.sourceId, enveloppe_dest_id:data.destId,
        montant:data.montant, type:data.type, date:data.date || month, note:data.note,
      })
    } else {
      const rec = await createRecurrent.mutateAsync({
        espace_id:espace.id, enveloppe_dest_id:data.destId!, montant:data.montant, actif:true,
        frequence_mois:data.frequence, jour_prevu:data.jourPrevu || 1, note:data.note, ordre:0, mois_debut:month,
      })
      await createMvt.mutateAsync({
        mois_id:moisId, recurrent_id:rec.id, enveloppe_source_id:null, enveloppe_dest_id:data.destId,
        montant:data.montant, type:'epargne', date:data.date || month, note:data.note,
      })
    }
    setOpenMvt(false)
  }

  const handleEditMvtSave = (id:string,montant:number,note:string|null,recurrentId:string|null,date:string) => {
    if (isAdminViewing) return
    if (recurrentId) setScopeMvt({id,montant,note,recurrentId,date})
    else updateMvt.mutateAsync({id,montant,note,date})
    setEditMvt(null)
  }

  const handleScopeEditMvt = async (scope:'mois'|'tous') => {
    if (isAdminViewing || !scopeMvt) return
    await updateMvt.mutateAsync({id:scopeMvt.id,montant:scopeMvt.montant,note:scopeMvt.note,date:scopeMvt.date})
    if (scope === 'tous') {
      await updateRecurrentFromMonth.mutateAsync({
        id: scopeMvt.recurrentId,
        fromMonth: month,
        updates: { montant:scopeMvt.montant, note:scopeMvt.note },
      })
    }
    setScopeMvt(null)
  }

  const handleRecurringSave = async (data:{ id:string; montant:number; frequence_mois:number; jour_prevu:number; note:string|null }) => {
    if (isAdminViewing) return
    await updateRecurrentFromMonth.mutateAsync({
      id: data.id,
      fromMonth: month,
      updates: {
        montant: data.montant,
        frequence_mois: data.frequence_mois,
        jour_prevu: data.jour_prevu || 1,
        note: data.note,
      },
    })
    setEditRecurring(null)
  }

  const handleDeleteMvt = (mode:'mois'|'definitif') => {
    if (isAdminViewing || !deleteTarget) return
    if (mode === 'definitif' && deleteTarget.recurrentId) removeDefinitif.mutate({mouvementId:deleteTarget.id,recurrentId:deleteTarget.recurrentId})
    else removeMvt.mutate(deleteTarget.id)
    setDeleteTarget(null)
  }

  const handleValidatePlannedSavings = async (id:string, date:string, amount:number) => {
    if (isAdminViewing) return
    const occurrence:any = effectivePlannedSavings.find((item:any) => item.id === id)
    if (!occurrence) return
    if (Math.abs(Number(occurrence.montant) - amount) >= 0.001) {
      await updateOccurrence.mutateAsync({ id, montant: amount })
    }
    await validateOccurrence.mutateAsync({ id, date })
  }

  const plannedSavingsBusy =
    updateOccurrence.isPending ||
    validateOccurrence.isPending ||
    ignoreOccurrence.isPending ||
    restoreOccurrence.isPending

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />
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

            <PlannedSavingsValidationPanel
              occurrences={effectivePlannedSavings as any}
              envelopes={effectiveEnveloppes.map((env:any) => ({ id:env.id, nom:env.nom }))}
              month={month}
              readOnly={isAdminViewing}
              busy={plannedSavingsBusy}
              onValidate={handleValidatePlannedSavings}
              onIgnore={async id => { await ignoreOccurrence.mutateAsync(id) }}
              onRestore={async id => { await restoreOccurrence.mutateAsync(id) }}
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
                      <Button size="sm" variant="outline" onClick={() => setOpenRecurringManager(true)}><Repeat2 className="mr-1 h-4 w-4"/>Récurrences</Button>
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
                        onSelect={() => selectEnvelope(env.id)}
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

              <div id="savings-right-panel" className="scroll-mt-20">
              {selectedEnvelope ? (
                <EnveloppeDetailPanel
                  env={selectedEnvelope}
                  movements={(savingsHistory.data?.movements || []) as any}
                  currentMonthMovements={effectiveMouvements as any}
                  currentMonth={month.slice(0,7)}
                  plannedMonthly={plannedFor(selectedEnvelope.id)}
                  recurringSavings={savingsRecurrents.filter((item:any) => item.enveloppe_dest_id === selectedEnvelope.id)}
                  onEditRecurring={!isAdminViewing ? (recurring:any) => setEditRecurring(recurring) : undefined}
                  onUpdateRecurring={!isAdminViewing ? (updates:any) => updateRecurrent.mutate(updates) : undefined}
                  onSave={() => openMovement('epargne', selectedEnvelope.id)}
                  onWithdraw={() => openMovement('reprise', selectedEnvelope.id)}
                  onTransfer={() => openMovement('transfert')}
                  onEdit={!isAdminViewing ? () => setEditEnv(selectedEnvelope) : undefined}
                  onEditMovement={!isAdminViewing ? (movement:any) => setEditMvt({
                    id: movement.id,
                    montant: Number(movement.montant),
                    note: movement.note || null,
                    recurrentId: movement.recurrent_id || null,
                    date: String(movement.date).slice(0,10),
                  }) : undefined}
                  onDeleteMovement={!isAdminViewing ? (movement:any) => setDeleteTarget({
                    id: movement.id,
                    recurrentId: movement.recurrent_id || null,
                    note: movement.note || null,
                  }) : undefined}
                  onClose={() => setSelectedEnvelopeId(null)}
                />
              ) : (
                <SavingsMonthMovementsPanel
                  movements={effectiveMouvements as any}
                  envelopes={effectiveEnveloppes as any}
                  readOnly={isAdminViewing}
                  onEditMovement={!isAdminViewing ? (movement:any) => setEditMvt({
                    id: movement.id,
                    montant: Number(movement.montant),
                    note: movement.note || null,
                    recurrentId: movement.recurrent_id || null,
                    date: String(movement.date).slice(0,10),
                  }) : undefined}
                  onDeleteMovement={!isAdminViewing ? (movement:any) => setDeleteTarget({
                    id: movement.id,
                    recurrentId: movement.recurrent_id || null,
                    note: movement.note || null,
                  }) : undefined}
                />
              )}
              </div>
            </div>

          </div>
        ) : <DettesPanel />}

        <Dialog open={openRecurringManager} onOpenChange={setOpenRecurringManager}>
          <DialogContent className="max-w-2xl border-slate-700 bg-slate-900">
            <DialogHeader>
              <DialogTitle>Épargne récurrente</DialogTitle>
              <p className="text-xs text-slate-500">Vue globale des récurrences d’épargne, toutes enveloppes confondues.</p>
            </DialogHeader>
            <div className="max-h-[65vh] divide-y divide-slate-800/70 overflow-y-auto rounded-xl border border-slate-800/70">
              {savingsRecurrents.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">Aucune récurrence d’épargne.</p>
              ) : savingsRecurrents.map((rec:any) => {
                const envName = effectiveEnveloppes.find((env:any)=>env.id===rec.enveloppe_dest_id)?.nom || 'Enveloppe'
                const frequency = Number(rec.frequence_mois || 1)
                const frequencyLabel = frequency===1?'Tous les mois':frequency===12?'Tous les ans':'Tous les '+frequency+' mois'
                return (
                  <div key={rec.id} className="flex items-center gap-3 px-3 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300"><PiggyBank className="h-4 w-4"/></span>
                    <button type="button" onClick={()=>{setEditRecurring(rec);setOpenRecurringManager(false)}} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-semibold text-slate-200">{envName}</p>
                      <p className="text-[10px] text-slate-500">{frequencyLabel} · jour {Number(rec.jour_prevu || 1)} · {Number(rec.montant).toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}</p>
                    </button>
                    <span className={"rounded-full px-2 py-0.5 text-[9px] "+(rec.actif===false?'bg-slate-800 text-slate-500':'bg-emerald-500/10 text-emerald-300')}>{rec.actif===false?'Suspendue':'Active'}</span>
                    {!isAdminViewing && <Button size="sm" variant="ghost" onClick={()=>updateRecurrent.mutate({id:rec.id,actif:rec.actif===false})}>{rec.actif===false?'Réactiver':'Suspendre'}</Button>}
                  </div>
                )
              })}
            </div>
          </DialogContent>
        </Dialog>

        <EnveloppeEditDialog editEnv={editEnv} onClose={() => setEditEnv(null)} onSave={handleSaveEditEnv} />
        <MouvementForm
          open={openMvt}
          onOpenChange={setOpenMvt}
          enveloppesActives={activeEnvelopes}
          onCreateEnvelope={handleCreateEnvelopeInline}
          initialType={movementType}
          initialSourceId={movementSourceId}
          initialDestId={movementDestId}
          initialDate={month.slice(0, 10)}
          onSubmit={handleCreateMvt}
        />
        <MouvementEditDialog editMvt={editMvt} onClose={() => setEditMvt(null)} onSave={handleEditMvtSave} />
        <MouvementScopeDialog target={scopeMvt} onClose={() => setScopeMvt(null)} onSave={handleScopeEditMvt} />
        <MouvementDeleteDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} onDelete={handleDeleteMvt} />
        <EpargneRecurrenceEditDialog target={editRecurring} onClose={() => setEditRecurring(null)} onSave={handleRecurringSave} />

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
