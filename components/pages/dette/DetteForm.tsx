'use client'

import { useMemo, useState } from 'react'
import { Building2, CalendarDays, FileText, HandCoins, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormActions, FormField, FormSection, SegmentedControl } from '@/components/ui/form-layout'

type DebtMode = 'simple' | 'credit'

type DebtFormData = {
  titre: string
  description: string | null
  personne: string
  montant: number
  date_echeance: string | null
  mode?: DebtMode
  taux_annuel?: number | null
  mensualite?: number | null
  assurance_mensuelle?: number | null
  date_debut?: string | null
  duree_mois?: number | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tab: 'je_dois' | 'jai_prete'
  onSubmit: (data: DebtFormData) => Promise<void>
}

function theoreticalMonthly(capital: number, annualRate: number, months: number) {
  if (!(capital > 0) || !(months > 0)) return 0
  const rate = Math.max(0, annualRate) / 100 / 12
  if (rate === 0) return capital / months
  return capital * rate / (1 - Math.pow(1 + rate, -months))
}

function endDate(start: string, months: number) {
  if (!start || !(months > 0)) return ''
  const date = new Date(start + 'T12:00:00')
  date.setMonth(date.getMonth() + months)
  return date.toISOString().slice(0, 10)
}

export default function DetteForm({ open, onOpenChange, tab, onSubmit }: Props) {
  const [mode, setMode] = useState<DebtMode>('simple')
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [personne, setPersonne] = useState('')
  const [montant, setMontant] = useState(0)
  const [dateEcheance, setDateEcheance] = useState('')
  const [tauxAnnuel, setTauxAnnuel] = useState('')
  const [mensualite, setMensualite] = useState(0)
  const [assurance, setAssurance] = useState(0)
  const [dateDebut, setDateDebut] = useState('')
  const [dureeMois, setDureeMois] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDebt = tab === 'je_dois'
  const effectiveMode: DebtMode = isDebt ? mode : 'simple'
  const duration = Number(dureeMois)
  const rate = Number(String(tauxAnnuel).replace(',', '.')) || 0
  const suggestedMonthly = useMemo(() => theoreticalMonthly(montant, rate, duration), [montant, rate, duration])
  const calculatedEnd = useMemo(() => endDate(dateDebut, duration), [dateDebut, duration])

  const canSubmit = Boolean(
    titre.trim() &&
    personne.trim() &&
    Number.isFinite(montant) &&
    montant > 0 &&
    (effectiveMode === 'simple' || (dateDebut && duration > 0 && mensualite > 0)),
  )

  const resetForm = () => {
    setMode('simple')
    setTitre('')
    setDescription('')
    setPersonne('')
    setMontant(0)
    setDateEcheance('')
    setTauxAnnuel('')
    setMensualite(0)
    setAssurance(0)
    setDateDebut('')
    setDureeMois('')
    setError(null)
  }

  const handleSubmit = async () => {
    if (!canSubmit || saving) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        titre: titre.trim(),
        description: description.trim() || null,
        personne: personne.trim(),
        montant,
        date_echeance: effectiveMode === 'credit' ? (dateEcheance || calculatedEnd || null) : (dateEcheance || null),
        mode: effectiveMode,
        taux_annuel: effectiveMode === 'credit' ? rate : null,
        mensualite: effectiveMode === 'credit' ? mensualite : null,
        assurance_mensuelle: effectiveMode === 'credit' ? (assurance || null) : null,
        date_debut: effectiveMode === 'credit' ? dateDebut : null,
        duree_mois: effectiveMode === 'credit' ? duration : null,
      })
      resetForm()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer cette dette ou créance.')
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
          <DialogTitle>{isDebt ? (effectiveMode === 'credit' ? 'Nouveau crédit bancaire' : 'Nouvelle dette') : 'Nouvelle créance'}</DialogTitle>
          <DialogDescription>
            {isDebt ? 'Suivez une dette simple ou les caractéristiques réelles d’un crédit bancaire.' : 'Enregistrez une somme que quelqu’un doit vous rembourser.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isDebt && (
            <SegmentedControl
              value={mode}
              onChange={setMode}
              options={[
                { value: 'simple', label: 'Dette simple', description: 'Prêt, avance ou somme due' },
                { value: 'credit', label: 'Crédit bancaire', description: 'Capital, taux et mensualités' },
              ]}
            />
          )}

          <FormSection title="Informations" description="Identifiez facilement cet engagement." icon={effectiveMode === 'credit' ? <Building2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}>
            <FormField label={effectiveMode === 'credit' ? 'Nom du crédit' : 'Titre'}>
              <Input placeholder={effectiveMode === 'credit' ? 'Ex. Crédit immobilier' : isDebt ? 'Ex. Prêt voiture' : 'Ex. Avance à un proche'} value={titre} onChange={event => setTitre(event.target.value)} />
            </FormField>
            <FormField label={effectiveMode === 'credit' ? 'Banque / organisme' : isDebt ? 'À qui devez-vous cette somme ?' : 'Qui vous doit cette somme ?'}>
              <Input placeholder={effectiveMode === 'credit' ? 'Ex. Crédit Agricole' : 'Nom de la personne ou de l’organisme'} value={personne} onChange={event => setPersonne(event.target.value)} />
            </FormField>
          </FormSection>

          <FormSection title={effectiveMode === 'credit' ? 'Capital emprunté' : 'Montant'} icon={<HandCoins className="h-4 w-4" />}>
            <FormField label={effectiveMode === 'credit' ? 'Capital initial' : 'Montant total'}>
              <CalculatorInput value={montant} onChange={setMontant} placeholder="0,00 €" />
            </FormField>
          </FormSection>

          {effectiveMode === 'credit' ? (
            <>
              <FormSection title="Conditions du crédit" description="Renseignez les valeurs indiquées sur votre offre de prêt." icon={<Percent className="h-4 w-4" />}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Taux nominal annuel">
                    <div className="relative">
                      <Input type="number" min="0" step="0.001" value={tauxAnnuel} onChange={event => setTauxAnnuel(event.target.value)} placeholder="Ex. 3,25" className="pr-9" />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">%</span>
                    </div>
                  </FormField>
                  <FormField label="Durée">
                    <div className="relative">
                      <Input type="number" min="1" step="1" value={dureeMois} onChange={event => setDureeMois(event.target.value)} placeholder="Ex. 240" className="pr-14" />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">mois</span>
                    </div>
                  </FormField>
                  <FormField label="Mensualité hors assurance">
                    <CalculatorInput value={mensualite} onChange={setMensualite} placeholder="0,00 €" />
                  </FormField>
                  <FormField label="Assurance mensuelle" hint="Facultatif">
                    <CalculatorInput value={assurance} onChange={setAssurance} placeholder="0,00 €" />
                  </FormField>
                </div>
                {suggestedMonthly > 0 && (
                  <button type="button" className="text-left text-xs text-slate-500 hover:text-indigo-300" onClick={() => setMensualite(Math.round(suggestedMonthly * 100) / 100)}>
                    Mensualité théorique selon capital/taux/durée : <strong className="text-indigo-300">{suggestedMonthly.toLocaleString('fr-FR', { style:'currency', currency:'EUR' })}</strong> — utiliser
                  </button>
                )}
              </FormSection>

              <FormSection title="Calendrier" icon={<CalendarDays className="h-4 w-4" />}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Début du crédit">
                    <Input type="date" value={dateDebut} onChange={event => setDateDebut(event.target.value)} />
                  </FormField>
                  <FormField label="Fin prévue">
                    <Input type="date" value={dateEcheance || calculatedEnd} onChange={event => setDateEcheance(event.target.value)} />
                  </FormField>
                </div>
              </FormSection>
            </>
          ) : (
            <FormSection title="Échéance et note" description="Ces informations sont facultatives." icon={<CalendarDays className="h-4 w-4" />}>
              <FormField label={isDebt ? 'Remboursement souhaité le' : 'Remboursement attendu le'} hint="Facultatif">
                <Input type="date" value={dateEcheance} onChange={event => setDateEcheance(event.target.value)} />
              </FormField>
              <FormField label="Note" hint="Facultatif">
                <Input placeholder="Ajouter un contexte ou une précision" value={description} onChange={event => setDescription(event.target.value)} />
              </FormField>
            </FormSection>
          )}

          {effectiveMode === 'credit' && (
            <FormField label="Note" hint="Facultatif">
              <Input placeholder="Informations complémentaires" value={description} onChange={event => setDescription(event.target.value)} />
            </FormField>
          )}

          {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
        </div>

        <FormActions>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? 'Enregistrement…' : effectiveMode === 'credit' ? 'Créer le crédit' : isDebt ? 'Créer la dette' : 'Créer la créance'}
          </Button>
        </FormActions>
      </DialogContent>
    </Dialog>
  )
}
