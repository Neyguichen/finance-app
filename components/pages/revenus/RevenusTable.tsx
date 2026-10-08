'use client'

import { useState } from 'react'
import { CalendarDays, CheckCircle2, Plus, Repeat2, RotateCcw, Trash2, TrendingUp, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate, formatEuro } from '@/lib/utils'

type RevenuRow = {
  id: string
  nom: string
  montant: number
  montant_reel?: number | null
  type: 'actif' | 'passif'
  recu: boolean
  recurrent_id?: string | null
  date_prevue?: string | null
  date_reelle?: string | null
}

type RepriseRow = {
  id: string
  note?: string | null
  montant: number
  date?: string | null
  enveloppe_source_id?: string | null
}

type Recurrent = {
  id: string
  frequence_mois: number
}

type Props = {
  revenus: RevenuRow[]
  reprises: RepriseRow[]
  recurrents: Recurrent[]
  readOnly: boolean
  doubleDate?: boolean
  getEnvNom: (id: string | null | undefined) => string
  onAdd: () => void
  onManageRecurring: () => void
  onToggleRecu: (id: string, recu: boolean, dateReelle?: string | null) => void
  onEdit: (rev: { id: string; nom: string; montant: number; montantReel?: number | null; type: 'actif' | 'passif'; recurrentId?: string | null; datePrevue?: string | null; recu: boolean; dateReelle?: string | null }) => void
  onDelete: (target: { id: string; recurrentId: string | null; nom: string }) => void
}

type Filter = 'all' | 'actif' | 'passif' | 'reprise'

function recurrenceLabel(recurrentId: string | null | undefined, recurrents: Recurrent[]) {
  if (!recurrentId) return 'Juste cette fois'
  const rec = recurrents.find(item => item.id === recurrentId)
  const frequency = Number(rec?.frequence_mois || 1)
  return frequency === 1 ? 'Tous les mois' : `Tous les ${frequency} mois`
}

