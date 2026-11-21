'use client'

import { ArrowLeftRight, PiggyBank, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatEuro } from '@/lib/utils'
import type { MouvementEpargne } from '@/lib/types'

type Props = {
  movements: MouvementEpargne[]
  envelopes: any[]
  readOnly?: boolean
  onEditMovement?: (movement: MouvementEpargne) => void
  onDeleteMovement?: (movement: MouvementEpargne) => void
}

export default function SavingsMonthMovementsPanel({
  movements,
  envelopes,
  readOnly = false,
  onEditMovement,
  onDeleteMovement,
}: Props) {
  const envelopeName = (id: string | null) => envelopes.find((env: any) => env.id === id)?.nom || '—'
  const sorted = [...movements].sort((a, b) => String(b.date).localeCompare(String(a.date)))

  const destinationLabel = (movement: MouvementEpargne) => {
    if (movement.type === 'epargne') return envelopeName(movement.enveloppe_dest_id)
    if (movement.type === 'reprise') return envelopeName(movement.enveloppe_source_id)
    return envelopeName(movement.enveloppe_source_id) + ' → ' + envelopeName(movement.enveloppe_dest_id)
  }

  const typeLabel = (movement: MouvementEpargne) => {
    if (movement.type === 'epargne') return 'Épargne'
    if (movement.type === 'reprise') return 'Reprise'
    return 'Transfert'
  }

  return (
    <Card className="nf-card-hover nf-mobile-section h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-100">
          <ArrowLeftRight className="h-4 w-4 text-cyan-300" />
          Mouvements du mois
          <span className="ml-auto rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-500">
            {sorted.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sorted.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center px-5 py-8 text-center">
            <PiggyBank className="h-7 w-7 text-slate-700" />
            <p className="mt-2 text-xs text-slate-600">Aucun mouvement d’épargne ce mois.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 max-md:divide-y-0 max-md:space-y-3 max-md:p-3">
            {sorted.map(movement => {
              const recurrent = !!movement.recurrent_id
              const isDeposit = movement.type === 'epargne'
              const isWithdrawal = movement.type === 'reprise'
              return (
                <div key={movement.id} className="flex min-w-0 items-center max-md:rounded-xl max-md:border max-md:border-slate-600/40 max-md:bg-slate-800/60">
                  <button
                    type="button"
                    disabled={readOnly || !onEditMovement}
                    onClick={() => onEditMovement?.(movement)}
                    className={"grid min-w-0 flex-1 grid-cols-[78px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-3 text-left text-[11px] max-md:grid-cols-[minmax(0,1fr)_auto] max-md:text-xs transition " + (!readOnly && onEditMovement ? "cursor-pointer hover:bg-slate-800/30" : "cursor-default")}
                  >
                    <span className="text-slate-500 max-md:col-span-2 max-md:text-xs max-md:text-slate-300">{formatDate(movement.date)}</span>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate font-medium text-slate-300">{destinationLabel(movement)}</p>
                        <span className={recurrent
                          ? "shrink-0 rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[8px] max-md:text-[11px] font-medium text-indigo-300"
                          : "shrink-0 rounded-full bg-slate-800 px-1.5 py-0.5 text-[8px] font-medium text-slate-500"}>
                          {recurrent ? 'Récurrent' : 'Ponctuel'}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-slate-600 max-md:text-xs max-md:text-slate-400">
                        {typeLabel(movement)}{movement.note ? ' · ' + movement.note : ''}
                      </p>
                    </div>
                    <span className="flex flex-col items-end gap-1"><span className={"font-semibold max-md:text-base " + (isDeposit ? "text-emerald-300" : isWithdrawal ? "text-rose-300" : "text-cyan-300")}>
                      {isDeposit ? '+' : isWithdrawal ? '−' : ''}{formatEuro(Number(movement.montant))}
                    </span><span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] max-md:text-[11px] font-semibold text-emerald-300">Validé</span></span>
                  </button>
                  {!readOnly && onDeleteMovement && (
                    <button
                      type="button"
                      title="Supprimer ce mouvement"
                      aria-label="Supprimer le mouvement"
                      className="mr-1 rounded-md p-2 text-slate-400 nf-mobile-action transition hover:bg-rose-500/10 hover:text-rose-400"
                      onClick={() => onDeleteMovement(movement)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
