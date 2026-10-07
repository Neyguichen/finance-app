'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormActions, FormField, FormSection, SegmentedControl } from '@/components/ui/form-layout'
import { localDateISO } from '@/lib/utils'

type EditTarget = {
  id: string
  nom: string
  montant: number
  montantReel?: number | null
  type: 'actif' | 'passif'
  recurrentId?: string | null
  datePrevue?: string | null
  recu?: boolean
  dateReelle?: string | null
}

type EditScope = 'mois' | 'future'

type Props = {
  editTarget: EditTarget | null
  onClose: () => void
  doubleDate?: boolean
  onSave: (data: { id: string; nom: string; montant: number; montantReel: number | null; type: 'actif' | 'passif'; recurrentId?: string | null; datePrevue?: string | null; recu: boolean; dateReelle: string | null }, scope: EditScope) => Promise<void>
}

export default function RevenuEditDialog({ editTarget, onClose, onSave, doubleDate = false }: Props) {
  const [editNom, setEditNom] = useState('')
  const [editMontant, setEditMontant] = useState(0)
  const [editMontantReel, setEditMontantReel] = useState<number | null>(null)
  const [editType, setEditType] = useState<'actif' | 'passif'>('actif')
  const [editDatePrevue, setEditDatePrevue] = useState('')
  const [editRecu, setEditRecu] = useState(false)
  const [editDateReelle, setEditDateReelle] = useState('')
  const [scopeOpen, setScopeOpen] = useState(false)
  const [pendingData, setPendingData] = useState<any>(null)

  useEffect(() => {
    if (!editTarget) return
    setEditNom(editTarget.nom)
    setEditMontant(Number(editTarget.montant))
    setEditMontantReel(editTarget.montantReel == null ? null : Number(editTarget.montantReel))
    setEditType(editTarget.type)
    setEditDatePrevue(editTarget.datePrevue || '')
    setEditRecu(!!editTarget.recu)
    setEditDateReelle(editTarget.dateReelle || '')
  }, [editTarget])

  const handleSaveClick = () => {
    if (!editTarget || !editNom.trim() || editMontant <= 0) return
    const dateReelle = editRecu
      ? (editDateReelle || (editTarget.recu && editTarget.dateReelle ? editTarget.dateReelle : localDateISO()))
      : null

    const data = {
      id: editTarget.id,
      nom: editNom.trim(),
      montant: editMontant,
      montantReel: editRecu ? Number(editMontantReel ?? editMontant) : null,
      type: editType,
      recurrentId: editTarget.recurrentId,
      datePrevue: editDatePrevue || null,
      recu: editRecu,
      dateReelle,
    }

    if (editTarget.recurrentId) {
      setPendingData(data)
      setScopeOpen(true)
      return
    }

    void onSave(data, 'mois').then(onClose)
  }

  const handleScopeChoice = async (scope: EditScope) => {
    if (!pendingData) return
    await onSave(pendingData, scope)
    setPendingData(null)
    setScopeOpen(false)
    onClose()
  }

  return (
    <>
      <Dialog open={!!editTarget && !scopeOpen} onOpenChange={open => { if (!open) onClose() }}>
        <DialogContent className="max-h-[82vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le revenu</DialogTitle>
            <DialogDescription>Ajustez les informations de cette entrée sans modifier son historique.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5">
            <FormSection title="Identification" icon={<Coins className="h-4 w-4" />} className="p-3">
              <div className="grid gap-3 sm:grid-cols-[1.35fr_.85fr]">
                <FormField label="Nom">
                  <Input placeholder="Nom du revenu" value={editNom} onChange={event => setEditNom(event.target.value)} />
                </FormField>
                <FormField label="Type">
                  <SegmentedControl
                    value={editType}
                    onChange={setEditType}
                    options={[
                      { value: 'actif', label: 'Actif' },
                      { value: 'passif', label: 'Passif' },
                    ]}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Prévision" icon={<CalendarDays className="h-4 w-4" />} className="p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Montant prévu">
                  <CalculatorInput value={editMontant} onChange={setEditMontant} placeholder="0,00 €" />
                </FormField>
                <FormField label="Date prévue" hint="Facultatif">
                  <Input type="date" value={editDatePrevue} onChange={event => setEditDatePrevue(event.target.value)} />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Validation" icon={<CheckCircle2 className="h-4 w-4" />} className="p-3">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2.5">
                <Checkbox
                  checked={editRecu}
                  onCheckedChange={checked => {
                    const next = !!checked
                    setEditRecu(next)
                    if (next) {
                      if (editMontantReel == null) setEditMontantReel(editMontant)
                      if (!editDateReelle) setEditDateReelle(localDateISO())
                    } else {
                      setEditMontantReel(null)
                      setEditDateReelle('')
                    }
                  }}
                />
                <span className="text-sm font-medium text-slate-200">Revenu reçu</span>
              </label>

              {editRecu && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Montant réel">
                    <CalculatorInput value={Number(editMontantReel ?? editMontant)} onChange={setEditMontantReel} placeholder="Montant reçu" />
                  </FormField>
                  <FormField label="Date réelle" hint={doubleDate ? 'Validation bancaire' : undefined}>
                    <Input type="date" value={editDateReelle} onChange={event => setEditDateReelle(event.target.value)} />
                  </FormField>
                </div>
              )}
            </FormSection>
          </div>
          <FormActions>
            <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <Button disabled={!editNom.trim() || editMontant <= 0} onClick={handleSaveClick}>Enregistrer</Button>
          </FormActions>
        </DialogContent>
      </Dialog>

      <Dialog open={scopeOpen} onOpenChange={open => { if (!open) { setScopeOpen(false); onClose() } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Appliquer la modification</DialogTitle>
            <DialogDescription>Ce revenu est récurrent. Choisissez la portée de la modification.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <button type="button" onClick={() => handleScopeChoice('mois')} className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4 text-left transition hover:border-slate-700 hover:bg-slate-950/55">
              <span className="block text-sm font-semibold text-slate-100">Cette occurrence uniquement</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Les prochaines occurrences conserveront leurs valeurs actuelles.</span>
            </button>
            <button type="button" onClick={() => handleScopeChoice('future')} className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-left transition hover:bg-indigo-500/15">
              <span className="block text-sm font-semibold text-indigo-200">Cette occurrence et les suivantes</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">La récurrence sera mise à jour à partir de cette occurrence.</span>
            </button>
          </div>
          <FormActions><Button variant="ghost" onClick={() => { setScopeOpen(false); onClose() }}>Annuler</Button></FormActions>
        </DialogContent>
      </Dialog>
    </>
  )
}
