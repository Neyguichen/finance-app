'use client'

import { useState, useEffect } from 'react'
import { History, PiggyBank, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormActions, FormField, FormSection } from '@/components/ui/form-layout'

type EditEnvData = {
  id: string
  nom: string
  objectif: number | null
  solde: number
  solde_initial: number
  solde_reference?: number | null
  date_solde_reference?: string | null
} | null

type Props = {
  editEnv: EditEnvData
  onClose: () => void
  onSave: (data: {
    id: string
    nom: string
    objectif: number | null
    solde_initial: number
    solde: number
    solde_reference: number | null
    date_solde_reference: string | null
  }) => void
}

export default function EnveloppeEditDialog({ editEnv, onClose, onSave }: Props) {
  const [nom, setNom] = useState('')
  const [objectif, setObjectif] = useState<number | null>(null)
  const [soldeInitial, setSoldeInitial] = useState(0)
  const [soldeReference, setSoldeReference] = useState<number | null>(null)
  const [dateReference, setDateReference] = useState('')

  useEffect(() => {
    if (!editEnv) return
    setNom(editEnv.nom)
    setObjectif(editEnv.objectif)
    setSoldeInitial(Number(editEnv.solde_initial) || 0)
    setSoldeReference(editEnv.solde_reference != null ? Number(editEnv.solde_reference) : null)
    setDateReference(editEnv.date_solde_reference || '')
  }, [editEnv])

  const handleSave = () => {
    if (!editEnv || !nom.trim()) return
    const oldInitial = Number(editEnv.solde_initial) || 0
    const diff = soldeInitial - oldInitial
    onSave({
      id: editEnv.id,
      nom: nom.trim(),
      objectif,
      solde_initial: soldeInitial,
      solde: Number(editEnv.solde) + diff,
      solde_reference: dateReference && soldeReference != null ? soldeReference : null,
      date_solde_reference: dateReference && soldeReference != null ? dateReference : null,
    })
  }

  return (
    <Dialog open={!!editEnv} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l’enveloppe</DialogTitle>
          <DialogDescription>Mettez à jour son nom, son objectif ou sa référence de solde.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormSection title="Enveloppe" icon={<PiggyBank className="h-4 w-4" />}>
            <FormField label="Nom">
              <Input value={nom} onChange={e => setNom(e.target.value)} />
            </FormField>
          </FormSection>

          <FormSection title="Objectif" icon={<Target className="h-4 w-4" />}>
            <FormField label="Montant cible" hint="Facultatif">
              <CalculatorInput value={objectif ?? 0} onChange={v => setObjectif(v || null)} placeholder="Pas d’objectif" />
            </FormField>
          </FormSection>

          <FormSection
            title="Historique et référence"
            description="Le solde initial assure la compatibilité avec les anciennes périodes. La référence correspond au solde réellement constaté à une date donnée."
            icon={<History className="h-4 w-4" />}
          >
            <FormField label="Solde initial historique">
              <CalculatorInput value={soldeInitial} onChange={setSoldeInitial} placeholder="0,00 €" />
            </FormField>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Solde réel de référence" hint="Facultatif">
                <CalculatorInput value={soldeReference ?? 0} onChange={value => setSoldeReference(value || null)} placeholder="0,00 €" />
              </FormField>
              <FormField label="À la date du" hint="Facultatif">
                <Input type="date" value={dateReference} onChange={e => setDateReference(e.target.value)} />
              </FormField>
            </div>

            {(dateReference || soldeReference != null) && (
              <button type="button" className="text-xs font-medium text-slate-500 transition hover:text-slate-300" onClick={() => {
                setDateReference('')
                setSoldeReference(null)
              }}>
                Retirer la référence de solde
              </button>
            )}
          </FormSection>
        </div>

        <FormActions>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={!nom.trim()}>Enregistrer</Button>
        </FormActions>
      </DialogContent>
    </Dialog>
  )
}