export default function RevenusTable({
  revenus,
  reprises,
  recurrents,
  readOnly,
  getEnvNom,
  onAdd,
  onManageRecurring,
  onEdit,
  onDelete,
}: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const validatedRevenus = revenus.filter(item => item.recu)

  const counts = {
    all: validatedRevenus.length + reprises.length,
    actif: validatedRevenus.filter(item => item.type === 'actif').length,
    passif: validatedRevenus.filter(item => item.type === 'passif').length,
    reprise: reprises.length,
  }

  const filteredRevenus = validatedRevenus.filter(item => filter === 'all' || filter === item.type)
  const filteredReprises = reprises.filter(() => filter === 'all' || filter === 'reprise')

  const filters: Array<[Filter,string]> = [['all','Tous'],['actif','Actifs'],['passif','Passifs'],['reprise','Reprises d’épargne']]

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex flex-wrap gap-2">
          {filters.map(([value,label]) => (
            <button key={value} type="button" onClick={() => setFilter(value)}
              className={'rounded-full border px-4 py-2 text-xs font-medium transition ' + (filter === value ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200')}>
              {label} <span className={filter === value ? 'text-white/75' : 'text-slate-600'}>({counts[value]})</span>
            </button>
          ))}
        </div>

        {!readOnly && (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button variant="outline" onClick={onManageRecurring} className="h-10 gap-2">
              <Repeat2 className="h-4 w-4" />Revenus récurrents
            </Button>
            <Button onClick={onAdd} className="hidden h-10 gap-2 md:inline-flex">
              <Plus className="h-4 w-4" />Ajouter un revenu
            </Button>
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900 md:block">
        <div className="divide-y divide-slate-800/70">
          {filteredRevenus.map(rev => {
            const receivedAmount = rev.recu ? Number(rev.montant_reel ?? rev.montant) : null
            return (
              <div key={rev.id} role="button" tabIndex={0}
                onClick={() => !readOnly && onEdit({ id:rev.id, nom:rev.nom, montant:Number(rev.montant), montantReel:rev.montant_reel == null ? null : Number(rev.montant_reel), type:rev.type, recurrentId:rev.recurrent_id, datePrevue:rev.date_prevue, recu:rev.recu, dateReelle:rev.date_reelle })}
                onKeyDown={event => { if (!readOnly && (event.key === 'Enter' || event.key === ' ')) onEdit({ id:rev.id, nom:rev.nom, montant:Number(rev.montant), montantReel:rev.montant_reel == null ? null : Number(rev.montant_reel), type:rev.type, recurrentId:rev.recurrent_id, datePrevue:rev.date_prevue, recu:rev.recu, dateReelle:rev.date_reelle }) }}
                className="grid cursor-pointer grid-cols-[minmax(0,1fr)_180px_220px_76px_36px] items-center gap-4 px-4 py-3 transition hover:bg-slate-800/30">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ' + (rev.type === 'actif' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-indigo-500/10 text-indigo-300')}>
                    {rev.type === 'actif' ? <TrendingUp className="h-4 w-4" /> : <WalletCards className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-200">{rev.nom}</p>
                      <span className={'shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium ' + (rev.type === 'actif' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-indigo-500/10 text-indigo-300')}>{rev.type === 'actif' ? 'Actif' : 'Passif'}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-500">{recurrenceLabel(rev.recurrent_id, recurrents)}</p>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500">
                  <p>Prévu : <span className="text-slate-300">{rev.date_prevue ? formatDate(rev.date_prevue) : '—'}</span></p>
                  <p className="mt-1">Réel : <span className="text-slate-300">{rev.date_reelle ? formatDate(rev.date_reelle) : '—'}</span></p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-right">
                  <div><p className="text-[9px] uppercase tracking-wide text-slate-600">Prévu</p><p className="text-sm font-semibold text-slate-200">{formatEuro(Number(rev.montant))}</p></div>
                  <div><p className="text-[9px] uppercase tracking-wide text-slate-600">Reçu</p><p className={'text-sm font-semibold '+(receivedAmount==null?'text-slate-600':'text-emerald-300')}>{receivedAmount == null ? '—' : formatEuro(receivedAmount)}</p></div>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-center text-[10px] font-semibold text-emerald-300">Validé</span>
                {!readOnly ? <button type="button" onClick={event => { event.stopPropagation(); onDelete({ id:rev.id, recurrentId:rev.recurrent_id || null, nom:rev.nom }) }} className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-800 hover:text-rose-400" aria-label="Supprimer"><Trash2 className="h-3.5 w-3.5" /></button> : <span />}
              </div>
            )
          })}

          {filteredReprises.map(rep => {
            const label = rep.note || getEnvNom(rep.enveloppe_source_id) || 'Reprise d’épargne'
            return (
              <div key={'rep-'+rep.id} className="grid grid-cols-[minmax(0,1fr)_180px_220px_44px_36px] items-center gap-4 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300"><RotateCcw className="h-4 w-4" /></span>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-200">{label}</p><p className="mt-0.5 text-[10px] text-cyan-300">Reprise d’épargne · ponctuelle</p></div>
                </div>
                <div className="text-[10px] text-slate-500"><p>Prévu : —</p><p className="mt-1">Réel : <span className="text-slate-300">{rep.date ? formatDate(rep.date) : '—'}</span></p></div>
                <div className="grid grid-cols-2 gap-3 text-right"><div><p className="text-[9px] uppercase tracking-wide text-slate-600">Prévu</p><p className="text-sm font-semibold text-slate-200">{formatEuro(Number(rep.montant))}</p></div><div><p className="text-[9px] uppercase tracking-wide text-slate-600">Reçu</p><p className="text-sm font-semibold text-cyan-300">{formatEuro(Number(rep.montant))}</p></div></div>
                <div className="flex justify-center"><CheckCircle2 className="h-4 w-4 text-cyan-300" /></div><span />
              </div>
            )
          })}

          {filteredRevenus.length === 0 && filteredReprises.length === 0 && <div className="px-4 py-10 text-center text-sm text-slate-600">Aucun revenu ne correspond à ces filtres.</div>}
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {[...filteredRevenus.map(rev => ({kind:'income' as const, rev})), ...filteredReprises.map(rep => ({kind:'reprise' as const, rep}))].map(item => {
          if (item.kind === 'reprise') {
            const rep = item.rep
            const label = rep.note || getEnvNom(rep.enveloppe_source_id) || 'Reprise d’épargne'
            return <div key={'mobile-rep-'+rep.id} className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
              <div className="flex items-center gap-3"><RotateCcw className="h-5 w-5 text-cyan-300" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{label}</p><p className="mt-1 text-[10px] text-cyan-300">Reprise · Juste cette fois</p></div><p className="text-sm font-semibold text-cyan-300">{formatEuro(Number(rep.montant))}</p></div>
            </div>
          }
          const rev = item.rev
          return <div key={'mobile-rev-'+rev.id} onClick={() => !readOnly && onEdit({ id:rev.id, nom:rev.nom, montant:Number(rev.montant), montantReel:rev.montant_reel == null ? null : Number(rev.montant_reel), type:rev.type, recurrentId:rev.recurrent_id, datePrevue:rev.date_prevue, recu:rev.recu, dateReelle:rev.date_reelle })} className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900/55 p-3 transition active:bg-slate-800/50">
            <div className="flex items-start gap-3">
              <span className={'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ' + (rev.type === 'actif' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-indigo-500/10 text-indigo-300')}>{rev.type === 'actif' ? <TrendingUp className="h-4 w-4" /> : <WalletCards className="h-4 w-4" />}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{rev.nom}</p><p className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-500"><span className={'rounded-full px-1.5 py-0.5 font-medium '+(rev.type === 'actif' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-indigo-500/10 text-indigo-300')}>{rev.type === 'actif' ? 'Actif' : 'Passif'}</span><span>{recurrenceLabel(rev.recurrent_id, recurrents)}</span></p>{rev.date_prevue && <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-600"><CalendarDays className="h-3 w-3" />Prévu : {formatDate(rev.date_prevue)}</p>}{rev.date_reelle && <p className="mt-0.5 text-[10px] text-slate-500">Reçu : {formatDate(rev.date_reelle)}</p>}</div>
              <div className="text-right"><p className="text-[9px] uppercase text-slate-500">{rev.recu ? 'Reçu' : 'Prévu'}</p><p className="text-sm font-semibold">{rev.recu ? formatEuro(Number(rev.montant_reel ?? rev.montant)) : formatEuro(Number(rev.montant))}</p><p className={'mt-1 text-[10px] ' + (rev.recu ? 'text-emerald-300' : 'text-amber-300')}>{rev.recu ? `Reçu · prévu ${formatEuro(Number(rev.montant))}` : 'En attente'}</p></div>
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">Validé</span>
            </div>
            {!readOnly && <div className="mt-2 flex justify-end border-t border-slate-800/70 pt-2"><button onClick={event => { event.stopPropagation(); onDelete({ id:rev.id, recurrentId:rev.recurrent_id || null, nom:rev.nom }) }} className="rounded-lg p-1.5 text-slate-600" aria-label="Supprimer"><Trash2 className="h-3.5 w-3.5" /></button></div>}
          </div>
        })}
      </div>
    </section>
  )
}
