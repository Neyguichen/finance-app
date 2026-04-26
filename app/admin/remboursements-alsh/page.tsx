'use client'

import { useState } from 'react'
import { useApp } from '@/components/AppContext'
import { isAdmin } from '@/lib/utils'
import { useRemboursementsAlsh } from '@/lib/hooks/useRemboursementsAlsh'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2, Pencil, ExternalLink } from 'lucide-react'
import { formatDate, formatEuro } from '@/lib/utils'
import type { RemboursementAlsh } from '@/lib/types'

const STATUTS = [
  { value: 'a_transmettre', label: 'À transmettre à la compta', color: 'bg-red-600 text-white' },
  { value: 'transmis', label: 'Transmis', color: 'bg-orange-500 text-white' },
  { value: 'rembourse', label: 'Remboursé', color: 'bg-yellow-500 text-black' },
  { value: 'vire_cj', label: 'Viré sur CJ', color: 'bg-emerald-500 text-white' },
] as const

function StatutBadge({ statut }: { statut: string }) {
  const s = STATUTS.find(st => st.value === statut) || STATUTS[0]
  return <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
}

export default function RemboursementsAlshPage() {
  const { userId } = useApp()
  const { data: items = [], create, update, remove } = useRemboursementsAlsh()

  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<RemboursementAlsh | null>(null)

  // Form state
  const [lienFacture, setLienFacture] = useState('')
  const [periodeDebut, setPeriodeDebut] = useState('')
  const [periodeFin, setPeriodeFin] = useState('')
  const [datePaiement, setDatePaiement] = useState('')
  const [datePartage, setDatePartage] = useState('')
  const [statut, setStatut] = useState<string>('a_transmettre')
  const [montant, setMontant] = useState('')
  const [note, setNote] = useState('')

  if (!isAdmin(userId)) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400 text-lg">🔒 Accès réservé</p>
      </div>
    )
  }

  const resetForm = () => {
    setLienFacture('')
    setPeriodeDebut('')
    setPeriodeFin('')
    setDatePaiement('')
    setDatePartage('')
    setStatut('a_transmettre')
    setMontant('')
    setNote('')
    setEditItem(null)
  }

  const openEdit = (item: RemboursementAlsh) => {
    setEditItem(item)
    setLienFacture(item.lien_facture || '')
    setPeriodeDebut(item.periode_debut)
    setPeriodeFin(item.periode_fin)
    setDatePaiement(item.date_paiement || '')
    setDatePartage(item.date_partage_audrey || '')
    setStatut(item.statut)
    setMontant(item.montant != null ? String(item.montant) : '')
    setNote(item.note || '')
    setOpen(true)
  }

  const handleSubmit = async () => {
    if (!periodeDebut || !periodeFin || !userId) return

    const payload = {
      user_id: userId,
      lien_facture: lienFacture || null,
      periode_debut: periodeDebut,
      periode_fin: periodeFin,
      date_paiement: datePaiement || null,
      date_partage_audrey: datePartage || null,
      statut: statut as RemboursementAlsh['statut'],
      montant: montant ? parseFloat(montant) : null,
      note: note || null,
    }

    if (editItem) {
      await update.mutateAsync({ id: editItem.id, ...payload })
    } else {
      await create.mutateAsync(payload)
    }
    resetForm()
    setOpen(false)
  }

  // Compteurs par statut
  const countByStatut = (s: string) => items.filter(i => i.statut === s).length
  const totalMontant = items.reduce((s, i) => s + (Number(i.montant) || 0), 0)

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h1 className="text-xl font-bold">🏕️ Remboursements ALSH</h1>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v) }}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex-shrink-0"><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-md mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editItem ? 'Modifier' : 'Nouveau remboursement'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Lien facture (Google Drive)</label>
                <Input placeholder="https://drive.google.com/..." value={lienFacture} onChange={e => setLienFacture(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400">Période début</label>
                  <Input type="date" value={periodeDebut} onChange={e => setPeriodeDebut(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Période fin</label>
                  <Input type="date" value={periodeFin} onChange={e => setPeriodeFin(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
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
      </div>

      {/* Résumé */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-3 flex flex-wrap gap-3 text-xs">
          {STATUTS.map(s => (
            <span key={s.value} className={`px-2 py-1 rounded-full ${s.color}`}>
              {s.label}: {countByStatut(s.value)}
            </span>
          ))}
          {totalMontant > 0 && (
            <span className="ml-auto text-slate-300 font-semibold">
              Total: {formatEuro(totalMontant)}
            </span>
          )}
        </CardContent>
      </Card>

      {/* Liste */}
      <div className="space-y-2">
        {items.map(item => (
          <Card key={item.id} className="bg-slate-900 border-slate-800">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <StatutBadge statut={item.statut} />
                  <p className="text-sm text-slate-300 mt-1">
                    📅 {formatDate(item.periode_debut)} → {formatDate(item.periode_fin)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {item.montant != null && (
                    <span className="font-bold text-white mr-2">{formatEuro(Number(item.montant))}</span>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500"
                    onClick={() => openEdit(item)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500"
                    onClick={() => { if (confirm('Supprimer ?')) remove.mutate(item.id) }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-0.5">
                {item.date_paiement && <p>💳 Payé le {formatDate(item.date_paiement)}</p>}
                {item.date_partage_audrey && <p>📤 Partagé à Audrey le {formatDate(item.date_partage_audrey)}</p>}
                {item.note && <p className="text-slate-400 italic">{item.note}</p>}
              </div>

              {item.lien_facture && (
                <a href={item.lien_facture} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline">
                  <ExternalLink className="w-3 h-3" /> Voir la facture
                </a>
              )}
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <p className="text-center text-slate-500 py-8">Aucun remboursement pour le moment</p>
        )}
      </div>
    </div>
  )
}