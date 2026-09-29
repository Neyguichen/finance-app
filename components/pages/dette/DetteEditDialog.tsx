'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Dette } from '@/lib/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  dette: Dette | null
  minimumMontant?: number
  onSave: (data: {
    id: string
    titre: string
    personne: string
    montant: number
    date_echeance: string | null
    description: string | null
  }) => Promise<void>
}

export default function DetteEditDialog({ open, onOpenChange, dette, minimumMontant = 0, onSave }: Props) {
  const [titre, setTitre] = useState('')
  const [personne, setPersonne] = useState('')
  const [montant, setMontant] = useState(0)
  const [dateFin, setDateFin] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (dette) {
      setTitre(dette.titre)
      setPersonne(dette.personne)
      setMontant(Number(dette.montant))
      setDateFin(dette.date_echeance || '')
      setNote(dette.description || '')
      setError(null)
    }
  }, [dette])

  const montantValide = Number.isFinite(montant) && montant > 0 && montant + 0.005 >= minimumMontant
  const canSave = Boolean(dette && titre.trim() && personne.trim() && montantValide)
  const isDebt = dette?.type === 'je_dois'

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
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer la modification.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!saving) {
        setError(null)
        onOpenChange(nextOpen)
      }
    }}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader><DialogTitle>{isDebt ? 'Modifier la dette' : 'Modifier la créance'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Titre" value={titre} onChange={e => setTitre(e.target.value)} />
          <Input placeholder="Personne" value={personne} onChange={e => setPersonne(e.target.value)} />
          <div>
            <Input type="number" min={Math.max(0.01, minimumMontant)} step="0.01" placeholder="Montant total"
              value={montant} onChange={e => setMontant(parseFloat(e.target.value) || 0)} />
            {minimumMontant > 0 && (
              <p className="text-[11px] text-slate-500 mt-1">
                Minimum autorisé : {minimumMontant.toFixed(2)} € déjà remboursés.
              </p>
            )}
          </div>
          <Input type="date" placeholder="Échéance" value={dateFin} onChange={e => setDateFin(e.target.value)} />
          <Input placeholder="Note" value={note} onChange={e => setNote(e.target.value)} />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button className="w-full" disabled={!canSave || saving} onClick={handleSave}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
