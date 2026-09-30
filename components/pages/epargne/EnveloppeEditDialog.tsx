'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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
    if (editEnv) {
      setNom(editEnv.nom)
      setObjectif(editEnv.objectif)
      setSoldeInitial(Number(editEnv.solde_initial) || 0)
      setSoldeReference(editEnv.solde_reference != null ? Number(editEnv.solde_reference) : null)
      setDateReference(editEnv.date_solde_reference || '')
    }
  }, [editEnv])

  const handleSave = () => {
    if (!editEnv) return
    const oldInitial = Number(editEnv.solde_initial) || 0
    const diff = soldeInitial - oldInitial
    onSave({
      id: editEnv.id,
      nom,
      objectif,
      solde_initial: soldeInitial,
      solde: Number(editEnv.solde) + diff,
      solde_reference: dateReference && soldeReference != null ? soldeReference : null,
      date_solde_reference: dateReference && soldeReference != null ? dateReference : null,
    })
  }

  return (
    <Dialog open={!!editEnv} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader><DialogTitle>Modifier l&apos;enveloppe</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Nom</label>
            <Input value={nom} onChange={e => setNom(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Objectif (€)</label>
            <CalculatorInput value={objectif ?? 0} onChange={v => setObjectif(v || null)} placeholder="Laisser vide = pas d'objectif" />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Solde initial historique (€)</label>
            <CalculatorInput value={soldeInitial} onChange={setSoldeInitial} placeholder="Solde initial" />
            <p className="mt-1 text-xs text-slate-600">
              Conservé pour la compatibilité V1 et les périodes antérieures à une référence V2.
            </p>
          </div>

          <div className="rounded-xl border border-blue-900/60 bg-blue-950/20 p-3 space-y-3">
            <div>
              <p className="text-sm font-medium text-blue-200">Référence d&apos;épargne V2</p>
              <p className="mt-1 text-xs text-slate-500">
                Indique le solde réellement constaté à une date donnée. Cette valeur est un stock de départ :
                elle ne crée aucun faux versement et ne fausse pas les statistiques mensuelles.
              </p>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Solde réel de référence</label>
              <CalculatorInput value={soldeReference ?? 0} onChange={value => setSoldeReference(value)} placeholder="Ex. 2 500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">À la date du</label>
              <Input type="date" value={dateReference} onChange={e => setDateReference(e.target.value)} />
            </div>
            {(dateReference || soldeReference != null) && (
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-300"
                onClick={() => { setDateReference(''); setSoldeReference(null) }}
              >
                Retirer la référence V2
              </button>
            )}
          </div>
          <Button className="w-full" onClick={handleSave}>Enregistrer</Button>
          <Button className="w-full" variant="ghost" onClick={onClose}>Annuler</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}