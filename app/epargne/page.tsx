'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import MonthSelector from '@/components/layout/MonthSelector'
import { useEnveloppes, useMouvements, useEpargneRecurrentes } from '@/lib/hooks/useEpargne'
import { formatEuro } from '@/lib/utils'
import { useApp } from '@/components/AppContext'

const FREQUENCES = [
  { value: 0, label: 'Ponctuel' },
  { value: 1, label: 'Mensuel' },
  { value: 3, label: 'Trimestriel' },
  { value: 6, label: 'Semestriel' },
  { value: 12, label: 'Annuel' },
]

export default function EpargnePage() {
  const { moisId, month, setMonth, espace } = useApp()
  const { data: enveloppes = [], create: createEnv, update: updateEnv, archive, unarchive } = useEnveloppes(espace?.id)
  const { data: mouvements = [], create: createMvt, remove: removeMvt, removeDefinitif } = useMouvements(moisId)
  const { create: createRecurrent } = useEpargneRecurrentes(espace?.id)

  // Séparer actives et archivées
  const enveloppesActives = enveloppes.filter(e => !e.archived)
  const enveloppesArchivees = enveloppes.filter(e => e.archived)

  // États création enveloppe
  const [openEnv, setOpenEnv] = useState(false)
  const [newEnvNom, setNewEnvNom] = useState('')
  const [newEnvObjectif, setNewEnvObjectif] = useState<number | null>(null)

  // États édition enveloppe
  const [editEnv, setEditEnv] = useState<{ id: string; nom: string; objectif: number | null } | null>(null)
  const [editEnvNom, setEditEnvNom] = useState('')
  const [editEnvObjectif, setEditEnvObjectif] = useState<number | null>(null)

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

  // Totaux du mois
  const totalEpargne = mouvements.filter(m => m.type === 'epargne').reduce((s, m) => s + Number(m.montant), 0)
  const totalReprise = mouvements.filter(m => m.type === 'reprise').reduce((s, m) => s + Number(m.montant), 0)

  const handleCreateEnv = async () => {
    if (!espace || !newEnvNom.trim()) return
    await createEnv.mutateAsync({
      espace_id: espace.id,
      nom: newEnvNom.trim(),
      solde: 0,
      objectif: newEnvObjectif,
      ordre: enveloppes.length,
    })
    setNewEnvNom('')
    setNewEnvObjectif(null)
    setOpenEnv(false)
  }

  const handleEditEnv = (env: { id: string; nom: string; objectif: number | null }) => {
    setEditEnv(env)
    setEditEnvNom(env.nom)
    setEditEnvObjectif(env.objectif)
  }

  const handleSaveEditEnv = async () => {
    if (!editEnv) return
    await updateEnv.mutateAsync({
      id: editEnv.id,
      nom: editEnvNom,
      objectif: editEnvObjectif,
    })
    setEditEnv(null)
  }

  const handleCreateMvt = async () => {
    if (!moisId || !espace || mvtMontant <= 0) return

    if (mvtFreq === 0) {
      // Ponctuel
      await createMvt.mutateAsync({
        mois_id: moisId,
        recurrent_id: null,
        enveloppe_source_id: mvtType === 'reprise' || mvtType === 'transfert' ? mvtSourceId || null : null,
        enveloppe_dest_id: mvtType === 'epargne' || mvtType === 'transfert' ? mvtDestId || null : null,
        montant: mvtMontant,
        type: mvtType,
        date: month,
        note: mvtNote || null,
      })
    } else {
      // Récurrent : créer le modèle puis l'instance
      const rec = await createRecurrent.mutateAsync({
        espace_id: espace.id,
        enveloppe_dest_id: mvtDestId,
        montant: mvtMontant,
        actif: true,
        frequence_mois: mvtFreq,
        note: mvtNote || null,
        ordre: 0,
      })
      await createMvt.mutateAsync({
        mois_id: moisId,
        recurrent_id: rec.id,
        enveloppe_source_id: null,
        enveloppe_dest_id: mvtDestId || null,
        montant: mvtMontant,
        type: 'epargne',
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
    if (!deleteTarget) return
    if (mode === 'definitif' && deleteTarget.recurrentId) {
      removeDefinitif.mutate({ mouvementId: deleteTarget.id, recurrentId: deleteTarget.recurrentId })
    } else {
      removeMvt.mutate(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  const getEnvNom = (id: string | null) => enveloppes.find(e => e.id === id)?.nom || '—'

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />
      <div className="p-4 space-y-4">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Épargne</h1>
          <Dialog open={openEnv} onOpenChange={setOpenEnv}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />Enveloppe</Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader><DialogTitle>Nouvelle enveloppe</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Nom (ex: Vacances)" value={newEnvNom} onChange={e => setNewEnvNom(e.target.value)} />
                <Input type="number" step="0.01" placeholder="Objectif (optionnel)"
                  value={newEnvObjectif ?? ''} onChange={e => {
                    const val = e.target.value
                    setNewEnvObjectif(val === '' ? null : parseFloat(val))
                  }} />
                <Button className="w-full" onClick={handleCreateEnv}>Créer</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* TOTAUX DU MOIS */}
        <Card className="bg-teal-950 border-teal-800">
          <CardContent className="p-4 space-y-2">
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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {enveloppesActives.map(env => {
            const pourcent = env.objectif ? Math.min(100, Math.round((Number(env.solde) / Number(env.objectif)) * 100)) : null
            return (
              <Card key={env.id} className="bg-slate-900 border-slate-800">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">{env.nom}</p>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7"
                        onClick={() => handleEditEnv({ id: env.id, nom: env.nom, objectif: env.objectif })}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7"
                        onClick={() => {
                          if (confirm(`Archiver "${env.nom}" ?`)) archive.mutate(env.id)
                        }}>
                        <Archive className="w-3.5 h-3.5" />
                      </Button>
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
                {enveloppesArchivees.map(env => (
                  <Card key={env.id} className="bg-slate-900/50 border-slate-800 opacity-60">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{env.nom}</p>
                        <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7"
                          onClick={() => unarchive.mutate(env.id)}>
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

        {/* BOUTON NOUVEAU MOUVEMENT */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Mouvements du mois</h2>
          <Dialog open={openMvt} onOpenChange={setOpenMvt}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />Mouvement</Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader><DialogTitle>Nouveau mouvement</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {/* Type */}
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Type</label>
                  <div className="flex gap-2">
                    {(['epargne', 'reprise', 'transfert'] as const).map(t => (
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

                <Input type="number" step="0.01" placeholder="Montant" value={mvtMontant || ''}
                  onChange={e => setMvtMontant(parseFloat(e.target.value) || 0)} />

                {/* Enveloppe destination (épargne + transfert) */}
                {(mvtType === 'epargne' || mvtType === 'transfert') && (
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Vers</label>
                    <select className="select select-bordered w-full bg-slate-800 border-slate-700"
                      value={mvtDestId} onChange={e => setMvtDestId(e.target.value)}>
                      <option value="">Sélectionner...</option>
                      {enveloppesActives.map(env => (
                        <option key={env.id} value={env.id}>{env.nom}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Enveloppe source (reprise + transfert) */}
                {(mvtType === 'reprise' || mvtType === 'transfert') && (
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Depuis</label>
                    <select className="select select-bordered w-full bg-slate-800 border-slate-700"
                      value={mvtSourceId} onChange={e => setMvtSourceId(e.target.value)}>
                      <option value="">Sélectionner...</option>
                      {enveloppesActives.map(env => (
                        <option key={env.id} value={env.id}>{env.nom} ({formatEuro(Number(env.solde))})</option>
                      ))}
                    </select>
                  </div>
                )}

                <Input placeholder="Note (optionnel)" value={mvtNote} onChange={e => setMvtNote(e.target.value)} />

                {/* Fréquence (seulement pour épargne) */}
                {mvtType === 'epargne' && (
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Récurrence</label>
                    <div className="grid flex-wrap gap-1">
                      {FREQUENCES.map(f => (
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
        </div>

        {/* LISTE DES MOUVEMENTS */}
        <div className="space-y-2">
          {mouvements.map(mvt => (
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
                  <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                    onClick={() => setDeleteTarget({ id: mvt.id, recurrentId: mvt.recurrent_id, note: mvt.note })}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {mouvements.length === 0 && (
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
                <Input type="number" step="0.01"
                  value={editEnvObjectif ?? ''}
                  onChange={e => {
                    const val = e.target.value
                    setEditEnvObjectif(val === '' ? null : parseFloat(val))
                  }}
                  placeholder="Laisser vide = pas d'objectif" />
              </div>
              <Button className="w-full" onClick={handleSaveEditEnv}>Enregistrer</Button>
              <Button className="w-full" variant="ghost" onClick={() => setEditEnv(null)}>Annuler</Button>
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
    </div>
  )
}