'use client'

import { useState, useEffect, useMemo } from 'react'
import { CheckCircle2, FolderTree, ReceiptText, Repeat2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormActions, FormField, FormSection } from '@/components/ui/form-layout'
import { localDateISO } from '@/lib/utils'

type CategoryOption = { id: string; nom: string; icone?: string | null; parent_id?: string | null; actif?: boolean }

type EditProps = {
  editTarget: {
    id: string
    nom: string
    montant: number
    recurrentId: string | null
    categorieId?: string | null
    sousCategorieId?: string | null
    payee?: boolean
    dateReelle?: string | null
  } | null
  categories?: CategoryOption[]
  doubleDate?: boolean
  onClose: () => void
  onSave: (
    id: string,
    nom: string,
    montant: number,
    recurrentId: string | null,
    categorieId?: string | null,
    sousCategorieId?: string | null,
    payee?: boolean,
    dateReelle?: string | null,
  ) => void
}

export function ChargeFixeEditDialog({ editTarget, categories = [], doubleDate = false, onClose, onSave }: EditProps) {
  const [nom, setNom] = useState('')
  const [montant, setMontant] = useState(0)
  const [categorieId, setCategorieId] = useState('')
  const [sousCategorieId, setSousCategorieId] = useState('')
  const [payee, setPayee] = useState(false)
  const [dateReelle, setDateReelle] = useState('')

  useEffect(() => {
    if (!editTarget) return
    setNom(editTarget.nom)
    setMontant(Number(editTarget.montant))
    setCategorieId(editTarget.categorieId || '')
    setSousCategorieId(editTarget.sousCategorieId || '')
    setPayee(!!editTarget.payee)
    setDateReelle(editTarget.dateReelle || '')
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
          <DialogDescription>Modifiez son libellé, son montant ou son classement.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormSection title="Charge fixe" icon={<ReceiptText className="h-4 w-4" />}>
            <FormField label="Nom">
              <Input placeholder="Nom" value={nom} onChange={event => setNom(event.target.value)} />
            </FormField>
            <FormField label="Montant prévu">
              <CalculatorInput value={montant} onChange={setMontant} placeholder="0,00 €" />
            </FormField>
          </FormSection>

          <FormSection title="Validation" description="Validez ou remettez cette dépense en attente directement depuis l’édition." icon={<CheckCircle2 className="h-4 w-4" />}>
            {!doubleDate ? (
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-3">
                <Checkbox
                  checked={payee}
                  onCheckedChange={checked => {
                    const next = !!checked
                    setPayee(next)
                    setDateReelle(next ? (dateReelle || localDateISO()) : '')
                  }}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-200">Dépense validée</span>
                  <span className="mt-0.5 block text-xs text-slate-500">La date de validation est enregistrée au jour du clic.</span>
                </span>
              </label>
            ) : (
              <FormField label="Date de validation bancaire" hint="Facultatif">
                <Input
                  type="date"
                  value={dateReelle}
                  onChange={event => {
                    const value = event.target.value
                    setDateReelle(value)
                    setPayee(Boolean(value))
                  }}
                />
              </FormField>
            )}
          </FormSection>

          <FormSection title="Classement" icon={<FolderTree className="h-4 w-4" />}>
            <FormField label="Catégorie">
              <select
                value={categorieId}
                onChange={event => {
                  setCategorieId(event.target.value)
                  setSousCategorieId('')
                }}
                className="select select-bordered w-full rounded-xl border-slate-700/80 bg-slate-950/70 text-slate-100"
              >
                <option value="">Sans catégorie</option>
                {parents.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.icone ? `${category.icone} ` : ''}{category.nom}
                  </option>
                ))}
              </select>
            </FormField>

            {categorieId && (
              <FormField label="Sous-catégorie" hint="Facultatif">
                <select
                  value={sousCategorieId}
                  onChange={event => setSousCategorieId(event.target.value)}
                  className="select select-bordered w-full rounded-xl border-slate-700/80 bg-slate-950/70 text-slate-100"
                >
                  <option value="">Aucune sous-catégorie</option>
                  {subs.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icone ? `${category.icone} ` : ''}{category.nom}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
          </FormSection>
        </div>

        <FormActions>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button
            disabled={!nom.trim() || montant <= 0}
            onClick={() => onSave(
              editTarget!.id,
              nom.trim(),
              montant,
              editTarget!.recurrentId,
              categorieId || null,
              sousCategorieId || null,
              payee,
              payee ? (dateReelle || localDateISO()) : null,
            )}
          >
            Enregistrer
          </Button>
        </FormActions>
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Supprimer « {target?.nom} » ?</DialogTitle>
          <DialogDescription>Choisissez si vous retirez seulement l’occurrence actuelle ou la charge récurrente.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <button type="button" onClick={() => onDelete('mois')} className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4 text-left hover:border-slate-700">
            <span className="block text-sm font-semibold text-slate-100">Ce mois seulement</span>
            <span className="mt-1 block text-xs text-slate-500">La charge reviendra selon sa récurrence.</span>
          </button>
          {target?.recurrentId && (
            <button type="button" onClick={() => onDelete('definitif')} className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-left hover:bg-rose-500/15">
              <span className="block text-sm font-semibold text-rose-300">Arrêter définitivement</span>
              <span className="mt-1 block text-xs text-slate-500">La charge ne sera plus reportée.</span>
            </button>
          )}
        </div>
        <FormActions><Button variant="ghost" onClick={onClose}>Annuler</Button></FormActions>
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
  onSave: (scope: 'mois' | 'suivantes' | 'tous') => void
}

export function ChargeFixeScopeDialog({ target, onClose, onSave }: ScopeProps) {
  return (
    <Dialog open={!!target} onOpenChange={value => { if (!value) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Appliquer la modification</DialogTitle>
          <DialogDescription>« {target?.nom} » est une charge récurrente.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <button type="button" onClick={() => onSave('mois')} className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4 text-left hover:border-slate-700">
            <span className="block text-sm font-semibold text-slate-100">Ce mois seulement</span>
            <span className="mt-1 block text-xs text-slate-500">Les prochains mois conserveront le modèle actuel.</span>
          </button>
          <button type="button" onClick={() => onSave('suivantes')} className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-left hover:bg-indigo-500/15">
            <span className="flex items-center gap-2 text-sm font-semibold text-indigo-200"><Repeat2 className="h-4 w-4" /> Cette occurrence et les suivantes</span>
            <span className="mt-1 block text-xs text-slate-500">L’historique passé reste inchangé et le modèle est mis à jour pour la suite.</span>
          </button>
          <button type="button" onClick={() => onSave('tous')} className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 text-left hover:bg-violet-500/15">
            <span className="flex items-center gap-2 text-sm font-semibold text-violet-200"><Repeat2 className="h-4 w-4" /> Toute la série</span>
            <span className="mt-1 block text-xs text-slate-500">Les occurrences passées, présentes et futures sont mises à jour.</span>
          </button>
        </div>
        <FormActions><Button variant="ghost" onClick={onClose}>Annuler</Button></FormActions>
      </DialogContent>
    </Dialog>
  )
}
