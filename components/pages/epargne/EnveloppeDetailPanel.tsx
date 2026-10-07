'use client'

import { CalendarClock, ChevronDown, Pencil, PiggyBank, Repeat2, Trash2, TrendingUp, X } from 'lucide-react'
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
  recurringSavings?: any[]
  onUpdateRecurring?: (updates: any) => void
  onEditRecurring?: (recurring: any) => void
  onSave: () => void
  onWithdraw: () => void
  onTransfer: () => void
  onEdit?: () => void
  onEditMovement?: (movement: MouvementEpargne) => void
  onDeleteMovement?: (movement: MouvementEpargne) => void
  onClose?: () => void
}

export default function EnveloppeDetailPanel({
  env, movements, currentMonthMovements, currentMonth, plannedMonthly, recurringSavings = [], onUpdateRecurring, onEditRecurring, onSave, onWithdraw, onTransfer, onEdit, onEditMovement, onDeleteMovement, onClose,
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
        <div className="flex items-start gap-2">
          <button type="button" onClick={onEdit} className={"min-w-0 flex-1 text-left " + (onEdit ? "cursor-pointer" : "cursor-default")}>
            <CardTitle className="flex items-center gap-2 text-lg text-slate-100"><PiggyBank className="h-5 w-5 text-emerald-300" />{env.nom}</CardTitle>
            {onEdit && <p className="mt-1 text-[10px] text-slate-600">Cliquer pour modifier l’enveloppe</p>}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800/60 hover:text-slate-200"
              aria-label="Fermer le détail de l’enveloppe"
              title="Revenir aux mouvements du mois"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
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

        <div className="rounded-xl border border-slate-800/70 bg-slate-950/25">
          <div className="flex items-center gap-2 border-b border-slate-800/70 px-3 py-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-300"><Repeat2 className="h-3.5 w-3.5" /></span>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-300">Épargne récurrente</span>
              <p className="text-[10px] text-slate-600">Récurrences liées à cette enveloppe</p>
            </div>
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[9px] text-slate-500">{recurringSavings.length}</span>
          </div>
          {recurringSavings.length === 0 ? (
            <p className="p-3 text-xs text-slate-600">Aucune récurrence pour cette enveloppe. Utilisez « Épargner » et choisissez une fréquence pour en créer une.</p>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {recurringSavings.map((rec:any) => {
                const frequency = Number(rec.frequence_mois || 1)
                const frequencyLabel = frequency === 1 ? 'Tous les mois' : frequency === 12 ? 'Tous les ans' : 'Tous les ' + frequency + ' mois'
                return (
                  <div key={rec.id} className="flex flex-wrap items-center gap-3 p-3 transition hover:bg-slate-800/30">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300"><PiggyBank className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-200">{formatEuro(Number(rec.montant))}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">{frequencyLabel} · depuis {String(rec.mois_debut || rec.created_at || '').slice(0,7) || '—'}</p>
                      {rec.note && <p className="mt-1 truncate text-[10px] text-slate-600">{rec.note}</p>}
                    </div>
                    <span className={"rounded-full px-2 py-0.5 text-[9px] font-medium " + (rec.actif === false ? "bg-slate-800 text-slate-500" : "bg-emerald-500/10 text-emerald-300")}>{rec.actif === false ? 'Suspendue' : 'Active'}</span>
                    {onEditRecurring && (
                      <button
                        type="button"
                        onClick={() => onEditRecurring(rec)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-xs font-medium text-slate-300 transition hover:bg-slate-800/50"
                      >
                        <Pencil className="h-3.5 w-3.5" />Modifier
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!onUpdateRecurring}
                      onClick={() => onUpdateRecurring?.({ id:rec.id, actif:rec.actif === false })}
                      className={"h-8 rounded-lg px-3 text-xs font-medium transition disabled:opacity-60 " + (rec.actif === false ? "border border-slate-700 text-slate-300 hover:bg-slate-800/50" : "text-amber-300 hover:bg-amber-500/10")}
                    >
                      {rec.actif === false ? 'Réactiver' : 'Suspendre'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
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
                    title="Supprimer ce mouvement"
                    aria-label="Supprimer le mouvement"
                    className="mr-2 rounded-md p-2 text-slate-600 transition hover:bg-rose-500/10 hover:text-rose-400"
                    onClick={() => onDeleteMovement(movement)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
              <div key={movement.id} className="flex items-center border-b border-slate-800/50 last:border-0">
                <button
                  type="button"
                  disabled={!onEditMovement}
                  onClick={() => onEditMovement?.(movement)}
                  className={"grid min-w-0 flex-1 grid-cols-[78px_1fr_auto] items-center gap-2 px-3 py-2 text-left text-[11px] transition " + (onEditMovement ? "cursor-pointer hover:bg-slate-800/30" : "cursor-default")}
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
                {onDeleteMovement && (
                  <button
                    type="button"
                    title="Supprimer ce mouvement"
                    aria-label="Supprimer le mouvement"
                    className="mr-2 rounded-md p-2 text-slate-600 transition hover:bg-rose-500/10 hover:text-rose-400"
                    onClick={() => onDeleteMovement(movement)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
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
