'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2, Pencil, ArrowDown, ArrowUp, ArrowLeftRight } from 'lucide-react'
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
  const { data: enveloppes = [], create: createEnveloppe, update: updateEnveloppe } = useEnveloppes(espace?.id)
  const { data: mouvements = [], create: createMouvement, remove: removeMouvement, removeDefinitif } = useMouvements(moisId)
  const { create: createRecurrent } = useEpargneRecurrentes(espace?.id)

  // --- Création enveloppe ---
  const [openEnv, setOpenEnv] = useState(false)
  const [envNom, setEnvNom] = useState('')
  const [envSolde, setEnvSolde] = useState(0)
  const [envObjectif, setEnvObjectif] = useState('')

  // --- Mouvement ---
  const [openMvt, setOpenMvt] = useState(false)
  const [mvtType, setMvtType] = useState<'epargne' | 'reprise' | 'transfert'>('epargne')
  const [mvtDestId, setMvtDestId] = useState('')
  const [mvtSourceId, setMvtSourceId] = useState('')
  const [mvtMontant, setMvtMontant] = useState('')
  const [mvtNote, setMvtNote] = useState('')
  const [mvtFreq, setMvtFreq] = useState(0)

  // --- Édition enveloppe ---
  const [editEnv, setEditEnv] = useState<{ id: string; nom: string; objectif: number | null } | null>(null)
  const [editEnvNom, setEditEnvNom] = useState('')
  const [editEnvObjectif, setEditEnvObjectif] = useState('')

  // --- Suppression mouvement ---
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; recurrentId: string | null; note: string | null } | null>(null)

  // Totaux
  const totalEpargne = enveloppes.reduce((s, e) => s + Number(e.solde), 0)
  const totalEpargnesMois = mouvements
    .filter(m => m.type === 'epargne')
    .reduce((s, m) => s + Number(m.montant), 0)
  const totalReprisesMois = mouvements
    .filter(m => m.type === 'reprise')
    .reduce((s, m) => s + Number(m.montant), 0)

  // Créer une enveloppe
  const handleCreateEnveloppe = async () => {
    if (!espace || !envNom.trim()) return
    await createEnveloppe.mutateAsync({
      espace_id: espace.id,
      nom: envNom.trim(),
      solde: envSolde,
      objectif: envObjectif ? parseFloat(envObjectif) : null,
      ordre: enveloppes.length,
    })
    setEnvNom('')
    setEnvSolde(0)
    setEnvObjectif('')
    setOpenEnv(false)
  }

  // Créer un mouvement
  const handleCreateMouvement = async () => {
    if (!moisId || !espace) return
    const montant = Number(mvtMontant)
    if (!montant || montant <= 0) return

    if (mvtType === 'epargne' && !mvtDestId) return
    if (mvtType === 'reprise' && !mvtSourceId) return
    if (mvtType === 'transfert' && (!mvtSourceId || !mvtDestId)) return

    if (mvtFreq > 0) {
      // Récurrent : créer le modèle puis l'instance
      const rec = await createRecurrent.mutateAsync({
        espace_id: espace.id,
        enveloppe_dest_id: mvtDestId,
        montant: montant,
        actif: true,
        frequence_mois: mvtFreq,
        note: mvtNote || null,
        ordre: 0,
        mois_debut: month,
      })
      await createMouvement.mutateAsync({
        mois_id: moisId,
        recurrent_id: rec.id,
        enveloppe_source_id: mvtType === 'reprise' || mvtType === 'transfert' ? mvtSourceId : null,
        enveloppe_dest_id: mvtType === 'epargne' || mvtType === 'transfert' ? mvtDestId : null,
        montant: montant,
        type: mvtType,
        date: month,
        note: mvtNote || null,
      })
    } else {
      // Ponctuel
      await createMouvement.mutateAsync({
        mois_id: moisId,
        recurrent_id: null,
        enveloppe_source_id: mvtType === 'reprise' || mvtType === 'transfert' ? mvtSourceId : null,
        enveloppe_dest_id: mvtType === 'epargne' || mvtType === 'transfert' ? mvtDestId : null,
        montant: montant,
        type: mvtType,
        date: month,
        note: mvtNote || null,
      })
    }

    setMvtMontant('')
    setMvtNote('')
    setMvtDestId('')
    setMvtSourceId('')
    setMvtFreq(0)
    setOpenMvt(false)
  }

  // Éditer une enveloppe
  const handleEditEnv = (env: { id: string; nom: string; objectif: number | null }) => {
    setEditEnv(env)
    setEditEnvNom(env.nom)
    setEditEnvObjectif(env.objectif ? String(env.objectif) : '')
  }

  const handleSaveEditEnv = async () => {
    if (!editEnv) return
    await updateEnveloppe.mutateAsync({
      id: editEnv.id,
      nom: editEnvNom,
      objectif: editEnvObjectif ? parseFloat(editEnvObjectif) : null,
    })
    setEditEnv(null)
  }

  // Supprimer un mouvement
  const handleDeleteMouvement = (mode: 'mois' | 'definitif') => {
    if (!deleteTarget) return
    if (mode === 'definitif' && deleteTarget.recurrentId) {
      removeDefinitif.mutate({ mouvementId: deleteTarget.id, recurrentId: deleteTarget.recurrentId })
    } else {
      removeMouvement.mutate(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  // Helper : nom d'enveloppe par id
  const envName = (id: string | null) => enveloppes.find(e => e.id === id)?.nom || '—'

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
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Solde initial</label>
                    <Input type="number" step="0.01" placeholder="0" value={envSolde} onChange={e => setEnvSolde(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Objectif (optionnel)</label>
                    <Input type="number" step="0.01" placeholder="Ex: 5000" value={envObjectif} onChange={e => setEnvObjectif(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleCreateEnveloppe}>Créer</Button>
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
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Type</label>
                    <div className="grid grid-cols-3 gap-1">
                      <button type="button" onClick={() => setMvtType('epargne')}
                        className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                          mvtType === 'epargne' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}>↓ Épargne</button>
                      <button type="button" onClick={() => setMvtType('reprise')}
                        className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                          mvtType === 'reprise' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}>↑ Reprise</button>
                      <button type="button" onClick={() => setMvtType('transfert')}
                        className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                          mvtType === 'transfert' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}>↔ Transfert</button>
                    </div>
                  </div>

                  {/* Enveloppe source (reprise ou transfert) */}
                  {(mvtType === 'reprise' || mvtType === 'transfert') && (
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Depuis</label>
                      <select className="select select-bordered w-full bg-slate-800 border-slate-700"
                        value={mvtSourceId} onChange={e => setMvtSourceId(e.target.value)}>
                        <option value="">Choisir une enveloppe</option>
                        {enveloppes.map(env => (
                          <option key={env.id} value={env.id}>{env.nom} ({formatEuro(Number(env.solde))})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Enveloppe destination (épargne ou transfert) */}
                  {(mvtType === 'epargne' || mvtType === 'transfert') && (
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Vers</label>
                      <select className="select select-bordered w-full bg-slate-800 border-slate-700"
                        value={mvtDestId} onChange={e => setMvtDestId(e.target.value)}>
                        <option value="">Choisir une enveloppe</option>
                        {enveloppes.map(env => (
                          <option key={env.id} value={env.id}>{env.nom} ({formatEuro(Number(env.solde))})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <Input type="number" step="0.01" placeholder="Montant" value={mvtMontant} onChange={e => setMvtMontant(e.target.value)} />
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

                  <Button className="w-full" onClick={handleCreateMouvement}>Ajouter</Button>
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
            <div className="flex justify-between text-sm text-slate-400">
              <span>Versé ce mois</span>
              <span className="text-emerald-300">{formatEuro(totalEpargnesMois)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>Repris ce mois</span>
              <span className="text-orange-300">{formatEuro(totalReprisesMois)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Enveloppes */}
        <div className="space-y-3">
          {enveloppes.map(env => {
            const solde = Number(env.solde)
            const objectif = env.objectif ? Number(env.objectif) : null
            const pourcent = objectif && objectif > 0 ? Math.min(Math.round((solde / objectif) * 100), 100) : null

            return (
              <Card key={env.id} className="bg-slate-900 border-slate-800">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{env.nom}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-400">{formatEuro(solde)}</span>
                      <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                        onClick={() => handleEditEnv({ id: env.id, nom: env.nom, objectif: env.objectif })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {objectif && pourcent !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>{pourcent}%</span>
                        <span>Objectif : {formatEuro(objectif)}</span>
                      </div>
                      <Progress value={pourcent} />
                    </div>
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
            {mouvements.map(mvt => {
              const icon = mvt.type === 'epargne' ? <ArrowDown className="w-4 h-4 text-emerald-400" />
                : mvt.type === 'reprise' ? <ArrowUp className="w-4 h-4 text-orange-400" />
                : <ArrowLeftRight className="w-4 h-4 text-blue-400" />

              const label = mvt.type === 'epargne'
                ? `→ ${envName(mvt.enveloppe_dest_id)}`
                : mvt.type === 'reprise'
                ? `← ${envName(mvt.enveloppe_source_id)}`
                : `${envName(mvt.enveloppe_source_id)} → ${envName(mvt.enveloppe_dest_id)}`

              const colorClass = mvt.type === 'epargne' ? 'text-emerald-400'
                : mvt.type === 'reprise' ? 'text-orange-400'
                : 'text-blue-400'

              return (
                <Card key={mvt.id} className="bg-slate-900 border-slate-800">
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      {icon}
                      <div>
                        <p className="font-medium text-sm">{label}</p>
                        {mvt.note && <p className="text-xs text-slate-500">{mvt.note}</p>}
                        <div className="flex items-center gap-1">
                          {mvt.recurrent_id && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900 text-purple-400">↻</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${colorClass}`}>{formatEuro(Number(mvt.montant))}</span>
                      <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                        onClick={() => setDeleteTarget({ id: mvt.id, recurrentId: mvt.recurrent_id, note: mvt.note })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Dialog édition enveloppe */}
        <Dialog open={!!editEnv} onOpenChange={(v) => { if (!v) setEditEnv(null) }}>
          <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
            <DialogHeader><DialogTitle>Modifier l&apos;enveloppe</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Nom" value={editEnvNom} onChange={e => setEditEnvNom(e.target.value)} />
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Objectif (optionnel)</label>
                <Input type="number" step="0.01" placeholder="Ex: 5000" value={editEnvObjectif} onChange={e => setEditEnvObjectif(e.target.value)} />
              </div>
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
              <Button className="w-full" variant="outline" onClick={() => handleDeleteMouvement('mois')}>
                Ce mois seulement
              </Button>
              {deleteTarget?.recurrentId && (
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDeleteMouvement('definitif')}>
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