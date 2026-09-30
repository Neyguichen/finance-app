'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type CategoryOption = { id: string; nom: string; icone?: string | null; parent_id?: string | null; actif?: boolean }

// --- DIALOG D'ÉDITION ---
type EditProps = {
  editTarget: {
    id: string
    nom: string
    montant: number
    recurrentId: string | null
    categorieId?: string | null
    sousCategorieId?: string | null
  } | null
  categories?: CategoryOption[]
  onClose: () => void
  onSave: (
    id: string,
    nom: string,
    montant: number,
    recurrentId: string | null,
    categorieId?: string | null,
    sousCategorieId?: string | null,
  ) => void
}

export function ChargeFixeEditDialog({ editTarget, categories = [], onClose, onSave }: EditProps) {
  const [nom, setNom] = useState('')
  const [montant, setMontant] = useState(0)
  const [categorieId, setCategorieId] = useState('')
  const [sousCategorieId, setSousCategorieId] = useState('')

  useEffect(() => {
    if (editTarget) {
      setNom(editTarget.nom)
      setMontant(Number(editTarget.montant))
      setCategorieId(editTarget.categorieId || '')
      setSousCategorieId(editTarget.sousCategorieId || '')
    }
  }, [editTarget])

  const parents = useMemo(
    () => categories.filter(category => !category.parent_id && category.actif !== false).sort((a, b) => a.nom.localeCompare(b.nom)),
    [categories],
  )
  const subs = useMemo(
    () => categories.filter(category => category.parent_id === categorieId && category.actif !== false).sort((a, b) => a.nom.localeCompare(b.nom)),
    [categories, categorieId],
  )

  return (
    <Dialog open={!!editTarget} onOpenChange={value => { if (!value) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la charge fixe</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
            <Input placeholder="Nom" value={nom} onChange={event => setNom(event.target.value)} />
            <CalculatorInput value={montant} onChange={setMontant} placeholder="Montant prévu" />
          </div>

          <div className="rounded-xl border border-slate-800/70 bg-slate-950/30 p-3 space-y-3">
            <select
              value={categorieId}
              onChange={event => {
                setCategorieId(event.target.value)
                setSousCategorieId('')
              }}
              className="select select-bordered w-full"
            >
              <option value="">Sans catégorie</option>
              {parents.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icone ? `${category.icone} ` : ''}{category.nom}
                </option>
              ))}
            </select>

            {categorieId && (
              <select
                value={sousCategorieId}
                onChange={event => setSousCategorieId(event.target.value)}
                className="select select-bordered w-full"
              >
                <option value="">Aucune sous-catégorie</option>
                {subs.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.icone ? `${category.icone} ` : ''}{category.nom}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Button
            className="w-full"
            disabled={!nom.trim() || montant <= 0}
            onClick={() => onSave(
              editTarget!.id,
              nom.trim(),
              montant,
              editTarget!.recurrentId,
              categorieId || null,
              sousCategorieId || null,
            )}
          >
            Enregistrer
          </Button>
          <Button className="w-full" variant="ghost" onClick={onClose}>Annuler</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type DeleteProps = {
  target: { id: string; recurrentId: string | null; nom: string } | null
  onClose: () => void
  onDelete: (mode: 'mois' | 'definitif') => void
}

export function ChargeFixeDeleteDialog({ target, onClose, onDelete }: DeleteProps) {
  return (
    <Dialog open={!!target} onOpenChange={value => { if (!value) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer &laquo; {target?.nom} &raquo; ?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Button className="w-full" variant="outline" onClick={() => onDelete('mois')}>
            Ce mois seulement
          </Button>
          {target?.recurrentId && (
            <Button className="w-full bg-rose-600 text-white hover:bg-rose-700" onClick={() => onDelete('definitif')}>
              Définitivement (ne plus reporter)
            </Button>
          )}
          <Button className="w-full" variant="ghost" onClick={onClose}>Annuler</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type ScopeProps = {
  target: {
    id: string
    nom: string
    montant: number
    recurrentId: string
    categorieId?: string | null
    sousCategorieId?: string | null
  } | null
  onClose: () => void
  onSave: (scope: 'mois' | 'tous') => void
}

export function ChargeFixeScopeDialog({ target, onClose, onSave }: ScopeProps) {
  return (
    <Dialog open={!!target} onOpenChange={value => { if (!value) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier « {target?.nom} »</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Tu peux appliquer la modification uniquement à ce mois, ou également au modèle récurrent pour les prochains mois.
          </p>
          <Button className="w-full" variant="outline" onClick={() => onSave('mois')}>
            Ce mois seulement
          </Button>
          <Button className="w-full" onClick={() => onSave('tous')}>
            Ce mois et les prochains
          </Button>
          <Button className="w-full" variant="ghost" onClick={onClose}>Annuler</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
