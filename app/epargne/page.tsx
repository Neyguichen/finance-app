'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, ArrowDown, ArrowUp, ArrowLeftRight, Trash2, Pencil } from 'lucide-react'
import MonthSelector from '@/components/layout/MonthSelector'
import { useEnveloppes, useMouvements, useEpargneRecurrentes } from '@/lib/hooks/useEpargne'
import { formatEuro, pct } from '@/lib/utils'
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
  const { data: enveloppes = [], create: createEnv, update: updateEnv } = useEnveloppes(espace?.id)
  const { data: mouvements = [], create: createMvt, remove: removeMvt, removeDefinitif } = useMouvements(moisId)
  const { create: createRecurrent } = useEpargneRecurrentes(espace?.id)

  // Dialog création enveloppe
  const [openEnv, setOpenEnv] = useState(false)
  const [envNom, setEnvNom] = useState('')
  const [envObjectif, setEnvObjectif] = useState<number | ''>('')
  const [envSolde, setEnvSolde] = useState<number | ''>(0)

  // Dialog mouvement
  const [openMvt, setOpenMvt] = useState(false)
  const [mvtType, setMvtType] = useState<'epargne' | 'reprise' | 'transfert'>('epargne')
  const [mvtMontant, setMvtMontant] = useState<number | ''>(0)
  const [mvtDestId, setMvtDestId] = useState('')
  const [mvtSourceId, setMvtSourceId] = useState('')
  const [mvtNote, setMvtNote] = useState('')
  const [mvtFreq, setMvtFreq] = useState(0)

  // Dialog édition enveloppe
  const [editEnv, setEditEnv] = useState<{ id: string; nom: string; objectif: number | null } | null>(null)
  const [editEnvNom, setEditEnvNom] = useState('')
  const [editEnvObjectif, setEditEnvObjectif] = useState<number | ''>('')

  // Dialog suppression mouvement
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; recurrentId: string | null; note: string | null } | null>(null)

  const totalEpargne = enveloppes.reduce((s, e) => s + Number(e.solde), 0)
  const totalObjectif = enveloppes.reduce((s, e) => s + (e.objectif ? Number(e.objectif) : 0), 0)

  const handleCreateEnv = async () => {
    if (!espace || !envNom.trim()) return
    await createEnv.mutateAsync({
      espace_id: espace.id,
      nom: envNom.trim(),
      solde: Number(envSolde) || 0,
      objectif: envObjectif ? Number(envObjectif) : null,
      ordre: enveloppes.length,
    })
    setEnvNom('')
    setEnvObjectif('')
    setEnvSolde(0)
    setOpenEnv(false)
  }

  const handleCreateMvt = async () => {
    if (!moisId || !mvtMontant) return

    const baseMvt = {
      mois_id: moisId,
      montant: Number(mvtMontant),
      type: mvtType,
      date: month,
      note: mvtNote || null,
      recurrent_id: null as string | null,
      enveloppe_source_id: mvtType === 'reprise' || mvtType === 'transfert' ? mvtSourceId || null : null,
      enveloppe_dest_id: mvtType === 'epargne' || mvtType === 'transfert' ? mvtDestId || null : null,
    }

    if (mvtFreq === 0) {
      // Ponctuel
      await createMvt.mutateAsync(baseMvt)
    } else {
      // Récurrent : créer le modèle puis l'instance
      if (!espace) return
      const rec = await createRecurrent.mutateAsync({
        espace_id: espace.id,
        enveloppe_dest_id: mvtDestId,
        montant: Number(mvtMontant),
        actif: true,
        frequence_mois: mvtFreq,
        note: mvtNote || null,
        ordre: 0,
      })
      await createMvt.mutateAsync({ ...baseMvt, recurrent_id: rec.id })
    }

    setMvtMontant(0)
    setMvtNote('')
    setMvtDestId('')
    setMvtSourceId('')
    setMvtFreq(0)
    setOpenMvt(false)
  }

  const handleEditEnv = (env: { id: string; nom: string; objectif: number | null }) => {
    setEditEnv(env)
    setEditEnvNom(env.nom)
    setEditEnvObjectif(env.objectif ?? '')
  }

  const handleSaveEditEnv = async () => {
    if (!editEnv) return
    await updateEnv.mutateAsync({
      id: editEnv.id,
      nom: editEnvNom,
      objectif: editEnvObjectif ? Number(editEnvObjectif) : null,
    })
    setEditEnv(null)
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
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Épargne</h1>
          <div className="flex gap-2">
            <Dialog open={openEnv} onOpenChange={setOpenEnv}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Enveloppe</Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
                <DialogHeader><DialogTitle>Nouvelle enveloppe</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Nom (ex: Vacances)" value={envNom} onChange={e => setEnvNom(e.target.value)} />
                  <Input type="number" step="0.01" placeholder="Solde initial" value={envSolde} onChange={e => setEnvSolde(e.target.value ? parseFloat(e.target.value) : '')} />
                  <Input type="number" step="0.01" placeholder="Objectif (optionnel)" value={envObjectif} onChange={e => setEnvObjectif(e.target.value ? parseFloat(e.target.value) : '')} />
                  <Button className="w-full" onClick={handleCreateEnv}>Créer</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={openMvt} onOpenChange={setOpenMvt}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" />Mouvement</Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
                <DialogHeader><DialogTitle>Nouveau mouvement</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  {/* Type de mouvement */}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setMvtType('epargne')}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${mvtType === 'epargne' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <ArrowDown className="w-3 h-3 inline mr-1" />Épargne
                    </button>
                    <button type="button" onClick={() => setMvtType('reprise')}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${mvtType === 'reprise' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <ArrowUp className="w-3 h-3 inline mr-1" />Reprise
                    </button>
                    <button type="button" onClick={() => setMvtType('transfert')}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${mvtType === 'transfert' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <ArrowLeftRight className="w-3 h-3 inline mr-1" />Transfert
                    </button>
                  </div>

                  <Input type="number" step="0.01" placeholder="Montant" value={mvtMontant} onChange={e => setMvtMontant(e.target.value ? parseFloat(e.target.value) : '')} />

                  {/* Enveloppe destination (épargne + transfert) */}
                  {(mvtType === 'epargne' || mvtType === 'transfert') && (
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">
                        {mvtType === 'transfert' ? 'Vers' : 'Enveloppe'}
                      </label>
                      <select className="select select-bordered w-full bg-slate-800 border-slate-700"
                        value={mvtDestId} onChange={e => setMvtDestId(e.target.value)}>
                        <option value="">Choisir...</option>
                        {enveloppes.map(env => (
                          <option key={env.id} value={env.id}>{env.nom}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Enveloppe source (reprise + transfert) */}
                  {(mvtType === 'reprise' || mvtType === 'transfert') && (
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">
                        {mvtType === 'transfert' ? 'Depuis' : 'Enveloppe'}
                      </label>
                      <select className="select select-bordered w-full bg-slate-800 border-slate-700"
                        value={mvtSourceId} onChange={e => setMvtSourceId(e.target.value)}>
                        <option value="">Choisir...</option>
                        {enveloppes.map(env => (
                          <option key={env.id} value={env.id}>{env.nom}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <Input placeholder="Note (optionnel)" value={mvtNote} onChange={e => setMvtNote(e.target.value)} />

                  {/* Fréquence (uniquement pour épargne) */}
                  {mvtType === 'epargne' && (
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Récurrence</label>
                      <div className="grid grid-cols-5 gap-1">
                        {FREQUENCES.map(f => (
                          <button key={f.value} type="button" onClick={() => setMvtFreq(f.value)}
                            className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                              mvtFreq === f.value ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
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
        </div>

        {/* Total épargne */}
        <Card className="bg-emerald-950 border-emerald-800">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold text-emerald-400">Total épargne</span>
              <span className="font-bold text-lg text-emerald-400">{formatEuro(totalEpargne)}</span>
            </div>
            {totalObjectif > 0 && (
              <>
                <Progress value={pct(totalEpargne, totalObjectif)} />
                <p className="text-xs text-slate-400 text-right">{formatEuro(totalEpargne)} / {formatEuro(totalObjectif)}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Liste des enveloppes */}
        <div className="space-y-3">
          {enveloppes.map(env => {
            const progress = env.objectif ? pct(Number(env.solde), Number(env.objectif)) : null
            return (
              <Card key={env.id} className="bg-slate-900 border-slate-800">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{env.nom}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-400">{formatEuro(Number(env.solde))}</span>
                      <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                        onClick={() => handleEditEnv({ id: env.id, nom: env.nom, objectif: env.objectif })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {progress !== null && (
                    <>
                      <Progress value={Math.min(progress, 100)} />
                      <p className="text-xs text-slate-400 text-right">
                        {formatEuro(Number(env.solde))} / {formatEuro(Number(env.objectif))} ({Math.round(progress)}%)
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Mouvements du mois */}
        {mouvements.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-400 uppercase">Mouvements du mois</h2>
            {mouvements.map(mvt => (
              <Card key={mvt.id} className="bg-slate-900 border-slate-800">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      mvt.type === 'epargne' ? 'bg-emerald-900 text-emerald-400' :
                      mvt.type === 'reprise' ? 'bg-orange-900 text-orange-400' :
                      'bg-blue-900 text-blue-400'
                    }`}>
                      {mvt.type === 'epargne' ? '↓' : mvt.type === 'reprise' ? '↑' : '↔'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {mvt.type === 'epargne' && `→ ${getEnvNom(mvt.enveloppe_dest_id)}`}
                        {mvt.type === 'reprise' && `← ${getEnvNom(mvt.enveloppe_source_id)}`}
                        {mvt.type === 'transfert' && `${getEnvNom(mvt.enveloppe_source_id)} → ${getEnvNom(mvt.enveloppe_dest_id)}`}
                      </p>
                      {mvt.note && <p className="text-xs text-slate-500">{mvt.note}</p>}
                      <div className="flex items-center gap-1">
                        {mvt.recurrent_id && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900 text-purple-400">↻</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${
                      mvt.type === 'epargne' ? 'text-emerald-400' :
                      mvt.type === 'reprise' ? 'text-orange-400' :
                      'text-blue-400'
                    }`}>
                      {formatEuro(Number(mvt.montant))}
                    </span>
                    <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                      onClick={() => setDeleteTarget({ id: mvt.id, recurrentId: mvt.recurrent_id, note: mvt.note })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog édition enveloppe */}
        <Dialog open={!!editEnv} onOpenChange={(v) => { if (!v) setEditEnv(null) }}>
          <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
            <DialogHeader><DialogTitle>Modifier l&apos;enveloppe</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Nom" value={editEnvNom} onChange={e => setEditEnvNom(e.target.value)} />
              <Input type="number" step="0.01" placeholder="Objectif" value={editEnvObjectif} onChange={e => setEditEnvObjectif(e.target.value ? parseFloat(e.target.value) : '')} />
              <Button className="w-full" onClick={handleSaveEditEnv}>Enregistrer</Button>
              <Button className="w-full" variant="ghost" onClick={() => setEditEnv(null)}>Annuler</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog suppression mouvement */}
        <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
          <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
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