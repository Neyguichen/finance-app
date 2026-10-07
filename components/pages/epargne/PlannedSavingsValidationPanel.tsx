'use client'

import { CheckCircle2, EyeOff, PiggyBank, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro, localDateISO } from '@/lib/utils'
import type { PlannedSavingsOccurrence } from '@/lib/hooks/usePlannedSavings'

type Props = {
  occurrences: PlannedSavingsOccurrence[]
  envelopes: Array<{ id: string; nom: string }>
  month: string
  readOnly?: boolean
  busy?: boolean
  onValidate: (id: string, date: string, amount: number) => Promise<void>
  onIgnore: (id: string) => Promise<void>
  onRestore: (id: string) => Promise<void>
}

type Draft = { amount: string; date: string }

function defaultDate(month: string, plannedDate?: string | null) {
  if (plannedDate) return String(plannedDate).slice(0, 10)
  const today = localDateISO()
  return today.slice(0, 7) === month.slice(0, 7) ? today : month.slice(0, 7) + '-01'
}

export default function PlannedSavingsValidationPanel({
  occurrences,
  envelopes,
  month,
  readOnly = false,
  busy = false,
  onValidate,
  onIgnore,
  onRestore,
}: Props) {
  const pending = occurrences.filter(item => item.statut === 'pending')
  const ignored = occurrences.filter(item => item.statut === 'ignored')
  const pendingTotal = pending.reduce((sum, item) => sum + Number(item.montant), 0)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})

  useEffect(() => {
    setDrafts(current => {
      const next = { ...current }
      for (const item of pending) {
        if (!next[item.id]) {
          next[item.id] = {
            amount: String(Number(item.montant)),
            date: defaultDate(month, item.date_prevue),
          }
        }
      }
      return next
    })
  }, [month, occurrences])

  const envelopeNames = useMemo(
    () => new Map(envelopes.map(item => [item.id, item.nom])),
    [envelopes],
  )

  if (pending.length === 0 && ignored.length === 0) return null

  const setDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts(current => ({
      ...current,
      [id]: { ...(current[id] || { amount: '', date: defaultDate(month, occurrences.find(item => item.id === id)?.date_prevue) }), ...patch },
    }))
  }

  return (
    <Card className="nf-card-hover border-amber-400/15 bg-amber-500/[0.025]">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base text-slate-100">
          <PiggyBank className="h-4 w-4 text-amber-300" />
          Versements prévus à valider
          {pending.length > 0 && (
            <span className="ml-auto rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
              {formatEuro(pendingTotal)} en attente
            </span>
          )}
        </CardTitle>
        <p className="text-[11px] leading-4 text-slate-500">
          Ces montants sont déjà déduits de la projection du compte, mais ils n’augmentent pas l’épargne réelle tant qu’ils ne sont pas validés.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-1">
        {pending.map(item => {
          const draft = drafts[item.id] || { amount: String(Number(item.montant)), date: defaultDate(month, item.date_prevue) }
          const amount = Number(draft.amount)
          const validAmount = Number.isFinite(amount) && amount > 0
          return (
            <div key={item.id} className="grid gap-2 rounded-xl border border-slate-800/70 bg-slate-950/35 p-3 lg:grid-cols-[minmax(0,1fr)_120px_145px_auto] lg:items-end">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-200">
                  {item.enveloppe_dest_id ? envelopeNames.get(item.enveloppe_dest_id) || 'Enveloppe' : 'Enveloppe indisponible'}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {item.recurrent_id ? 'Versement récurrent' : 'Versement prévu'}
                  {item.note ? ' · ' + item.note : ''}
                </p>
              </div>

              <label className="text-[10px] text-slate-500">
                Montant
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={draft.amount}
                    disabled={readOnly || busy}
                    onChange={event => setDraft(item.id, { amount: event.target.value })}
                    className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 pr-6 text-xs text-slate-200 outline-none focus:border-indigo-500 disabled:opacity-60"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-600">€</span>
                </div>
              </label>

              <label className="text-[10px] text-slate-500">
                Date réelle
                <input
                  type="date"
                  value={draft.date}
                  disabled={readOnly || busy}
                  onChange={event => setDraft(item.id, { date: event.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200 outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </label>

              {!readOnly && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || !validAmount || !draft.date}
                    onClick={() => onValidate(item.id, draft.date, amount)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />Valider
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onIgnore(item.id)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-xs font-medium text-slate-400 transition hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-50"
                  >
                    <EyeOff className="h-3.5 w-3.5" />Ignorer ce mois
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {ignored.length > 0 && (
          <div className="rounded-xl border border-slate-800/60 bg-slate-950/20">
            <div className="border-b border-slate-800/60 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-slate-600">
              Ignorés ce mois
            </div>
            {ignored.map(item => (
              <div key={item.id} className="flex flex-wrap items-center gap-2 border-b border-slate-800/50 px-3 py-2 last:border-0">
                <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
                  {item.enveloppe_dest_id ? envelopeNames.get(item.enveloppe_dest_id) || 'Enveloppe' : 'Enveloppe indisponible'}
                </span>
                <span className="text-xs font-semibold text-slate-500">{formatEuro(Number(item.montant))}</span>
                {!readOnly && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRestore(item.id)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-slate-500 transition hover:bg-slate-800/50 hover:text-slate-300 disabled:opacity-50"
                  >
                    <RotateCcw className="h-3 w-3" />Réactiver
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
