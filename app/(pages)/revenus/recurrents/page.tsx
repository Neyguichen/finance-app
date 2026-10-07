'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArrowLeft, CalendarDays, Plus, RotateCcw, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { useApp } from '@/components/AppContext'
import { useRevenuOccurrences, useRevenus, useRevenusRecurrents } from '@/lib/hooks/useRevenus'
import RevenuForm from '@/components/pages/revenus/RevenuForm'
import RevenuEditDialog from '@/components/pages/revenus/RevenuEditDialog'
import { Button } from '@/components/ui/button'
import { formatDate, formatEuro, plannedDateForMonth } from '@/lib/utils'

export default function RevenusRecurrentsPage() {
  const router = useRouter()
  const { espace, moisId, month, isAdminViewing } = useApp()
  const { create, update, updateFromMonth } = useRevenus(moisId)
  const { data: recurrents = [], create: createRecurrent, update: updateRecurrent } = useRevenusRecurrents(espace?.id)

  const [showArchived, setShowArchived] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [occurrenceMonth, setOccurrenceMonth] = useState(month.slice(0, 7))
  const [formOpen, setFormOpen] = useState(false)
  const [editOccurrence, setEditOccurrence] = useState<any>(null)
  const [editOccurrenceMonth, setEditOccurrenceMonth] = useState<string | null>(null)

  const active = useMemo(() => recurrents.filter((item:any) => item.actif !== false), [recurrents])
  const archived = useMemo(() => recurrents.filter((item:any) => item.actif === false), [recurrents])
  const list = showArchived ? archived : active
  const selected = recurrents.find((item:any) => item.id === selectedId) || null
  const occurrences = useRevenuOccurrences(selectedId, espace?.id)

  useEffect(() => {
    if (selectedId && !recurrents.some((item:any) => item.id === selectedId)) setSelectedId(null)
  }, [recurrents, selectedId])

  useEffect(() => {
    if (!selectedId && list.length > 0) setSelectedId(list[0].id)
  }, [list, selectedId])

  const frequencyLabel = (value:number) => {
    if (value === 1) return 'Tous les mois'
    if (value === 12) return 'Tous les ans'
    return 'Tous les ' + value + ' mois'
  }

  const handleCreate = async (values: { nom: string; montant: number; montantReel: number | null; type: 'actif' | 'passif'; frequence: number; jourPrevu: number; datePrevue: string | null; recu: boolean; dateReelle: string | null }) => {
    if (isAdminViewing || !espace || !moisId || values.frequence === 0) return
    const recurrent = await createRecurrent.mutateAsync({
      espace_id: espace.id,
      type: values.type,
      nom: values.nom,
      montant: values.montant,
      actif: true,
      frequence_mois: values.frequence,
      jour_prevu: values.jourPrevu || 1,
      ordre: recurrents.length,
      mois_debut: month,
    })
    await create.mutateAsync({
      mois_id: moisId,
      recurrent_id: recurrent.id,
      type: values.type,
      nom: values.nom,
      montant: values.montant,
      montant_reel: values.recu ? values.montantReel : null,
      recu: values.recu,
      date_prevue: plannedDateForMonth(month, values.jourPrevu),
      date_reelle: values.recu ? values.dateReelle : null,
      ordre: recurrents.length,
    })
    setSelectedId(recurrent.id)
    setShowArchived(false)
    setFormOpen(false)
  }

  const addOccurrence = async () => {
    if (!selected || selected.actif === false) return
    await occurrences.add.mutateAsync({ targetMonth: occurrenceMonth, recurring: selected })
  }

  const openOccurrence = (item:any) => {
    setEditOccurrenceMonth(String(item.mois?.mois || '').slice(0, 10))
    setEditOccurrence({
      id: item.id,
      nom: item.nom,
      montant: Number(item.montant),
      montantReel: item.montant_reel == null ? null : Number(item.montant_reel),
      type: item.type,
      recurrentId: item.recurrent_id,
      datePrevue: item.date_prevue,
      recu: item.recu,
      dateReelle: item.date_reelle,
    })
  }

  const saveOccurrence = async (data:any, scope:'mois'|'future') => {
    await update.mutateAsync({
      id: data.id,
      nom: data.nom,
      montant: data.montant,
      montant_reel: data.recu ? data.montantReel : null,
      type: data.type,
      date_prevue: data.datePrevue ?? null,
      recu: !!data.recu,
      date_reelle: data.dateReelle ?? null,
    })
    if (scope === 'future' && data.recurrentId) {
      await updateFromMonth.mutateAsync({
        recurrentId: data.recurrentId,
        month: editOccurrenceMonth || month,
        updates: { nom:data.nom, montant:data.montant, type:data.type },
      })
    }
  }

  const updateTemplate = (updates:any) => {
    if (!selected || isAdminViewing) return
    updateRecurrent.mutate({ id:selected.id, ...updates })
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 p-3 pb-24 sm:p-4">
      <div className="space-y-3">
        <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/revenus')} className="shrink-0 px-2 sm:px-3">
            <ArrowLeft className="mr-1.5 h-4 w-4" />Revenus
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight text-slate-100 sm:text-xl">Revenus récurrents</h1>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Gère les modèles récurrents et leurs occurrences sans alourdir la vue mensuelle.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:flex-wrap">
          {!isAdminViewing && !showArchived && (
            <Button size="sm" onClick={() => setFormOpen(true)} className="w-full min-[420px]:w-auto">
              <Plus className="mr-1.5 h-4 w-4" />Ajouter une récurrence
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => { setShowArchived(v => !v); setSelectedId(null) }} className="w-full min-[420px]:w-auto">
            {showArchived ? <RotateCcw className="mr-1.5 h-4 w-4" /> : <Archive className="mr-1.5 h-4 w-4" />}
            {showArchived ? 'Voir les actives' : 'Voir les archivées'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,.8fr)_minmax(0,1.4fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/25">
          <div className="border-b border-slate-800/70 px-3 py-2.5">
            <p className="text-sm font-semibold text-slate-200">{showArchived ? 'Revenus archivés' : 'Revenus actifs'}</p>
            <p className="text-[11px] text-slate-500">{list.length} récurrence(s)</p>
          </div>
          {list.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">Aucun revenu dans cette liste.</p>
          ) : list.map((item:any) => {
            const Icon = item.type === 'actif' ? TrendingUp : TrendingDown
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={'flex w-full items-center gap-3 border-b border-slate-800/60 px-3 py-3 text-left last:border-0 transition hover:bg-slate-800/40 ' + (selectedId === item.id ? 'bg-slate-800/50' : '')}
              >
                <span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ' + (item.type === 'actif' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-indigo-500/10 text-indigo-300')}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-200">{item.nom}</p>
                  <p className="text-[10px] text-slate-500">{frequencyLabel(Number(item.frequence_mois || 1))}</p>
                </div>
                <strong className="text-sm text-emerald-300">{formatEuro(Number(item.montant))}</strong>
              </button>
            )
          })}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-950/25 p-4">
          {!selected ? (
            <div className="flex min-h-64 items-center justify-center text-center text-sm text-slate-500">Sélectionne un revenu récurrent pour afficher son détail.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">{selected.nom}</h2>
                  <p className="mt-1 text-xs text-slate-500">{frequencyLabel(Number(selected.frequence_mois || 1))} · depuis {selected.mois_debut ? formatDate(selected.mois_debut) : 'date non renseignée'}</p>
                </div>
                <span className={'rounded-full px-2.5 py-1 text-[10px] font-medium ' + (selected.actif === false ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/10 text-emerald-300')}>
                  {selected.actif === false ? 'Archivé' : 'Actif'}
                </span>
              </div>

              <div key={selected.id} className="grid gap-3 rounded-xl border border-slate-800 p-3 sm:grid-cols-2">
                <label className="text-[10px] text-slate-500">Nom
                  <input
                    defaultValue={selected.nom}
                    disabled={isAdminViewing}
                    onBlur={e => { const value=e.target.value.trim(); if(value && value !== selected.nom) updateTemplate({nom:value}) }}
                    className="input input-bordered input-sm mt-1 w-full"
                  />
                </label>
                <label className="text-[10px] text-slate-500">Montant
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={Number(selected.montant)}
                    disabled={isAdminViewing}
                    onBlur={e => { const value=Number(e.target.value); if(Number.isFinite(value) && value>0 && value !== Number(selected.montant)) updateTemplate({montant:value}) }}
                    className="input input-bordered input-sm mt-1 w-full"
                  />
                </label>
                <label className="text-[10px] text-slate-500">Type
                  <select value={selected.type} disabled={isAdminViewing} onChange={e => updateTemplate({type:e.target.value})} className="select select-bordered select-sm mt-1 w-full">
                    <option value="actif">Actif</option>
                    <option value="passif">Passif</option>
                  </select>
                </label>
                <label className="text-[10px] text-slate-500">Fréquence
                  <select value={Number(selected.frequence_mois || 1)} disabled={isAdminViewing} onChange={e => updateTemplate({frequence_mois:Number(e.target.value)})} className="select select-bordered select-sm mt-1 w-full">
                    <option value={1}>Tous les mois</option>
                    <option value={2}>Tous les 2 mois</option>
                    <option value={3}>Tous les 3 mois</option>
                    <option value={6}>Tous les 6 mois</option>
                    <option value={12}>Tous les ans</option>
                  </select>
                </label>
                <label className="text-[10px] text-slate-500">Jour prévu
                  <input type="number" min={1} max={31} value={Number(selected.jour_prevu || 1)} disabled={isAdminViewing} onChange={e => updateTemplate({jour_prevu:Math.min(31,Math.max(1,Number(e.target.value)||1))})} className="input input-bordered input-sm mt-1 w-full" />
                </label>
                <label className="text-[10px] text-slate-500">Mois de début
                  <input type="month" value={String(selected.mois_debut || '').slice(0,7)} disabled={isAdminViewing} onChange={e => updateTemplate({mois_debut:e.target.value + '-01'})} className="input input-bordered input-sm mt-1 w-full" />
                </label>
              </div>

              <div className="rounded-xl border border-slate-800 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Ajouter une occurrence</p>
                    <p className="text-[10px] text-slate-600">Crée manuellement une occurrence manquante pour un mois donné.</p>
                  </div>
                  <CalendarDays className="h-4 w-4 text-slate-600" />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input type="month" value={occurrenceMonth} onChange={e => setOccurrenceMonth(e.target.value)} className="input input-bordered input-sm flex-1" />
                  {!isAdminViewing && selected.actif !== false && (
                    <Button size="sm" onClick={addOccurrence} disabled={occurrences.add.isPending || (occurrences.data || []).some((item:any) => String(item.mois?.mois || '').slice(0,7) === occurrenceMonth)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />Ajouter
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Historique des occurrences</p>
                  <span className="text-[10px] text-slate-600">{occurrences.data?.length || 0}</span>
                </div>
                {occurrences.isLoading ? (
                  <p className="py-4 text-center text-xs text-slate-500">Chargement…</p>
                ) : !occurrences.data?.length ? (
                  <p className="text-xs text-slate-500">Aucune occurrence enregistrée.</p>
                ) : (
                  <div className="max-h-80 divide-y divide-slate-800/70 overflow-y-auto">
                    {occurrences.data.map((item:any) => (
                      <div key={item.id} className="flex items-center gap-2 py-2">
                        <button type="button" onClick={() => openOccurrence(item)} className="min-w-0 flex-1 text-left">
                          <p className="text-xs font-medium text-slate-200">{formatDate(item.mois?.mois || item.date_prevue || month)}</p>
                          <p className="text-[10px] text-slate-500">{item.recu ? 'Reçu' : 'Prévu'} · {formatEuro(Number(item.montant))}</p>
                        </button>
                        {!isAdminViewing && (
                          <Button size="sm" variant="ghost" aria-label="Retirer cette occurrence" onClick={() => occurrences.remove.mutate(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!isAdminViewing && (
                selected.actif === false
                  ? <Button className="w-full" onClick={() => updateTemplate({actif:true})}><RotateCcw className="mr-1.5 h-4 w-4" />Désarchiver le revenu</Button>
                  : <Button className="w-full" variant="outline" onClick={() => updateTemplate({actif:false})}><Archive className="mr-1.5 h-4 w-4" />Archiver le revenu</Button>
              )}
              <p className="text-[10px] leading-4 text-slate-600">Archiver arrête la génération des prochaines occurrences sans supprimer l’historique. Une occurrence peut être ouverte pour être modifiée seule ou à partir de ce mois.</p>
            </div>
          )}
        </section>
      </div>

      <RevenuForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        doubleDate={espace?.double_date ?? false}
        recurringOnly
      />
      <RevenuEditDialog
        editTarget={editOccurrence}
        onClose={() => { setEditOccurrence(null); setEditOccurrenceMonth(null) }}
        onSave={saveOccurrence}
        doubleDate={espace?.double_date ?? false}
      />
    </div>
  )
}
