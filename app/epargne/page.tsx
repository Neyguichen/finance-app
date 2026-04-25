'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2, Pencil, ArrowUpDown } from 'lucide-react'
import MonthSelector from '@/components/layout/MonthSelector'
import { useEnveloppes, useMouvements, useEpargneRecurrentes } from '@/lib/hooks/useEpargne'
import { formatEuro, pct } from '@/lib/utils'
import { useApp } from '@/components/AppContext'
import type { MouvementEpargne } from '@/lib/types'

const FREQUENCES = [
  { value: 0, label: 'Ponctuel' },
  { value: 1, label: 'Mensuel' },
  { value: 3, label: 'Trimestriel' },
  { value: 6, label: 'Semestriel' },
  { value: 12, label: 'Annuel' },
]

export default function EpargnePage() {
  const { moisId, month, setMonth, espace } = useApp()
  const espaceId = espace?.id

  // Dialogs
  const [mvtOpen, setMvtOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; recurrentId: string | null; label: string } | null>(null)
  const [editTarget, setEditTarget] = useState<MouvementEpargne | null>(null)
  const [editMontant, setEditMontant] = useState(0)
  const [editNote, setEditNote] = useState('')

  // Form state for new movement
  const [formType, setFormType] = useState<'alimentation' | 'reprise' | 'transfert'>('alimentation')
  const [formSource, setFormSource] = useState('')
  const [formDest, setFormDest] = useState('')
  const [formMontant, setFormMontant] = useState(0)
  const [formNote, setFormNote] = useState('')
  const [formFreq, setFormFreq] = useState(1)

  // Hooks
  const { data: enveloppes = [], create: createEnv } = useEnveloppes(espaceId)
  const { data: mouvements = [], create: createMvt, update: updateMvt, remove: removeMvt, removeDefinitif } = useMouvements(moisId)
  const { create: createRecurrent } = useEpargneRecurrentes(espaceId)

  // création d'enveloppes
  const [envOpen, setEnvOpen] = useState(false)
  const [newEnvNom, setNewEnvNom] = useState('')
  const [newEnvObjectif, setNewEnvObjectif] = useState(0)

  const totalSolde = enveloppes.reduce((s, e) => s + Number(e.solde), 0)
  const totalMvtMois = mouvements
    .filter(m => m.type === 'alimentation')
    .reduce((s, m) => s + Number(m.montant), 0)

  // Helpers
  const envName = (id: string | null) => enveloppes.find(e => e.id === id)?.nom || '—'

  const mvtLabel = (m: MouvementEpargne) => {
    if (m.type === 'alimentation') return `→ ${envName(m.enveloppe_dest_id)}`
    if (m.type === 'reprise') return `← ${envName(m.enveloppe_source_id)}`
    return `${envName(m.enveloppe_source_id)} → ${envName(m.enveloppe_dest_id)}`
  }

  // Submit new movement
  const onSubmitMvt = async () => {
    if (!moisId || !espace) return
    const sourceId = formType !== 'alimentation' ? formSource : null
    const destId = formType !== 'reprise' ? formDest : null
    const today = new Date().toISOString().split('T')[0]

    if (formFreq === 0) {
      // Ponctuel
      await createMvt.mutateAsync({
        mois_id: moisId,
        recurrent_id: null,
        type: formType,
        enveloppe_source_id: sourceId,
        enveloppe_dest_id: destId,
        montant: formMontant,
        date: today,
        note: formNote || null,
      })
    } else {
      // Récurrent : créer le modèle puis l'instance
      const rec = await createRecurrent.mutateAsync({
        espace_id: espace.id,
        enveloppe_dest_id: destId || '',
        montant: formMontant,
        actif: true,
        frequence_mois: formFreq,
        note: formNote || null,
        ordre: mouvements.length,
      })
      await createMvt.mutateAsync({
        mois_id: moisId,
        recurrent_id: rec.id,
        type: formType,
        enveloppe_source_id: sourceId,
        enveloppe_dest_id: destId,
        montant: formMontant,
        date: today,
        note: formNote || null,
      })
    }
    // Reset
    setFormType('alimentation')
    setFormSource('')
    setFormDest('')
    setFormMontant(0)
    setFormNote('')
    setFormFreq(1)
    setMvtOpen(false)
  }

  // Delete handler
  const handleDelete = (mode: 'mois' | 'definitif') => {
    if (!deleteTarget) return
    if (mode === 'definitif' && deleteTarget.recurrentId) {
      removeDefinitif.mutate({ mouvementId: deleteTarget.id, recurrentId: deleteTarget.recurrentId })
    } else {
      removeMvt.mutate(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  // Edit handler
  const handleEdit = (m: MouvementEpargne) => {
    setEditTarget(m)
    setEditMontant(Number(m.montant))
    setEditNote(m.note || '')
  }

  const handleSaveEdit = async () => {
    if (!editTarget) return
    await updateMvt.mutateAsync({
      id: editTarget.id,
      montant: editMontant,
      note: editNote || null,
    })
    setEditTarget(null)
  }

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Épargne</h1>
          <div className="flex gap-2">
            <Dialog open={envOpen} onOpenChange={setEnvOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Enveloppe</Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700">
                <DialogHeader><DialogTitle>Nouvelle enveloppe</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Nom (ex: Vacances)" value={newEnvNom} onChange={e => setNewEnvNom(e.target.value)} />
                  <Input type="number" step="0.01" placeholder="Objectif (optionnel)" value={newEnvObjectif || ''} onChange={e => setNewEnvObjectif(parseFloat(e.target.value) || 0)} />
                  <Button className="w-full" onClick={async () => {
                    if (!newEnvNom.trim() || !espaceId) return
                    await createEnv.mutateAsync({
                      espace_id: espaceId,
                      nom: newEnvNom.trim(),
                      solde: 0,
                      objectif: newEnvObjectif || null,
                      ordre: enveloppes.length,
                    })
                    setNewEnvNom('')
                    setNewEnvObjectif(0)
                    setEnvOpen(false)
                  }}>Cr&eacute;er</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={mvtOpen} onOpenChange={setMvtOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" />Mouvement</Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700">
                <DialogHeader><DialogTitle>Nouveau mouvement</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  {/* Type toggle */}
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Type</label>
                    <div className="flex gap-2">
                      {(['alimentation', 'reprise', 'transfert'] as const).map(t => (
                        <button key={t} type="button" onClick={() => setFormType(t)}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${formType === t ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                          {t === 'alimentation' ? 'Alimenter' : t === 'reprise' ? 'Reprendre' : 'Transférer'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Source (reprise ou transfert) */}
                  {formType !== 'alimentation' && (
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Source</label>
                      <select className="select select-bordered w-full bg-slate-800 border-slate-700"
                        value={formSource} onChange={e => setFormSource(e.target.value)}>
                        <option value="">Choisir...</option>
                        {enveloppes.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Destination (alimentation ou transfert) */}
                  {formType !== 'reprise' && (
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Destination</label>
                      <select className="select select-bordered w-full bg-slate-800 border-slate-700"
                        value={formDest} onChange={e => setFormDest(e.target.value)}>
                        <option value="">Choisir...</option>
                        {enveloppes.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                      </select>
                    </div>
                  )}

                  <Input type="number" step="0.01" placeholder="Montant" value={formMontant || ''} onChange={e => setFormMontant(parseFloat(e.target.value) || 0)} />
                  <Input placeholder="Note (optionnel)" value={formNote} onChange={e => setFormNote(e.target.value)} />

                  {/* Sélecteur de fréquence */}
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Récurrence</label>
                    <div className="grid grid-cols-5 gap-1">
                      {FREQUENCES.map(f => (
                        <button key={f.value} type="button" onClick={() => setFormFreq(f.value)}
                          className={`py-2 rounded-lg text-xs font-medium transition-colors ${formFreq === f.value ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{f.label}</button>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full" onClick={onSubmitMvt}>Valider</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!espace && (
          <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-3 text-yellow-300 text-sm">
            Crée un espace depuis le Dashboard pour activer les enveloppes.
          </div>
        )}

        {/* TOTAL ÉPARGNE */}
        <Card className="bg-teal-950 border-teal-800">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Total Épargne</span>
              <span className="font-bold text-lg text-teal-300">{formatEuro(totalSolde)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>Versé ce mois</span>
              <span>{formatEuro(totalMvtMois)}</span>
            </div>
          </CardContent>
        </Card>

        {/* ENVELOPPES */}
        <div className="space-y-3">
          {enveloppes.map((env) => (
            <Card key={env.id} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-medium">{env.nom}</p>
                  <p className="font-bold text-teal-400">{formatEuro(Number(env.solde))}</p>
                </div>
                {env.objectif && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{pct(Number(env.solde), Number(env.objectif))}%</span>
                      <span>Obj: {formatEuro(Number(env.objectif))}</span>
                    </div>
                    <Progress value={pct(Number(env.solde), Number(env.objectif))} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* MOUVEMENTS DU MOIS */}
        {mouvements.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-400 mb-2">Mouvements du mois</h2>
            <div className="space-y-2">
              {mouvements.map((mvt) => (
                <Card key={mvt.id} className="bg-slate-900 border-slate-800">
                  <CardContent className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium text-sm">{mvtLabel(mvt)}</p>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${mvt.type === 'alimentation' ? 'bg-teal-900 text-teal-400' : mvt.type === 'reprise' ? 'bg-orange-900 text-orange-400' : 'bg-blue-900 text-blue-400'}`}>{mvt.type}</span>
                        {mvt.recurrent_id && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900 text-purple-400">↻</span>
                        )}
                      </div>
                      {mvt.note && <p className="text-xs text-slate-500 mt-0.5">{mvt.note}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-teal-400">{formatEuro(Number(mvt.montant))}</span>
                      <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                        onClick={() => handleEdit(mvt)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                        onClick={() => setDeleteTarget({ id: mvt.id, recurrentId: mvt.recurrent_id, label: mvtLabel(mvt) })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* DIALOG D'ÉDITION */}
        <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) setEditTarget(null) }}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle>Modifier le mouvement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input type="number" step="0.01" placeholder="Montant" value={editMontant} onChange={e => setEditMontant(parseFloat(e.target.value) || 0)} />
              <Input placeholder="Note" value={editNote} onChange={e => setEditNote(e.target.value)} />
              <Button className="w-full" onClick={handleSaveEdit}>Enregistrer</Button>
              <Button className="w-full" variant="ghost" onClick={() => setEditTarget(null)}>Annuler</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG DE SUPPRESSION */}
        <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle>Supprimer ce mouvement ?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-400 mb-2">{deleteTarget?.label}</p>
            <div className="space-y-3">
              <Button className="w-full" variant="outline" onClick={() => handleDelete('mois')}>
                Ce mois seulement
              </Button>
              {deleteTarget?.recurrentId && (
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDelete('definitif')}>
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