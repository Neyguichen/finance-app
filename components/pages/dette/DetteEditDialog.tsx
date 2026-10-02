'use client'

import { useEffect, useState } from 'react'
import { Building2, CalendarDays, FileText, HandCoins, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormActions, FormField, FormSection } from '@/components/ui/form-layout'
import type { Dette } from '@/lib/types'

type UpdateData = {
  id: string
  titre: string
  personne: string
  montant: number
  date_echeance: string | null
  description: string | null
  mode?: 'simple' | 'credit'
  taux_annuel?: number | null
  mensualite?: number | null
  assurance_mensuelle?: number | null
  date_debut?: string | null
  duree_mois?: number | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  dette: Dette | null
  minimumMontant?: number
  onSave: (data: UpdateData) => Promise<void>
}

export default function DetteEditDialog({ open, onOpenChange, dette, minimumMontant = 0, onSave }: Props) {
  const [titre, setTitre] = useState('')
  const [personne, setPersonne] = useState('')
  const [montant, setMontant] = useState(0)
  const [dateFin, setDateFin] = useState('')
  const [note, setNote] = useState('')
  const [taux, setTaux] = useState('')
  const [mensualite, setMensualite] = useState(0)
  const [assurance, setAssurance] = useState(0)
  const [dateDebut, setDateDebut] = useState('')
  const [dureeMois, setDureeMois] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCredit = dette?.mode === 'credit'
  const isDebt = dette?.type === 'je_dois'

  useEffect(() => {
    if (!dette) return
    setTitre(dette.titre)
    setPersonne(dette.personne)
    setMontant(Number(dette.montant))
    setDateFin(dette.date_echeance || '')
    setNote(dette.description || '')
    setTaux(dette.taux_annuel != null ? String(dette.taux_annuel) : '')
    setMensualite(Number(dette.mensualite || 0))
    setAssurance(Number(dette.assurance_mensuelle || 0))
    setDateDebut(dette.date_debut || '')
    setDureeMois(dette.duree_mois != null ? String(dette.duree_mois) : '')
    setError(null)
  }, [dette])

  const montantValide = Number.isFinite(montant) && montant > 0 && montant + 0.005 >= minimumMontant
  const creditValid = !isCredit || (dateDebut && Number(dureeMois) > 0 && mensualite > 0)
  const canSave = Boolean(dette && titre.trim() && personne.trim() && montantValide && creditValid)

  const handleSave = async () => {
    if (!dette || !canSave || saving) return
    setSaving(true)
    setError(null)
    try {
      await onSave({
        id: dette.id,
        titre: titre.trim(),
        personne: personne.trim(),
        montant,
        date_echeance: dateFin || null,
        description: note.trim() || null,
        mode: dette.mode || 'simple',
        taux_annuel: isCredit ? (Number(String(taux).replace(',', '.')) || 0) : null,
        mensualite: isCredit ? mensualite : null,
        assurance_mensuelle: isCredit ? (assurance || null) : null,
        date_debut: isCredit ? dateDebut : null,
        duree_mois: isCredit ? Number(dureeMois) : null,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer la modification.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => {
      if (saving) return
      if (!nextOpen) setError(null)
      onOpenChange(nextOpen)
    }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isCredit ? 'Modifier le crédit bancaire' : isDebt ? 'Modifier la dette' : 'Modifier la créance'}</DialogTitle>
          <DialogDescription>
            {isCredit ? 'Les remboursements existants seront recalculés si le capital ou le taux est modifié.' : 'Les remboursements déjà enregistrés restent inchangés.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormSection title="Informations" icon={isCredit ? <Building2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}>
            <FormField label={isCredit ? 'Nom du crédit' : 'Titre'}>
              <Input value={titre} onChange={event => setTitre(event.target.value)} />
            </FormField>
            <FormField label={isCredit ? 'Banque / organisme' : isDebt ? 'Créancier' : 'Débiteur'}>
              <Input value={personne} onChange={event => setPersonne(event.target.value)} />
            </FormField>
          </FormSection>

          <FormSection title={isCredit ? 'Capital initial' : 'Montant'} icon={<HandCoins className="h-4 w-4" />}>
            <CalculatorInput value={montant} onChange={setMontant} placeholder="0,00 €" />
            {minimumMontant > 0 && (
              <p className="text-xs leading-5 text-slate-500">
                Minimum autorisé : {minimumMontant.toFixed(2)} € déjà remboursés sur le capital.
              </p>
            )}
          </FormSection>

          {isCredit && (
            <FormSection title="Conditions du crédit" icon={<Percent className="h-4 w-4" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Taux nominal annuel">
                  <Input type="number" min="0" step="0.001" value={taux} onChange={event => setTaux(event.target.value)} />
                </FormField>
                <FormField label="Durée (mois)">
                  <Input type="number" min="1" step="1" value={dureeMois} onChange={event => setDureeMois(event.target.value)} />
                </FormField>
                <FormField label="Mensualité hors assurance">
                  <CalculatorInput value={mensualite} onChange={setMensualite} placeholder="0,00 €" />
                </FormField>
                <FormField label="Assurance mensuelle" hint="Facultatif">
                  <CalculatorInput value={assurance} onChange={setAssurance} placeholder="0,00 €" />
                </FormField>
              </div>
            </FormSection>
          )}

          <FormSection title="Calendrier et note" icon={<CalendarDays className="h-4 w-4" />}>
            {isCredit && (
              <FormField label="Début du crédit">
                <Input type="date" value={dateDebut} onChange={event => setDateDebut(event.target.value)} />
              </FormField>
            )}
            <FormField label={isCredit ? 'Fin prévue' : 'Échéance'} hint={!isCredit ? 'Facultatif' : undefined}>
              <Input type="date" value={dateFin} onChange={event => setDateFin(event.target.value)} />
            </FormField>
            <FormField label="Note" hint="Facultatif">
              <Input placeholder="Ajouter une précision" value={note} onChange={event => setNote(event.target.value)} />
            </FormField>
          </FormSection>

          {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
        </div>

        <FormActions>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </FormActions>
      </DialogContent>
    </Dialog>
  )
}
