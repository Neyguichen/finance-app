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
  onUpdate: (data: { id: string; titre: string; personne: string; montant: number; date_echeance: string | null; description: string | null }) => Promise<void>
  onAddRemboursement: (data: { dette_id: string; montant: number; date: string; impacte_budget?: boolean }) => Promise<void>
  onRemoveRemboursement: (id: string) => Promise<void>
  onUpdateRemboursement: (data: { id: string; montant: number; date: string; impacte_budget?: boolean }) => Promise<void>
  onArchive: (id: string) => Promise<void>
  onUnarchive: (id: string) => Promise<void>
}

const errorMessage = (err: unknown, fallback: string) => err instanceof Error ? err.message : fallback

export default function DetteDetail({
  dette, rembList,
  onUpdate, onAddRemboursement, onRemoveRemboursement, onUpdateRemboursement,
  onArchive, onUnarchive,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [newMontant, setNewMontant] = useState('')
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [newImpacteBudget, setNewImpacteBudget] = useState(false)
  const [editDette, setEditDette] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const [editRemb, setEditRemb] = useState<string | null>(null)
  const [editRembMontant, setEditRembMontant] = useState(0)
  const [editRembDate, setEditRembDate] = useState('')
  const [editRembImpacteBudget, setEditRembImpacteBudget] = useState(false)

  const totalRemb = rembList.reduce((s, r) => s + Number(r.montant), 0)
  const reste = Math.max(0, Number(dette.montant) - totalRemb)
  const isDebt = dette.type === 'je_dois'
  const entityLabel = isDebt ? 'dette' : 'créance'

  const mensualite = dette.date_echeance
    ? (() => {
        const moisRestants = differenceInMonths(new Date(dette.date_echeance), new Date())
        return moisRestants > 0 ? Math.ceil((reste / moisRestants) * 100) / 100 : reste
      })()
    : null

  const cardClass = `bg-slate-900 border-slate-800 ${dette.archived ? 'opacity-60' : ''}`

  const runAction = async (key: string, action: () => Promise<void>, fallback: string) => {
    setPendingAction(key)
    setActionError(null)
    try {
      await action()
      return true
    } catch (err) {
      setActionError(errorMessage(err, fallback))
      return false
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <Card className={cardClass}>
      <CardContent className="p-3 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold">{dette.titre}</p>
            {dette.description && <p className="text-xs text-slate-500">{dette.description}</p>}
            <p className="text-sm text-slate-400 mt-1">
              {isDebt ? 'À' : 'De'} : <span className="text-white">{dette.personne}</span>
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

        {mensualite !== null && reste > 0 && (
          <div className="px-3 py-2 bg-slate-800 rounded-lg flex justify-between text-sm">
            <span className="text-slate-400">Mensualité recommandée</span>
            <span className="text-purple-400 font-semibold">{formatEuro(mensualite)}/mois</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Remboursé</span>
          <span className="text-emerald-400">{formatEuro(totalRemb)}</span>
        </div>

        {actionError && <p className="text-xs text-red-400">{actionError}</p>}

        <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-400 underline">
          {expanded ? 'Masquer les détails ▲' : 'Voir les détails ▼'}
        </button>

        {expanded && (
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Montant initial</span>
              <span className="text-white">{formatEuro(Number(dette.montant))}</span>
            </div>
            {dette.description && (
              <p className="text-xs text-slate-500 italic">{dette.description}</p>
            )}

            <div className="space-y-1">
              {rembList.map(r => {
                const maxEditMontant = Number(r.montant) + reste
                const editValide = editRembMontant > 0 && editRembMontant <= maxEditMontant + 0.005 && Boolean(editRembDate)
                const editPending = pendingAction === `edit-${r.id}`
                const removePending = pendingAction === `remove-${r.id}`
                return (
                  <div key={r.id} className="flex items-center justify-between text-sm bg-slate-800 rounded px-2 py-1">
                    {editRemb === r.id ? (
                      <>
                        <Input type="number" min="0.01" max={maxEditMontant} step="0.01" className="w-24 h-7 text-xs"
                          value={editRembMontant} onChange={e => setEditRembMontant(parseFloat(e.target.value) || 0)} />
                        <Input type="date" className="w-32 h-7 text-xs"
                          value={editRembDate} onChange={e => setEditRembDate(e.target.value)} />
                        <label className="flex items-center gap-1 text-[11px] text-slate-400" title="Impacte réellement le solde du Budget">
                          <input type="checkbox" className="checkbox checkbox-xs"
                            checked={editRembImpacteBudget} onChange={e => setEditRembImpacteBudget(e.target.checked)} />
                          Budget
                        </label>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-400" disabled={!editValide || editPending}
                          onClick={async () => {
                            if (!editValide) return
                            const ok = await runAction(
                              `edit-${r.id}`,
                              () => onUpdateRemboursement({ id: r.id, montant: editRembMontant, date: editRembDate, impacte_budget: editRembImpacteBudget }),
                              'Impossible de modifier ce remboursement.',
                            )
                            if (ok) setEditRemb(null)
                          }}>{editPending ? '…' : '✓'}</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={editPending}
                          onClick={() => setEditRemb(null)}>✕</Button>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-400">{formatDate(r.date)}</span>
                        <span className="text-emerald-400 font-medium">{formatEuro(Number(r.montant))}</span>
                        {r.impacte_budget && (
                          <span className="text-[10px] rounded bg-blue-950 px-1.5 py-0.5 text-blue-300" title="Ce remboursement impacte le solde réel du Budget">
                            Budget
                          </span>
                        )}
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" disabled={Boolean(pendingAction)}
                            onClick={() => { setActionError(null); setEditRemb(r.id); setEditRembMontant(Number(r.montant)); setEditRembDate(r.date); setEditRembImpacteBudget(Boolean(r.impacte_budget)) }}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400" disabled={removePending || Boolean(pendingAction && !removePending)}
                            onClick={() => runAction(`remove-${r.id}`, () => onRemoveRemboursement(r.id), 'Impossible de supprimer ce remboursement.')}>
                            {removePending ? <span className="text-xs">…</span> : <Trash2 className="w-3 h-3" />}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {!dette.archived && reste > 0 && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input type="number" min="0.01" max={reste} step="0.01" placeholder="Montant"
                    className="flex-1 h-8 text-sm" value={newMontant}
                    onChange={e => setNewMontant(e.target.value)} />
                  <Input type="date" className="w-32 h-8 text-sm"
                    value={newDate} onChange={e => setNewDate(e.target.value)} />
                  <Button size="sm" className="h-8" disabled={!(Number(newMontant) > 0 && Number(newMontant) <= reste + 0.005 && newDate) || pendingAction === 'add'} onClick={async () => {
                    const montant = Number(newMontant)
                    if (!(montant > 0 && montant <= reste + 0.005 && newDate)) return
                    const ok = await runAction(
                      'add',
                      () => onAddRemboursement({ dette_id: dette.id, montant, date: newDate, impacte_budget: newImpacteBudget }),
                      'Impossible d’ajouter ce remboursement.',
                    )
                    if (ok) {
                      setNewMontant('')
                      setNewImpacteBudget(false)
                    }
                  }}>{pendingAction === 'add' ? '…' : '+'}</Button>
                </div>
                <p className="text-[11px] text-slate-500">Reste maximum remboursable : {formatEuro(reste)}</p>
                <label className="flex items-start gap-2 text-xs text-slate-400 cursor-pointer">
                  <input type="checkbox" className="checkbox checkbox-xs mt-0.5"
                    checked={newImpacteBudget} onChange={e => setNewImpacteBudget(e.target.checked)} />
                  <span>
                    Ce remboursement a réellement transité par ce Budget
                    <span className="block text-slate-500">
                      {isDebt
                        ? 'Il sera compté comme une dépense réelle et une sortie d’argent, une seule fois dans le solde.'
                        : 'Il sera compté comme une entrée d’argent, sans être considéré comme un revenu.'}
                    </span>
                  </span>
                </label>
              </div>
            )}

            <Button size="sm" variant="outline" className="w-full text-xs" disabled={Boolean(pendingAction)}
              onClick={() => { setActionError(null); setEditDette(true) }}>
              <Pencil className="w-3 h-3 mr-1" />Modifier cette {entityLabel}
            </Button>

            {dette.archived ? (
              <Button size="sm" variant="ghost" className="w-full text-xs text-blue-400" disabled={pendingAction === 'unarchive'}
                onClick={() => runAction('unarchive', () => onUnarchive(dette.id), `Impossible de désarchiver cette ${entityLabel}.`)}>
                {pendingAction === 'unarchive' ? 'Désarchivage…' : `Désarchiver cette ${entityLabel}`}
              </Button>
            ) : (
              <Button size="sm" variant="ghost" className="w-full text-xs text-orange-400" disabled={pendingAction === 'archive'}
                onClick={async () => {
                  if (confirm(`Archiver cette ${entityLabel} ? Tu pourras la retrouver plus tard.`)) {
                    await runAction('archive', () => onArchive(dette.id), `Impossible d’archiver cette ${entityLabel}.`)
                  }
                }}>
                {pendingAction === 'archive' ? 'Archivage…' : `Archiver cette ${entityLabel}`}
              </Button>
            )}
          </div>
        )}

        <DetteEditDialog
          open={editDette}
          onOpenChange={setEditDette}
          dette={dette}
          minimumMontant={totalRemb}
          onSave={onUpdate}
        />
      </CardContent>
    </Card>
  )
}
