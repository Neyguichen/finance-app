'use client'

import { useState } from 'react'
import { Building2, CalendarClock, Landmark, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatEuro, formatDate } from '@/lib/utils'
import { differenceInMonths, format } from 'date-fns'
import type { Dette, RemboursementDette } from '@/lib/types'
import DetteEditDialog from './DetteEditDialog'

type DebtUpdate = {
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
  dette: Dette
  rembList: RemboursementDette[]
  onUpdate: (data: DebtUpdate) => Promise<void>
  onAddRemboursement: (data: { dette_id: string; montant: number; date: string; impacte_budget?: boolean }) => Promise<void>
  onRemoveRemboursement: (id: string) => Promise<void>
  onUpdateRemboursement: (data: { id: string; montant: number; date: string; impacte_budget?: boolean }) => Promise<void>
  onArchive: (id: string) => Promise<void>
  onUnarchive: (id: string) => Promise<void>
}

const errorMessage = (err: unknown, fallback: string) => err instanceof Error ? err.message : fallback

export default function DetteDetail({
  dette,
  rembList,
  onUpdate,
  onAddRemboursement,
  onRemoveRemboursement,
  onUpdateRemboursement,
  onArchive,
  onUnarchive,
}: Props) {
  const [expanded, setExpanded] = useState(true)
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

  const isCredit = dette.mode === 'credit'
  const isDebt = dette.type === 'je_dois'
  const entityLabel = isDebt ? 'dette' : 'créance'
  const totalPayments = rembList.reduce((sum, item) => sum + Number(item.montant), 0)
  const capitalRepaid = rembList.reduce(
    (sum, item) => sum + Number(isCredit ? (item.capital_rembourse || 0) : item.montant),
    0,
  )
  const remaining = Math.max(0, Number(dette.montant) - capitalRepaid)
  const interestAndInsurancePaid = Math.max(0, totalPayments - capitalRepaid)
  const contractualMonthly = isCredit
    ? Number(dette.mensualite || 0) + Number(dette.assurance_mensuelle || 0)
    : null

  const recommendedMonthly = !isCredit && dette.date_echeance
    ? (() => {
        const monthsRemaining = differenceInMonths(new Date(dette.date_echeance), new Date())
        return monthsRemaining > 0 ? Math.ceil((remaining / monthsRemaining) * 100) / 100 : remaining
      })()
    : null

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

  const startRepaymentEdit = (item: RemboursementDette) => {
    setActionError(null)
    setEditRemb(item.id)
    setEditRembMontant(Number(item.montant))
    setEditRembDate(item.date)
    setEditRembImpacteBudget(Boolean(item.impacte_budget))
  }

  return (
    <Card className={'border-slate-800 bg-slate-900 ' + (dette.archived ? 'opacity-60' : '')}>
      <CardContent className="space-y-3 p-4">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-4 text-left"
          onClick={() => !dette.archived && setEditDette(true)}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-slate-100">{dette.titre}</p>
              {isCredit && <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-300">Crédit bancaire</span>}
            </div>
            <p className="mt-1 text-sm text-slate-400">{isCredit ? 'Organisme' : isDebt ? 'À' : 'De'} : <span className="text-slate-200">{dette.personne}</span></p>
            {dette.description && <p className="mt-1 truncate text-xs text-slate-600">{dette.description}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className={'text-lg font-bold ' + (remaining <= 0 ? 'text-emerald-400' : isCredit ? 'text-indigo-300' : 'text-rose-400')}>
              {remaining <= 0 ? 'Soldé' : formatEuro(remaining)}
            </p>
            <p className="text-[10px] text-slate-600">{isCredit ? 'capital restant dû' : 'restant'}</p>
          </div>
        </button>

        {isCredit ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Capital initial" value={formatEuro(Number(dette.montant))} />
            <Metric label="Mensualité" value={contractualMonthly ? formatEuro(contractualMonthly) : '—'} tone="text-indigo-300" />
            <Metric label="Taux nominal" value={dette.taux_annuel != null ? String(dette.taux_annuel).replace('.', ',') + ' %' : '—'} />
            <Metric label="Capital remboursé" value={formatEuro(capitalRepaid)} tone="text-emerald-300" />
          </div>
        ) : recommendedMonthly !== null && remaining > 0 ? (
          <div className="flex justify-between rounded-xl bg-slate-800/70 px-3 py-2 text-sm">
            <span className="text-slate-400">Mensualité recommandée</span>
            <span className="font-semibold text-violet-300">{formatEuro(recommendedMonthly)}/mois</span>
          </div>
        ) : null}

        {isCredit && (
          <div className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/25 p-3 sm:grid-cols-3">
            <SmallInfo icon={<CalendarClock className="h-3.5 w-3.5" />} label="Début" value={dette.date_debut ? formatDate(dette.date_debut) : '—'} />
            <SmallInfo icon={<CalendarClock className="h-3.5 w-3.5" />} label="Fin prévue" value={dette.date_echeance ? formatDate(dette.date_echeance) : '—'} />
            <SmallInfo icon={<Landmark className="h-3.5 w-3.5" />} label="Intérêts + assurance payés" value={formatEuro(interestAndInsurancePaid)} />
          </div>
        )}

        {actionError && <p className="rounded-lg bg-rose-500/10 p-2 text-xs text-rose-300">{actionError}</p>}

        <button type="button" onClick={() => setExpanded(value => !value)} className="text-xs font-medium text-indigo-300 hover:text-indigo-200">
          {expanded ? 'Masquer les remboursements' : 'Afficher les remboursements'}
        </button>

        {expanded && (
          <div className="space-y-3 border-t border-slate-800 pt-3">
            <div className="space-y-1.5">
              {rembList.length === 0 && <p className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-600">Aucun remboursement enregistré.</p>}
              {rembList.map(item => {
                const editPending = pendingAction === 'edit-' + item.id
                const removePending = pendingAction === 'remove-' + item.id
                const maxSimpleEdit = Number(item.montant) + remaining
                const editValid = editRembMontant > 0 && Boolean(editRembDate) && (isCredit || editRembMontant <= maxSimpleEdit + 0.005)

                if (editRemb === item.id) {
                  return (
                    <div key={item.id} className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.05] p-3">
                      <div className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
                        <Input type="number" min="0.01" step="0.01" value={editRembMontant} onChange={event => setEditRembMontant(parseFloat(event.target.value) || 0)} />
                        <Input type="date" value={editRembDate} onChange={event => setEditRembDate(event.target.value)} />
                        <div className="flex gap-1">
                          <Button size="sm" disabled={!editValid || editPending} onClick={async () => {
                            const ok = await runAction(
                              'edit-' + item.id,
                              () => onUpdateRemboursement({ id:item.id, montant:editRembMontant, date:editRembDate, impacte_budget:editRembImpacteBudget }),
                              'Impossible de modifier ce remboursement.',
                            )
                            if (ok) setEditRemb(null)
                          }}>Valider</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditRemb(null)}>Annuler</Button>
                        </div>
                      </div>
                      <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                        <input type="checkbox" className="checkbox checkbox-xs" checked={editRembImpacteBudget} onChange={event => setEditRembImpacteBudget(event.target.checked)} />
                        Ce paiement a réellement transité par le Budget
                      </label>
                    </div>
                  )
                }

                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => startRepaymentEdit(item)}
                    onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') startRepaymentEdit(item) }}
                    className="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-800/55 px-3 py-2 transition hover:bg-slate-800"
                  >
                    <span className="text-xs text-slate-500">{formatDate(item.date)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-emerald-300">{formatEuro(Number(item.montant))}</p>
                      {isCredit && <p className="text-[10px] text-slate-600">dont {formatEuro(Number(item.capital_rembourse || 0))} de capital</p>}
                    </div>
                    {item.impacte_budget && <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[9px] text-blue-300">Budget</span>}
                    <button
                      type="button"
                      aria-label="Supprimer le remboursement"
                      className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-900 hover:text-rose-400"
                      disabled={removePending}
                      onClick={event => {
                        event.stopPropagation()
                        void runAction('remove-' + item.id, () => onRemoveRemboursement(item.id), 'Impossible de supprimer ce remboursement.')
                      }}
                    >
                      {removePending ? <span className="text-xs">…</span> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                )
              })}
            </div>

            {!dette.archived && remaining > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/25 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-300">{isCredit ? 'Enregistrer une mensualité payée' : 'Ajouter un remboursement'}</p>
                <div className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
                  <Input
                    type="number"
                    min="0.01"
                    max={isCredit ? undefined : remaining}
                    step="0.01"
                    placeholder={isCredit && contractualMonthly ? String(contractualMonthly.toFixed(2)) : 'Montant'}
                    value={newMontant}
                    onChange={event => setNewMontant(event.target.value)}
                  />
                  <Input type="date" value={newDate} onChange={event => setNewDate(event.target.value)} />
                  <Button
                    size="sm"
                    disabled={!(Number(newMontant) > 0 && (isCredit || Number(newMontant) <= remaining + 0.005) && newDate) || pendingAction === 'add'}
                    onClick={async () => {
                      const amount = Number(newMontant)
                      if (!(amount > 0 && (isCredit || amount <= remaining + 0.005) && newDate)) return
                      const ok = await runAction(
                        'add',
                        () => onAddRemboursement({ dette_id:dette.id, montant:amount, date:newDate, impacte_budget:newImpacteBudget }),
                        'Impossible d’ajouter ce remboursement.',
                      )
                      if (ok) {
                        setNewMontant('')
                        setNewImpacteBudget(false)
                      }
                    }}
                  >
                    {pendingAction === 'add' ? '…' : 'Ajouter'}
                  </Button>
                </div>
                {isCredit && contractualMonthly ? <button type="button" className="mt-2 text-[11px] text-indigo-300" onClick={() => setNewMontant(String(contractualMonthly.toFixed(2)))}>Utiliser la mensualité contractuelle ({formatEuro(contractualMonthly)})</button> : <p className="mt-2 text-[11px] text-slate-600">Maximum : {formatEuro(remaining)}</p>}
                <label className="mt-2 flex items-start gap-2 text-xs text-slate-500">
                  <input type="checkbox" className="checkbox checkbox-xs mt-0.5" checked={newImpacteBudget} onChange={event => setNewImpacteBudget(event.target.checked)} />
                  <span>Ce paiement a réellement transité par ce Budget.</span>
                </label>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {dette.archived ? (
                <Button size="sm" variant="outline" disabled={pendingAction === 'unarchive'} onClick={() => runAction('unarchive', () => onUnarchive(dette.id), 'Impossible de désarchiver.')}>
                  Désarchiver
                </Button>
              ) : (
                <Button size="sm" variant="ghost" className="text-amber-400" disabled={pendingAction === 'archive'} onClick={async () => {
                  if (confirm('Archiver cette ' + entityLabel + ' ?')) await runAction('archive', () => onArchive(dette.id), 'Impossible d’archiver.')
                }}>
                  Archiver
                </Button>
              )}
            </div>
          </div>
        )}

        <DetteEditDialog
          open={editDette}
          onOpenChange={setEditDette}
          dette={dette}
          minimumMontant={capitalRepaid}
          onSave={onUpdate}
        />
      </CardContent>
    </Card>
  )
}

function Metric({ label, value, tone = 'text-slate-100' }: { label: string; value: string; tone?: string }) {
  return <div className="rounded-xl border border-slate-800/70 bg-slate-950/25 p-3"><p className="text-[10px] text-slate-600">{label}</p><p className={'mt-1 text-sm font-semibold ' + tone}>{value}</p></div>
}

function SmallInfo({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-center gap-2"><span className="text-slate-600">{icon}</span><div><p className="text-[9px] text-slate-600">{label}</p><p className="text-xs font-medium text-slate-300">{value}</p></div></div>
}
