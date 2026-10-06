'use client'

import { CalendarClock, ChevronDown, PiggyBank, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEuro, formatDate } from '@/lib/utils'
import type { MouvementEpargne } from '@/lib/types'

type HistoryMovement = MouvementEpargne & { month: string }

type Props = {
  env: any
  movements: HistoryMovement[]
  currentMonthMovements: MouvementEpargne[]
  currentMonth: string
  plannedMonthly: number
  onSave: () => void
  onWithdraw: () => void
  onTransfer: () => void
  onEdit?: () => void
  onEditMovement?: (movement: MouvementEpargne) => void
  onDeleteMovement?: (movement: MouvementEpargne) => void
}

export default function EnveloppeDetailPanel({
  env, movements, currentMonthMovements, currentMonth, plannedMonthly, onSave, onWithdraw, onTransfer, onEdit, onEditMovement, onDeleteMovement,
}: Props) {
  const [historyFilter, setHistoryFilter] = useState<'all' | 'in' | 'out'>('all')
  const balance = Number(env.solde || 0)
  const objective = Number(env.objectif || 0)
  const remaining = objective > 0 ? Math.max(0, objective - balance) : null
  const progress = objective > 0 ? Math.max(0, Math.min(100, Math.round(balance / objective * 100))) : null

  const relevant = movements.filter(movement =>
    movement.enveloppe_dest_id === env.id || movement.enveloppe_source_id === env.id
  )

  const monthlyNet = new Map<string, number>()
  for (const movement of relevant) {
    let value = 0
    if (movement.type === 'epargne' && movement.enveloppe_dest_id === env.id) value += Number(movement.montant)
    if (movement.type === 'reprise' && movement.enveloppe_source_id === env.id) value -= Number(movement.montant)
    if (movement.type === 'transfert') {
      if (movement.enveloppe_dest_id === env.id) value += Number(movement.montant)
      if (movement.enveloppe_source_id === env.id) value -= Number(movement.montant)
    }
    monthlyNet.set(movement.month, (monthlyNet.get(movement.month) || 0) + value)
  }

  const months = Array.from(monthlyNet.keys()).filter(month => month <= currentMonth).sort()
  const referenceMonth = env.date_solde_reference ? String(env.date_solde_reference).slice(0, 7) : null
  const graphMonths = (referenceMonth ? months.filter(month => month >= referenceMonth) : months).slice(-6)
  let running = balance
  const reversed: Array<{ month: string; balance: number; label: string }> = []
  for (let index = graphMonths.length - 1; index >= 0; index--) {
    const month = graphMonths[index]
    reversed.push({
      month,
      balance: running,
      label: new Date(month + '-01T12:00:00').toLocaleDateString('fr-FR', { month: 'short' }),
    })
    running -= monthlyNet.get(month) || 0
  }
  const chartData = reversed.reverse()

  const estimatedDate = remaining != null && remaining > 0 && plannedMonthly > 0
    ? (() => {
        const monthsNeeded = Math.ceil(remaining / plannedMonthly)
        const base = new Date(currentMonth + '-01T12:00:00')
        base.setMonth(base.getMonth() + monthsNeeded)
        return base.toLocaleDateString('fr-FR', { month:'long', year:'numeric' })
      })()
    : null

  const movementLabel = (movement: HistoryMovement) => {
    if (movement.type === 'epargne') return 'Épargne'
    if (movement.type === 'reprise') return 'Reprise'
    return movement.enveloppe_dest_id === env.id ? 'Transfert reçu' : 'Transfert envoyé'
  }

  const signedAmount = (movement: HistoryMovement) => {
    if (movement.type === 'epargne') return Number(movement.montant)
    if (movement.type === 'reprise') return -Number(movement.montant)
    return movement.enveloppe_dest_id === env.id ? Number(movement.montant) : -Number(movement.montant)
  }

  const currentRelevant = currentMonthMovements
    .filter(movement => movement.enveloppe_dest_id === env.id || movement.enveloppe_source_id === env.id)
    .sort((a,b) => String(b.date).localeCompare(String(a.date)))

  const latest = [...relevant]
    .sort((a,b) => String(b.date).localeCompare(String(a.date)))
    .filter(movement => {
      const amount = signedAmount(movement)
      if (historyFilter === 'in') return amount > 0
      if (historyFilter === 'out') return amount < 0
      return true
    })
    .slice(0, 6)

  return (
    <Card className="nf-card-hover h-full">
      <CardHeader className="pb-2">
        <button type="button" onClick={onEdit} className={"w-full text-left " + (onEdit ? "cursor-pointer" : "cursor-default")}>
          <CardTitle className="flex items-center gap-2 text-lg text-slate-100"><PiggyBank className="h-5 w-5 text-emerald-300" />{env.nom}</CardTitle>
          {onEdit && <p className="mt-1 text-[10px] text-slate-600">Cliquer pour modifier l’enveloppe</p>}
        </button>
      </CardHeader>
      <CardContent className="space-y-3 p-3 pt-1">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Solde actuel" value={formatEuro(balance)} tone="text-emerald-300" />
          <Stat label="Objectif" value={objective > 0 ? formatEuro(objective) : 'Non défini'} />
          <Stat label="Reste à atteindre" value={remaining == null ? '—' : formatEuro(remaining)} />
          <Stat label="Progression" value={progress == null ? '—' : String(progress) + '%'} tone="text-emerald-300" />
        </div>

        {progress != null && <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400" style={{width:String(progress)+'%'}} /></div>}

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/25 p-3">
            <div className="flex items-center gap-2 text-[10px] text-slate-500"><TrendingUp className="h-3.5 w-3.5 text-cyan-300" />Versement prévu</div>
            <p className="mt-1 text-sm font-semibold text-cyan-300">{plannedMonthly > 0 ? formatEuro(plannedMonthly) + ' / mois' : 'Aucun'}</p>
          </div>
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/25 p-3">
            <div className="flex items-center gap-2 text-[10px] text-slate-500"><CalendarClock className="h-3.5 w-3.5 text-indigo-300" />Date estimée d’atteinte</div>
            <p className="mt-1 text-sm font-semibold text-indigo-300">{estimatedDate || '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={onSave} className="btn btn-primary btn-sm">Épargner</button>
          <button onClick={onWithdraw} className="btn btn-primary btn-sm">Reprendre</button>
          <button onClick={onTransfer} className="btn btn-primary btn-sm">Transférer</button>
        </div>

        <div className="rounded-xl border border-slate-800/70 bg-slate-950/25 p-3">
          <p className="mb-2 text-xs font-semibold text-slate-300">Évolution du solde</p>
          {chartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{fontSize:10,fill:'#64748b'}} />
                <YAxis width={50} tick={{fontSize:10,fill:'#64748b'}} />
                <Tooltip contentStyle={{backgroundColor:'#020617',border:'1px solid #475569',borderRadius:'10px'}} formatter={(value:number) => formatEuro(value)} />
                <Line type="monotone" dataKey="balance" stroke="#34d399" strokeWidth={2.5} dot={{r:3}} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="flex h-32 items-center justify-center text-xs text-slate-600">Pas encore assez d’historique.</div>}
        </div>

        <div className="rounded-xl border border-slate-800/70 bg-slate-950/25">
          <div className="border-b border-slate-800/70 px-3 py-2">
            <span className="text-xs font-semibold text-slate-300">Mouvements du mois</span>
          </div>
          {currentRelevant.length === 0 ? (
            <p className="p-3 text-xs text-slate-600">Aucun mouvement pour cette enveloppe ce mois.</p>
          ) : currentRelevant.map(movement => {
            const signed = signedAmount(movement as HistoryMovement)
            const recurrent = !!movement.recurrent_id
            return (
              <div key={movement.id} className="flex items-center border-b border-slate-800/50 last:border-0">
                <button
                  type="button"
                  disabled={!onEditMovement}
                  onClick={() => onEditMovement?.(movement)}
                  className={"grid min-w-0 flex-1 grid-cols-[78px_1fr_auto] items-center gap-2 px-3 py-2 text-left text-[11px] transition " + (onEditMovement ? "cursor-pointer hover:bg-slate-800/30" : "cursor-default")}
                  aria-label={"Modifier le mouvement " + movementLabel(movement as HistoryMovement)}
                >
                  <span className="text-slate-600">{formatDate(movement.date)}</span>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="truncate text-slate-300">{movementLabel(movement as HistoryMovement)}</p>
                      <span className={recurrent
                        ? "shrink-0 rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[8px] font-medium text-indigo-300"
                        : "shrink-0 rounded-full bg-slate-800 px-1.5 py-0.5 text-[8px] font-medium text-slate-500"}>
                        {recurrent ? 'Récurrent' : 'Ponctuel'}
                      </span>
                    </div>
                    {movement.note && <p className="truncate text-slate-600">{movement.note}</p>}
                  </div>
                  <span className={signed >= 0 ? 'font-semibold text-emerald-300' : 'font-semibold text-rose-300'}>
                    {signed >= 0 ? '+' : '−'}{formatEuro(Math.abs(signed))}
                  </span>
                </button>
                {onDeleteMovement && (
                  <button
                    type="button"
                    aria-label="Supprimer le mouvement"
                    className="mr-2 rounded-md px-1.5 py-1 text-slate-700 transition hover:bg-slate-800/40 hover:text-rose-400"
                    onClick={() => onDeleteMovement(movement)}
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="rounded-xl border border-slate-800/70 bg-slate-950/25">
          <div className="flex items-center gap-2 border-b border-slate-800/70 px-3 py-2">
            <span className="mr-auto text-xs font-semibold text-slate-300">Historique récent</span>
            <label className="relative">
              <select
                value={historyFilter}
                onChange={event => setHistoryFilter(event.target.value as 'all' | 'in' | 'out')}
                className="h-7 appearance-none rounded-lg border border-slate-700 bg-slate-950 pl-2.5 pr-7 text-[10px] font-medium text-slate-300 outline-none hover:border-slate-600"
                aria-label="Filtrer l'historique"
              >
                <option value="all">Tous</option>
                <option value="in">Entrées</option>
                <option value="out">Sorties</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
            </label>
          </div>
          {latest.length === 0 ? <p className="p-3 text-xs text-slate-600">Aucun mouvement.</p> : latest.map(movement => {
            const signed = signedAmount(movement)
            const recurrent = !!movement.recurrent_id
            return (
              <button
                key={movement.id}
                type="button"
                disabled={!onEditMovement}
                onClick={() => onEditMovement?.(movement)}
                className={"grid w-full grid-cols-[78px_1fr_auto] items-center gap-2 border-b border-slate-800/50 px-3 py-2 text-left text-[11px] transition last:border-0 " + (onEditMovement ? "cursor-pointer hover:bg-slate-800/30" : "cursor-default")}
                aria-label={"Modifier le mouvement " + movementLabel(movement)}
              >
                <span className="text-slate-600">{formatDate(movement.date)}</span>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-slate-300">{movementLabel(movement)}</p>
                    <span className={recurrent
                      ? "shrink-0 rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[8px] font-medium text-indigo-300"
                      : "shrink-0 rounded-full bg-slate-800 px-1.5 py-0.5 text-[8px] font-medium text-slate-500"}>
                      {recurrent ? 'Récurrent' : 'Ponctuel'}
                    </span>
                  </div>
                  {movement.note && <p className="truncate text-slate-600">{movement.note}</p>}
                </div>
                <span className={signed >= 0 ? 'font-semibold text-emerald-300' : 'font-semibold text-rose-300'}>{signed >= 0 ? '+' : '−'}{formatEuro(Math.abs(signed))}</span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({label,value,tone='text-slate-100'}:{label:string;value:string;tone?:string}) {
  return <div className="rounded-xl border border-slate-800/70 bg-slate-950/25 p-3"><p className="text-[10px] text-slate-600">{label}</p><p className={'mt-1 text-sm font-semibold '+tone}>{value}</p></div>
}
