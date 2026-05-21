'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { STATUTS } from './StatutBadge'
import type { RemboursementAlsh } from '@/lib/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editItem: RemboursementAlsh | null
  onSubmit: (data: {
    lien_facture: string | null
    periode_debut: string
    periode_fin: string
    date_paiement: string | null
    date_partage_audrey: string | null
    statut: RemboursementAlsh['statut']
    montant: number | null
    note: string | null
  }) => Promise<void>
}

export default function RemboursementForm({ open, onOpenChange, editItem, onSubmit }: Props) {
  const [lienFacture, setLienFacture] = useState('')
  const [periodeDebut, setPeriodeDebut] = useState('')
  const [periodeFin, setPeriodeFin] = useState('')
  const [datePaiement, setDatePaiement] = useState('')
  const [datePartage, setDatePartage] = useState('')
  const [statut, setStatut] = useState<string>('a_transmettre')
  const [montant, setMontant] = useState('')
  const [note, setNote] = useState('')

  // Remplir le formulaire quand on édite
  useEffect(() => {
    if (editItem) {
      setLienFacture(editItem.lien_facture || '')
      setPeriodeDebut(editItem.periode_debut)
      setPeriodeFin(editItem.periode_fin)
      setDatePaiement(editItem.date_paiement || '')
      setDatePartage(editItem.date_partage_audrey || '')
      setStatut(editItem.statut)
      setMontant(editItem.montant != null ? String(editItem.montant) : '')
      setNote(editItem.note || '')
    } else {
      setLienFacture('')
      setPeriodeDebut('')
      setPeriodeFin('')
      setDatePaiement('')
      setDatePartage('')
      setStatut('a_transmettre')
      setMontant('')
      setNote('')
    }
  }, [editItem])

  const handleSubmit = async () => {
    if (!periodeDebut || !periodeFin) return
    await onSubmit({
      lien_facture: lienFacture || null,
      periode_debut: periodeDebut,
      periode_fin: periodeFin,
      date_paiement: datePaiement || null,
      date_partage_audrey: datePartage || null,
      statut: statut as RemboursementAlsh['statut'],
      montant: montant ? parseFloat(montant) : null,
      note: note || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Modifier' : 'Nouveau remboursement'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">Lien facture (Google Drive)</label>
            <Input placeholder="https://drive.google.com/..." value={lienFacture} onChange={e => setLienFacture(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400">Période début</label>
              <Input type="date" value={periodeDebut} onChange={e => setPeriodeDebut(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-400">Période fin</label>
              <Input type="date" value={periodeFin} onChange={e => setPeriodeFin(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400">Date paiement</label>
              <Input type="date" value={datePaiement} onChange={e => setDatePaiement(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-400">Partagé à Audrey</label>
              <Input type="date" value={datePartage} onChange={e => setDatePartage(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400">Statut</label>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {STATUTS.map(s => (
                <button key={s.value} type="button" onClick={() => setStatut(s.value)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                    statut === s.value ? s.color : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}>{s.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400">Montant (optionnel)</label>
            <Input type="number" step="0.01" placeholder="0.00" value={montant} onChange={e => setMontant(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-400">Note</label>
            <Input placeholder="Note..." value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleSubmit}>
            {editItem ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}