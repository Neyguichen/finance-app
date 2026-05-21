'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Pencil, CalendarClock } from 'lucide-react'
import { formatEuro, formatDate } from '@/lib/utils'
import { differenceInMonths, format } from 'date-fns'
import type { Dette, RemboursementDette } from '@/lib/types'
import DetteEditDialog from './DetteEditDialog'

type Props = {
  dette: Dette
  rembList: RemboursementDette[]
  onUpdate: (data: { id: string; titre: string; personne: string; montant: number; date_echeance: string | null; description: string | null }) => void
  onAddRemboursement: (data: { dette_id: string; montant: number; date: string }) => void
  onRemoveRemboursement: (id: string) => void
  onUpdateRemboursement: (data: { id: string; montant: number; date: string }) => void
  onArchive: (id: string) => void
  onUnarchive: (id: string) => void
}

export default function DetteDetail({
  dette, rembList,
  onUpdate, onAddRemboursement, onRemoveRemboursement, onUpdateRemboursement,
  onArchive, onUnarchive,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [newMontant, setNewMontant] = useState('')
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [editDette, setEditDette] = useState(false)

  // Édition remboursement inline
  const [editRemb, setEditRemb] = useState<string | null>(null)
  const [editRembMontant, setEditRembMontant] = useState(0)
  const [editRembDate, setEditRembDate] = useState('')

  const totalRemb = rembList.reduce((s, r) => s + Number(r.montant), 0)
  const reste = Number(dette.montant) - totalRemb

  // Mensualité basée sur le RESTE
  const mensualite = dette.date_echeance
    ? (() => {
        const moisRestants = differenceInMonths(new Date(dette.date_echeance), new Date())
        return moisRestants > 0 ? Math.ceil((reste / moisRestants) * 100) / 100 : reste
      })()
    : null

  const cardClass = `bg-slate-900 border-slate-800 ${dette.archived ? 'opacity-60' : ''}`

  return (
    <Card className={cardClass}>
      <CardContent className="p-3 space-y-2">

        {/* Zone principale (toujours visible) */}
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold">{dette.titre}</p>
            {dette.description && <p className="text-xs text-slate-500">{dette.description}</p>}
            <p className="text-sm text-slate-400 mt-1">
              {dette.type === 'je_dois' ? 'À' : 'De'} : <span className="text-white">{dette.personne}</span>
            </p>
          </div>
          <div className="text-right">
            <p className={`font-bold text-lg ${reste <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {reste <= 0 ? 'Soldé ✅' : formatEuro(reste)}
            </p>
            {dette.date_echeance && (
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 justify-end">
                <CalendarClock className="w-3.5 h-3.5" />
                <span>{formatDate(dette.date_echeance)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Mensualité recommandée */}
        {mensualite !== null && reste > 0 && (
          <div className="px-3 py-2 bg-slate-800 rounded-lg flex justify-between text-sm">
            <span className="text-slate-400">Mensualité recommandée</span>
            <span className="text-purple-400 font-semibold">{formatEuro(mensualite)}/mois</span>
          </div>
        )}

        {/* Remboursé résumé */}
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Remboursé</span>
          <span className="text-emerald-400">{formatEuro(totalRemb)}</span>
        </div>

        {/* Toggle détails */}
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-400 underline">
          {expanded ? 'Masquer les détails ▲' : 'Voir les détails ▼'}
        </button>

        {expanded && (
          <div className="space-y-3 pt-2 border-t border-slate-800">
            {/* Dû initial */}
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Dû initial</span>
              <span className="text-white">{formatEuro(Number(dette.montant))}</span>
            </div>
            {dette.description && (
              <p className="text-xs text-slate-500 italic">{dette.description}</p>
            )}

            {/* Liste des remboursements */}
            <div className="space-y-1">
              {rembList.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm bg-slate-800 rounded px-2 py-1">
                  {editRemb === r.id ? (
                    <>
                      <Input type="number" step="0.01" className="w-24 h-7 text-xs"
                        value={editRembMontant} onChange={e => setEditRembMontant(parseFloat(e.target.value) || 0)} />
                      <Input type="date" className="w-32 h-7 text-xs"
                        value={editRembDate} onChange={e => setEditRembDate(e.target.value)} />
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-400"
                        onClick={() => {
                          onUpdateRemboursement({ id: r.id, montant: editRembMontant, date: editRembDate })
                          setEditRemb(null)
                        }}>✓</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => setEditRemb(null)}>✕</Button>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-400">{formatDate(r.date)}</span>
                      <span className="text-emerald-400 font-medium">{formatEuro(Number(r.montant))}</span>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6"
                          onClick={() => { setEditRemb(r.id); setEditRembMontant(Number(r.montant)); setEditRembDate(r.date) }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400"
                          onClick={() => onRemoveRemboursement(r.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Ajouter un remboursement */}
            {!dette.archived && reste > 0 && (
              <div className="flex gap-2">
                <Input type="number" step="0.01" placeholder="Montant"
                  className="flex-1 h-8 text-sm" value={newMontant}
                  onChange={e => setNewMontant(e.target.value)} />
                <Input type="date" className="w-32 h-8 text-sm"
                  value={newDate} onChange={e => setNewDate(e.target.value)} />
                <Button size="sm" className="h-8" onClick={() => {
                  if (!newMontant) return
                  onAddRemboursement({ dette_id: dette.id, montant: parseFloat(newMontant), date: newDate })
                  setNewMontant('')
                }}>+</Button>
              </div>
            )}

            {/* Bouton modifier */}
            <Button size="sm" variant="outline" className="w-full text-xs"
              onClick={() => setEditDette(true)}>
              <Pencil className="w-3 h-3 mr-1" />Modifier cette dette
            </Button>

            {/* Archiver / Désarchiver */}
            {dette.archived ? (
              <Button size="sm" variant="ghost" className="w-full text-xs text-blue-400"
                onClick={() => onUnarchive(dette.id)}>
                Désarchiver cette dette
              </Button>
            ) : (
              <Button size="sm" variant="ghost" className="w-full text-xs text-orange-400"
                onClick={() => {
                  if (confirm('Archiver cette dette ? Tu pourras la retrouver plus tard.'))
                    onArchive(dette.id)
                }}>
                Archiver cette dette
              </Button>
            )}
          </div>
        )}

        {/* Dialog édition */}
        <DetteEditDialog
          open={editDette}
          onOpenChange={setEditDette}
          dette={dette}
          onSave={(data) => { onUpdate(data); setEditDette(false) }}
        />

      </CardContent>
    </Card>
  )
}