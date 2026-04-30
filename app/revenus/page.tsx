'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Trash2, Pencil } from 'lucide-react'
import MonthSelector from '@/components/layout/MonthSelector'
import { useRevenus, useRevenusRecurrents } from '@/lib/hooks/useRevenus'
import { useMouvements, useEnveloppes } from '@/lib/hooks/useEpargne'
import { formatEuro, pct } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { useApp } from '@/components/AppContext'

const FREQUENCES = [
  { value: 0, label: 'Ponctuel' },
  { value: 1, label: 'Mensuel' },
  { value: 3, label: 'Trimestriel' },
  { value: 6, label: 'Semestriel' },
  { value: 12, label: 'Annuel' },
]

export default function RevenusPage() {
  const [open, setOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; recurrentId: string | null; nom: string } | null>(null)
  const [editTarget, setEditTarget] = useState<{ id: string; nom: string; montant: number; type: 'actif' | 'passif'; recurrentId?: string | null } | null>(null)
  const [editNom, setEditNom] = useState('')
  const [editMontant, setEditMontant] = useState(0)
  const [editType, setEditType] = useState<'actif' | 'passif'>('actif')
  const [editScopeOpen, setEditScopeOpen] = useState(false)
  const { moisId, month, setMonth, espace } = useApp()
  const { data: revenus = [], toggleRecu, create, update, remove, removeDefinitif } = useRevenus(moisId)
  const { create: createRecurrent, update: updateRecurrent } = useRevenusRecurrents(espace?.id)
  const { data: mouvements = [] } = useMouvements(moisId)
  const { data: enveloppes = [] } = useEnveloppes(espace?.id)

  const reprises = mouvements.filter(m => m.type === 'reprise')
  const totalReprises = reprises.reduce((s, m) => s + Number(m.montant), 0)
  const totalEntrants = revenus.reduce((s, r) => s + Number(r.montant), 0) + totalReprises
  const totalActif = revenus.filter(r => r.type === 'actif').reduce((s, r) => s + Number(r.montant), 0)
  const totalPassif = revenus.filter(r => r.type === 'passif').reduce((s, r) => s + Number(r.montant), 0)

  const [formType, setFormType] = useState<'actif' | 'passif'>('actif')
  const [formFreq, setFormFreq] = useState(1)
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: { nom: '', montant: 0 },
  })

  const onSubmit = async (values: { nom: string; montant: number }) => {
    if (!moisId || !espace) return
    if (formFreq === 0) {
      await create.mutateAsync({
        mois_id: moisId,
        recurrent_id: null,
        type: formType,
        nom: values.nom,
        montant: values.montant,
        recu: false,
        ordre: revenus.length,
      })
    } else {
      const rec = await createRecurrent.mutateAsync({
        espace_id: espace.id,
        type: formType,
        nom: values.nom,
        montant: values.montant,
        actif: true,
        frequence_mois: formFreq,
        ordre: revenus.length,
        mois_debut: month,
      })
      await create.mutateAsync({
        mois_id: moisId,
        recurrent_id: rec.id,
        type: formType,
        nom: values.nom,
        montant: values.montant,
        recu: false,
        ordre: revenus.length,
      })
    }
    reset()
    setFormType('actif')
    setFormFreq(1)
    setOpen(false)
  }

  const handleDelete = (mode: 'mois' | 'definitif') => {
    if (!deleteTarget) return
    if (mode === 'definitif' && deleteTarget.recurrentId) {
      removeDefinitif.mutate({ revenuId: deleteTarget.id, recurrentId: deleteTarget.recurrentId })
    } else {
      remove.mutate(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  const handleEdit = (rev: { id: string; nom: string; montant: number; type: 'actif' | 'passif'; recurrentId?: string | null }) => {
    setEditTarget(rev)
    setEditNom(rev.nom)
    setEditMontant(Number(rev.montant))
    setEditType(rev.type)
  }

  const handleSaveEditClick = () => {
    if (!editTarget) return
    if (editTarget.recurrentId) {
      setEditScopeOpen(true)
    } else {
      saveEdit('mois')
    }
  }

  const saveEdit = async (scope: 'mois' | 'tous') => {
    if (!editTarget) return
    await update.mutateAsync({
      id: editTarget.id,
      nom: editNom,
      montant: editMontant,
      type: editType,
    })
    if (scope === 'tous' && editTarget.recurrentId) {
      await updateRecurrent.mutateAsync({
        id: editTarget.recurrentId,
        nom: editNom,
        montant: editMontant,
        type: editType,
      })
    }
    setEditScopeOpen(false)
    setEditTarget(null)
  }

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />
      <div className="p-4 space-y-4">
        {/* Header sans bouton — le FAB remplace */}
        <h1 className="text-xl font-bold">Revenus</h1>

        {/* TOTAL EN HAUT */}
        <Card className="bg-blue-950 border-blue-800">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Total Entrants</span>
              <span className="font-bold text-lg">{formatEuro(totalEntrants)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>Actif</span>
              <span>{formatEuro(totalActif)} ({pct(totalActif, totalEntrants)}%)</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>Passif</span>
              <span>{formatEuro(totalPassif)} ({pct(totalPassif, totalEntrants)}%)</span>
            </div>
            {totalReprises > 0 && (
              <div className="flex justify-between text-sm text-slate-400">
                <span>Reprises épargne</span>
                <span>{formatEuro(totalReprises)} ({pct(totalReprises, totalEntrants)}%)</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* LISTE DES REVENUS */}
        <div className="space-y-2">
          {revenus.map((rev) => (
            <Card key={rev.id} className="bg-slate-900 border-slate-800">
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={rev.recu}
                    onCheckedChange={(checked) =>
                      toggleRecu.mutate({ id: rev.id, recu: !!checked })
                    }
                  />
                  <div>
                    <p className="font-medium">{rev.nom}</p>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        rev.type === 'actif'
                          ? 'bg-emerald-900 text-emerald-400'
                          : 'bg-blue-900 text-blue-400'
                      }`}>{rev.type}</span>
                      {rev.recurrent_id && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900 text-purple-400">↻</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${Number(rev.montant) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {formatEuro(Number(rev.montant))}
                  </span>
                  <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                    onClick={() => handleEdit({ id: rev.id, nom: rev.nom, montant: Number(rev.montant), type: rev.type, recurrentId: rev.recurrent_id })}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-slate-500 h-8 w-8"
                    onClick={() => setDeleteTarget({ id: rev.id, recurrentId: rev.recurrent_id, nom: rev.nom })}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {/* REPRISES D'ÉPARGNE (lecture seule) */}
          {reprises.map((rep) => {
            const envNom = enveloppes.find(e => e.id === rep.enveloppe_source_id)?.nom || 'Enveloppe'
            return (
              <Card key={rep.id} className="bg-slate-900 border-slate-800">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📤</span>
                    <div>
                      <p className="font-medium">Reprise — {envNom}</p>
                      {rep.note && <p className="text-xs text-slate-500">{rep.note}</p>}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-400">reprise</span>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-400">
                    {formatEuro(Number(rep.montant))}
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* ========== FAB FLOTTANT ========== */}
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center text-2xl hover:brightness-110 transition-all"
          aria-label="Ajouter un revenu"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* DIALOG AJOUT REVENU */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader><DialogTitle>Nouveau revenu</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input placeholder="Nom" {...register('nom', { required: true })} />
              <CalculatorInput value={watch('montant')} onChange={(val) => setValue('montant', val)} placeholder="Montant" />
              {/* Toggle Actif / Passif */}
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setFormType('actif')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formType === 'actif'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}>Actif</button>
                  <button type="button" onClick={() => setFormType('passif')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formType === 'passif'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}>Passif</button>
                </div>
              </div>
              {/* Sélecteur de fréquence */}
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Récurrence</label>
                <div className="grid flex-wrap gap-1">
                  {FREQUENCES.map(f => (
                    <button key={f.value} type="button" onClick={() => setFormFreq(f.value)}
                      className={`py-2 rounded-lg text-xs font-medium transition-colors flex-1 min-w-[4.5rem] ${
                        formFreq === f.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}>{f.label}</button>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full">Ajouter</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* DIALOG D'ÉDITION */}
        <Dialog open={!!editTarget && !editScopeOpen} onOpenChange={(v) => { if (!v) setEditTarget(null) }}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle>Modifier le revenu</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Nom" value={editNom} onChange={e => setEditNom(e.target.value)} />
              <CalculatorInput value={editMontant} onChange={(val) => setEditMontant(val)} placeholder="Montant" />
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditType('actif')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${editType === 'actif' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Actif</button>
                  <button type="button" onClick={() => setEditType('passif')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${editType === 'passif' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Passif</button>
                </div>
              </div>
              <Button className="w-full" onClick={handleSaveEditClick}>Enregistrer</Button>
              <Button className="w-full" variant="ghost" onClick={() => setEditTarget(null)}>Annuler</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG CHOIX SCOPE ÉDITION */}
        <Dialog open={editScopeOpen} onOpenChange={(v) => { if (!v) { setEditScopeOpen(false); setEditTarget(null) } }}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle>Appliquer la modification à…</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Button className="w-full" variant="outline" onClick={() => saveEdit('mois')}>
                Ce mois seulement
              </Button>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => saveEdit('tous')}>
                Tous les prochains mois
              </Button>
              <Button className="w-full" variant="ghost" onClick={() => { setEditScopeOpen(false); setEditTarget(null) }}>
                Annuler
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG DE SUPPRESSION */}
        <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle>Supprimer &laquo; {deleteTarget?.nom} &raquo; ?</DialogTitle>
            </DialogHeader>
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