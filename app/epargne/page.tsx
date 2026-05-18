'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import MonthSelector from '@/components/layout/MonthSelector'
import { useEnveloppes, useMouvements, useEpargneRecurrentes } from '@/lib/hooks/useEpargne'
import { useEnveloppesAtMonth } from '@/lib/hooks/useEnveloppesAtMonth'
import { formatEuro } from '@/lib/utils'
import { useApp } from '@/components/AppContext'
import { useAdminMoisData } from '@/lib/hooks/useAdminMoisData'

const FREQUENCES = [
  { value: 0, label: 'Ponctuel' },
  { value: 1, label: 'Mensuel' },
  { value: 3, label: 'Trimestriel' },
  { value: 6, label: 'Semestriel' },
  { value: 12, label: 'Annuel' },
]

export default function EpargnePage() {
  const { moisId, month, setMonth, espace } = useApp()
  const { create: createEnv, update: updateEnv, archive, unarchive } = useEnveloppes(espace?.id)
  const { data: enveloppes = [] } = useEnveloppesAtMonth(espace?.id, month)
  const { data: mouvements = [], create: createMvt, update: updateMvt, remove: removeMvt, removeDefinitif } = useMouvements(moisId)
  const { create: createRecurrent, update: updateRecurrent } = useEpargneRecurrentes(espace?.id)

  const { isAdminViewing } = useApp()
  const { data: adminData } = useAdminMoisData(month)
  const effectiveEnveloppes = isAdminViewing ? (adminData?.enveloppes || []) : enveloppes
  const effectiveMouvements = isAdminViewing ? (adminData?.mouvements_epargne || []) : mouvements

  // Séparer actives et archivées
  const enveloppesActives = effectiveEnveloppes.filter((e: any) => !e.archived)
  const enveloppesVisibles = enveloppesActives.filter((env: any) =>
    Number(env.solde) !== 0 || (env.objectif && Number(env.objectif) > 0)
  )
  const enveloppesInactives = enveloppesActives.filter((env: any) =>
    Number(env.solde) === 0 && (!env.objectif || Number(env.objectif) === 0)
  )
  const enveloppesArchivees = effectiveEnveloppes.filter((e: any) => e.archived)

  // États création enveloppe
  const [openEnv, setOpenEnv] = useState(false)
  const [newEnvNom, setNewEnvNom] = useState('')
  const [newEnvObjectif, setNewEnvObjectif] = useState<number | null>(null)
  const [newEnvSolde, setNewEnvSolde] = useState<number | null>(null)

  // États édition enveloppe
  const [editEnv, setEditEnv] = useState<{ id: string; nom: string; objectif: number | null; solde: number; solde_initial: number } | null>(null)
  const [editEnvNom, setEditEnvNom] = useState('')
  const [editEnvObjectif, setEditEnvObjectif] = useState<number | null>(null)
  const [editEnvSolde, setEditEnvSolde] = useState<number>(0)
  const [editEnvSoldeInitial, setEditEnvSoldeInitial] = useState(0)

  // Afficher/masquer archivées
  const [showArchived, setShowArchived] = useState(false)

  // États mouvement
  const [openMvt, setOpenMvt] = useState(false)
  const [mvtType, setMvtType] = useState<'epargne' | 'reprise' | 'transfert'>('epargne')
  const [mvtMontant, setMvtMontant] = useState(0)
  const [mvtNote, setMvtNote] = useState('')
  const [mvtSourceId, setMvtSourceId] = useState('')
  const [mvtDestId, setMvtDestId] = useState('')
  const [mvtFreq, setMvtFreq] = useState(1)

  // État suppression mouvement
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; recurrentId: string | null; note: string | null } | null>(null)

  // États édition mouvement
  const [editMvt, setEditMvt] = useState<{ id: string; montant: number; note: string | null; recurrentId: string | null } | null>(null)
  const [editMvtMontant, setEditMvtMontant] = useState(0)
  const [editMvtNote, setEditMvtNote] = useState('')

  // État choix de scope mouvement
  const [scopeMvt, setScopeMvt] = useState<{ id: string; montant: number; note: string | null; recurrentId: string } | null>(null)

  // Speed Dial FAB
  const [fabOpen, setFabOpen] = useState(false)

  // Masquer les enveloppes inactives
  const [showInactiveEnv, setShowInactiveEnv] = useState(false)

  // Totaux du mois
  const totalEpargne = effectiveMouvements.filter((m: any) => m.type === 'epargne').reduce((s: number, m: any) => s + Number(m.montant), 0)
  const totalReprise = effectiveMouvements.filter((m: any) => m.type === 'reprise').reduce((s: number, m: any) => s + Number(m.montant), 0)

  // Total disponible en épargne (somme des soldes)
  const totalDisponible = enveloppesActives.reduce((s: number, e: any) => s + Number(e.solde), 0)

  const handleCreateEnv = async () => {
    if (isAdminViewing || !espace || !newEnvNom.trim()) return
    await createEnv.mutateAsync({
      espace_id: espace.id,
      nom: newEnvNom.trim(),
      solde_initial: newEnvSolde ?? 0,
      solde: newEnvSolde ?? 0,
      objectif: newEnvObjectif,
      ordre: effectiveEnveloppes.length,
    })
    setNewEnvNom('')
    setNewEnvObjectif(null)
    setNewEnvSolde(null)
    setOpenEnv(false)
  }

  const handleEditEnv = (env: { id: string; nom: string; objectif: number | null; solde: number; solde_initial: number }) => {
    setEditEnv(env)
    setEditEnvNom(env.nom)
    setEditEnvObjectif(env.objectif)
    setEditEnvSolde(Number(env.solde))
    setEditEnvSoldeInitial(Number(env.solde_initial))
  }

  const handleSaveEditEnv = async () => {
    if (isAdminViewing || !editEnv) return

    const oldInitial = Number(editEnv.solde_initial) || 0
    const diff = editEnvSoldeInitial - oldInitial

    await updateEnv.mutateAsync({
      id: editEnv.id,
      nom: editEnvNom,
      objectif: editEnvObjectif,
      solde_initial: editEnvSoldeInitial,
      solde: Number(editEnv.solde) + diff,
    })
    setEditEnv(null)
  }

  const handleCreateMvt = async () => {
    if (isAdminViewing || !moisId || !espace || mvtMontant <= 0) return
    const freq = mvtType === 'epargne' ? mvtFreq : 0
    const sourceId = (mvtType === 'reprise' || mvtType === 'transfert') ? (mvtSourceId || null) : null
    const destId = (mvtType === 'epargne' || mvtType === 'transfert') ? (mvtDestId || null) : null

    const montantNum = parseFloat(String(mvtMontant))
    if (isNaN(montantNum) || montantNum <= 0) return
    if (mvtType === 'reprise' && !sourceId) return
    if (mvtType === 'epargne' && !destId) return
    if (mvtType === 'transfert' && (!sourceId || !destId)) return

    if (freq === 0) {
      await createMvt.mutateAsync({
        mois_id: moisId,
        recurrent_id: null,
        enveloppe_source_id: sourceId,
        enveloppe_dest_id: destId,
        montant: montantNum,
        type: mvtType,
        date: month,
        note: mvtNote || null,
      })
    } else {
      const rec = await createRecurrent.mutateAsync({
        espace_id: espace.id,
        enveloppe_dest_id: destId!,
        montant: montantNum,
        actif: true,
        frequence_mois: freq,
        note: mvtNote || null,
        ordre: 0,
        mois_debut: month,
      })
      await createMvt.mutateAsync({
        mois_id: moisId,
        recurrent_id: rec.id,
        enveloppe_source_id: null,
        enveloppe_dest_id: destId,
        montant: montantNum,
        type: 'epargne' as const,
        date: month,
        note: mvtNote || null,
      })
    }
    setMvtMontant(0)
    setMvtNote('')
    setMvtSourceId('')
    setMvtDestId('')
    setMvtFreq(1)
    setOpenMvt(false)
  }

  const handleDeleteMvt = (mode: 'mois' | 'definitif') => {
    if (isAdminViewing || !deleteTarget) return
    if (mode === 'definitif' && deleteTarget.recurrentId) {
      removeDefinitif.mutate({ mouvementId: deleteTarget.id, recurrentId: deleteTarget.recurrentId })
    } else {
      removeMvt.mutate(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  const handleEditMvt = (mvt: { id: string; montant: number; note: string | null; recurrentId: string | null }) => {
    setEditMvt(mvt)
    setEditMvtMontant(Number(mvt.montant))
    setEditMvtNote(mvt.note || '')
  }

  const handleSaveEditMvt = async () => {
    if (isAdminViewing || !editMvt) return
    if (editMvt.recurrentId) {
      setScopeMvt({
        id: editMvt.id,
        montant: editMvtMontant,
        note: editMvtNote || null,
        recurrentId: editMvt.recurrentId,
      })
      setEditMvt(null)
    } else {
      await updateMvt.mutateAsync({
        id: editMvt.id,
        montant: editMvtMontant,
        note: editMvtNote || null,
      })
      setEditMvt(null)
    }
  }

  const handleScopeEditMvt = async (scope: 'mois' | 'tous') => {
    if (isAdminViewing || !scopeMvt) return
    await updateMvt.mutateAsync({
      id: scopeMvt.id,
      montant: scopeMvt.montant,
      note: scopeMvt.note,
    })
    if (scope === 'tous') {
      await updateRecurrent.mutateAsync({
        id: scopeMvt.recurrentId,
        montant: scopeMvt.montant,
        note: scopeMvt.note,
      })
    }
    setScopeMvt(null)
  }

  const getEnvNom = (id: string | null) => effectiveEnveloppes.find((e: any) => e.id === id)?.nom || '—'

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />
      <div className="p-4 space-y-4 pb-24">
        <h1 className="text-xl font-bold">Épargne</h1>

        {/* DIALOG CRÉATION ENVELOPPE */}
        <Dialog open={openEnv} onOpenChange={setOpenEnv}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader><DialogTitle>Nouvelle enveloppe</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Nom (ex: Vacances)" value={newEnvNom} onChange={e => setNewEnvNom(e.target.value)} />
              <CalculatorInput value={newEnvObjectif ?? 0} onChange={v => setNewEnvObjectif(v || null)} placeholder="Objectif (optionnel)" />
              <CalculatorInput value={newEnvSolde ?? 0} onChange={v => setNewEnvSolde(v || null)} placeholder="Solde initial (optionnel)" />
              <Button className="w-full" onClick={handleCreateEnv}>Créer</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* TOTAUX DU MOIS */}
        <Card className="bg-teal-950 border-teal-800">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-emerald-400">💰 Total disponible</span>
              <span className="font-bold text-xl text-emerald-400">{formatEuro(totalDisponible)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Épargné ce mois</span>
              <span className="font-bold text-teal-400">{formatEuro(totalEpargne)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Repris ce mois</span>
              <span className="font-bold text-orange-400">{formatEuro(totalReprise)}</span>
            </div>
          </CardContent>
        </Card>

        {/* ENVELOPPES ACTIVES */}
        {(enveloppesActives.length > 1 || enveloppesActives.some((e: any) => e.objectif && Number(e.objectif) > 0)) && (
          <div>
            {enveloppesVisibles.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {enveloppesVisibles.map((env: any) => {
                  const pourcent = env.objectif ? Math.min(100, Math.round((Number(env.solde) / Number(env.objectif)) * 100)) : null
                  return (
                    <Card key={env.id} className="bg-slate-900 border-slate-800">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{env.nom}</p>
                          <div className="flex items-center gap-1">
                            {!isAdminViewing && (
                              <>
                                <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7"
                                  onClick={() => handleEditEnv({ id: env.id, nom: env.nom, objectif: env.objectif, solde: Number(env.solde), solde_initial: Number(env.solde_initial) || 0 })}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7"
                                  onClick={() => {
                                    if (isAdminViewing) return
                                    if (confirm(`Archiver "${env.nom}" ?`)) archive.mutate(env.id)
                                  }}>
                                  <Archive className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-lg font-bold text-emerald-400">{formatEuro(Number(env.solde))}</p>
                        {env.objectif && pourcent !== null && (
                          <>
                            <Progress value={pourcent} className="h-2" />
                            <p className="text-xs text-slate-500">
                              {pourcent}% — Objectif {formatEuro(Number(env.objectif))}
                            </p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
            {enveloppesInactives.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowInactiveEnv(!showInactiveEnv)}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showInactiveEnv ? '▼' : '▶'} Autres enveloppes ({enveloppesInactives.length})
                </button>
                {showInactiveEnv && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    {enveloppesInactives.map((env: any) => (
                      <Card key={env.id} className="bg-slate-900/50 border-slate-800 opacity-60">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">{env.nom}</p>
                            <div className="flex items-center gap-1">
                              {!isAdminViewing && (
                                <>
                                  <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7"
                                    onClick={() => handleEditEnv({ id: env.id, nom: env.nom, objectif: env.objectif, solde: Number(env.solde), solde_initial: Number(env.solde_initial) || 0 })}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7"
                                    onClick={() => {
                                      if (isAdminViewing) return
                                      if (confirm(`Archiver "${env.nom}" ?`)) archive.mutate(env.id)
                                    }}>
                                    <Archive className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          <p className="text-lg font-bold text-slate-400">{formatEuro(Number(env.solde))}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ENVELOPPES ARCHIVÉES */}
        {enveloppesArchivees.length > 0 && (
          <div>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showArchived ? '▼' : '▶'} Archivées ({enveloppesArchivees.length})
            </button>
            {showArchived && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                {enveloppesArchivees.map((env: any) => (
                  <Card key={env.id} className="bg-slate-900/50 border-slate-800 opacity-60">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{env.nom}</p>
                        <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7"
                          onClick={() => {
                            if (isAdminViewing) return
                            unarchive.mutate(env.id)
                          }}>
                          <ArchiveRestore className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <p className="text-lg font-bold text-slate-400">{formatEuro(Number(env.solde))}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TITRE MOUVEMENTS */}
        <h2 className="text-lg font-semibold">Mouvements du mois</h2>

        {/* DIALOG NOUVEAU MOUVEMENT */}
        <Dialog open={openMvt} onOpenChange={setOpenMvt}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader><DialogTitle>Nouveau mouvement</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Type</label>
                <div className="flex gap-2">
                  {(['epargne', 'reprise', 'transfert'] as const).map((t: any) => (
                    <button key={t} type="button" onClick={() => setMvtType(t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                        mvtType === t
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}>
                      {t === 'epargne' ? 'Épargner' : t === 'reprise' ? 'Reprendre' : 'Transférer'}
                    </button>
                  ))}
                </div>
              </div>
              <CalculatorInput value={mvtMontant} onChange={setMvtMontant} placeholder="Montant" />
              {(mvtType === 'epargne' || mvtType === 'transfert') && (
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Vers</label>
                  <select className="select select-bordered w-full bg-slate-800 border-slate-700"
                    value={mvtDestId} onChange={e => setMvtDestId(e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {enveloppesActives.map((env: any) => (
                      <option key={env.id} value={env.id}>{env.nom}</option>
                    ))}
                  </select>
                </div>
              )}
              {(mvtType === 'reprise' || mvtType === 'transfert') && (
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Depuis</label>
                  <select className="select select-bordered w-full bg-slate-800 border-slate-700"
                    value={mvtSourceId} onChange={e => setMvtSourceId(e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {enveloppesActives.map((env: any) => (
                      <option key={env.id} value={env.id}>{env.nom} ({formatEuro(Number(env.solde))})</option>
                    ))}
                  </select>
                </div>
              )}
              <Input placeholder="Note (optionnel)" value={mvtNote} onChange={e => setMvtNote(e.target.value)} />
              {mvtType === 'epargne' && (
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Récurrence</label>
                  <div className="grid flex-wrap gap-1">
                    {FREQUENCES.map((f: any) => (
                      <button key={f.value} type="button" onClick={() => setMvtFreq(f.value)}
                        className={`py-2 rounded-lg text-xs font-medium transition-colors flex-1 min-w-[4.5rem] ${
                          mvtFreq === f.value
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}>{f.label}</button>
                    ))}
                  </div>
                </div>
              )}
              <Button className="w-full" onClick={handleCreateMvt}>Ajouter</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* LISTE DES MOUVEMENTS */}
        <div className="space-y-2">
          {effectiveMouvements.map((mvt: any) => (
            <Card key={mvt.id} className="bg-slate-900 border-slate-800">
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      mvt.type === 'epargne' ? 'bg-teal-900 text-teal-400' :
                      mvt.type === 'reprise' ? 'bg-orange-900 text-orange-400' :
                      'bg-blue-900 text-blue-400'
                    }`}>
                      {mvt.type === 'epargne' ? '↓ Épargner' : mvt.type === 'reprise' ? '↑ Reprendre' : '↔ Transfert'}
                    </span>
                    {mvt.recurrent_id && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900 text-purple-400">↻</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    {mvt.type === 'epargne' && `→ ${getEnvNom(mvt.enveloppe_dest_id)}`}
                    {mvt.type === 'reprise' && `← ${getEnvNom(mvt.enveloppe_source_id)}`}
                    {mvt.type === 'transfert' && `${getEnvNom(mvt.enveloppe_source_id)} → ${getEnvNom(mvt.enveloppe_dest_id)}`}
                  </p>
                  {mvt.note && <p className="text-xs text-slate-500">{mvt.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${
                    mvt.type === 'epargne' ? 'text-teal-400' :
                    mvt.type === 'reprise' ? 'text-orange-400' : 'text-blue-400'
                  }`}>{formatEuro(Number(mvt.montant))}</span>
                  {!isAdminViewing && (
                    <>
                      <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                        onClick={() => handleEditMvt({ id: mvt.id, montant: Number(mvt.montant), note: mvt.note, recurrentId: mvt.recurrent_id })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                        onClick={() => setDeleteTarget({ id: mvt.id, recurrentId: mvt.recurrent_id, note: mvt.note })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {effectiveMouvements.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-4">Aucun mouvement ce mois</p>
          )}
        </div>

        {/* DIALOG ÉDITION ENVELOPPE */}
        <Dialog open={!!editEnv} onOpenChange={(v) => { if (!v) setEditEnv(null) }}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader><DialogTitle>Modifier l&apos;enveloppe</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Nom</label>
                <Input value={editEnvNom} onChange={e => setEditEnvNom(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Objectif (€)</label>
                <CalculatorInput value={editEnvObjectif ?? 0} onChange={v => setEditEnvObjectif(v || null)} placeholder="Laisser vide = pas d'objectif" />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Solde Initial (€)</label>
                <CalculatorInput value={editEnvSoldeInitial} onChange={setEditEnvSoldeInitial} placeholder="Solde initial" />
              </div>
              <Button className="w-full" onClick={handleSaveEditEnv}>Enregistrer</Button>
              <Button className="w-full" variant="ghost" onClick={() => setEditEnv(null)}>Annuler</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG ÉDITION MOUVEMENT */}
        <Dialog open={!!editMvt} onOpenChange={(v) => { if (!v) setEditMvt(null) }}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader><DialogTitle>Modifier le mouvement</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <CalculatorInput value={editMvtMontant} onChange={setEditMvtMontant} placeholder="Montant" />
              <Input placeholder="Note (optionnel)" value={editMvtNote}
                onChange={e => setEditMvtNote(e.target.value)} />
              <Button className="w-full" onClick={handleSaveEditMvt}>Enregistrer</Button>
              <Button className="w-full" variant="ghost" onClick={() => setEditMvt(null)}>Annuler</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG CHOIX DE SCOPE MOUVEMENT */}
        <Dialog open={!!scopeMvt} onOpenChange={(v) => { if (!v) setScopeMvt(null) }}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle>Modifier ce mouvement récurrent</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Button className="w-full" variant="outline" onClick={() => handleScopeEditMvt('mois')}>
                Ce mois seulement
              </Button>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={() => handleScopeEditMvt('tous')}>
                Tous les prochains mois
              </Button>
              <Button className="w-full" variant="ghost" onClick={() => setScopeMvt(null)}>
                Annuler
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG SUPPRESSION MOUVEMENT */}
        <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle>Supprimer ce mouvement ?</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Button className="w-full" variant="outline" onClick={() => handleDeleteMvt('mois')}>
                Ce mois seulement
              </Button>
              {deleteTarget?.recurrentId && (
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDeleteMvt('definitif')}>
                  Définitivement (ne plus reporter)
                </Button>
              )}
              <Button className="w-full" variant="ghost" onClick={() => setDeleteTarget(null)}>
                Annuler
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!isAdminViewing && (
        <>
          {fabOpen && (
            <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setFabOpen(false)} />
          )}
          <div className="fixed bottom-20 right-4 z-50 flex flex-col-reverse items-center gap-3">
            <button
              onClick={() => setFabOpen(!fabOpen)}
              className="w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
            >
              <Plus className={`w-7 h-7 transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`} />
            </button>
            {fabOpen && (
              <>
                <button
                  onClick={() => { setFabOpen(false); setOpenMvt(true) }}
                  className="flex items-center gap-2 animate-fade-in"
                >
                  <span className="bg-slate-600 text-white text-xs px-2 py-1 rounded-lg shadow">Mouvement</span>
                  <span className="w-11 h-11 rounded-full bg-primary text-white shadow-lg flex items-center justify-center text-lg">💰</span>
                </button>
                <button
                  onClick={() => { setFabOpen(false); setOpenEnv(true) }}
                  className="flex items-center gap-2 animate-fade-in"
                >
                  <span className="bg-slate-600 text-white text-xs px-2 py-1 rounded-lg shadow">Enveloppe</span>
                  <span className="w-11 h-11 rounded-full bg-primary text-white shadow-lg flex items-center justify-center text-lg">✉️</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}