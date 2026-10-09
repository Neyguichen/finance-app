'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronRight, Lightbulb, Scale } from 'lucide-react'
import { useApp } from '@/components/AppContext'
import { useBalanceAtDate } from '@/lib/hooks/useBalanceAtDate'
import { useBalanceReconciliationSuggestions, type ReconciliationSuggestion } from '@/lib/hooks/useBalanceReconciliationSuggestions'
import { useApplyReconciliationCorrection } from '@/lib/hooks/useApplyReconciliationCorrection'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { formatDate, formatEuro, localDateISO } from '@/lib/utils'
import PageHeader from '@/components/layout/PageHeader'

export default function VerificationSoldePage() {
  const { espace } = useApp()
  const [realBalanceInput, setRealBalanceInput] = useState('')
  const [targetDate, setTargetDate] = useState(localDateISO())
  const [selectedSuggestion, setSelectedSuggestion] = useState<ReconciliationSuggestion | null>(null)
  const applyCorrection = useApplyReconciliationCorrection()
  const notifications = useNotifications(espace?.id)

  const calculated = useBalanceAtDate(
    espace?.id,
    espace?.solde_reference ?? null,
    espace?.date_solde_reference ?? null,
    targetDate,
    espace?.double_date ?? false
  )

  const realBalance = useMemo(() => {
    if (!realBalanceInput.trim()) return null
    const value = Number(realBalanceInput.replace(',', '.'))
    return Number.isFinite(value) ? value : null
  }, [realBalanceInput])

  const delta = realBalance != null && calculated.data != null
    ? Math.round((realBalance - calculated.data) * 100) / 100
    : null

  const beforeReference = Boolean(
    espace?.date_solde_reference && targetDate && targetDate < espace.date_solde_reference
  )

  const suggestions = useBalanceReconciliationSuggestions(
    espace?.id,
    targetDate,
    espace?.date_solde_reference,
    beforeReference ? null : delta,
    espace?.double_date ?? false
  )

  const confirmCorrection = async () => {
    if (!selectedSuggestion) return
    await applyCorrection.mutateAsync({
      actions: selectedSuggestion.actions,
      validationDate: targetDate,
    })
    await notifications.createNotification.mutateAsync({
      family: 'finances',
      title: 'Correction de rapprochement appliquée',
      message: `${selectedSuggestion.title} · impact attendu ${selectedSuggestion.effect > 0 ? '+' : ''}${formatEuro(selectedSuggestion.effect)} au ${formatDate(targetDate)}.`,
      action_label: 'Vérifier le solde',
      action_href: '/verification-solde',
      dedupe_key: `balance-correction:${targetDate}:${selectedSuggestion.id}`,
    })
    setSelectedSuggestion(null)
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-3 pb-24 sm:p-4">
      <PageHeader
        eyebrow="Rapprochement"
        title="Vérifier le solde"
        description="Compare Neyguichen au solde réellement constaté à une date donnée, sans modifier silencieusement tes données."
        icon={Scale}
      />

      {!espace?.date_solde_reference || espace.solde_reference == null ? (
        <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-4 text-sm text-amber-200">
          Un solde de référence daté est nécessaire avant de pouvoir vérifier le solde.
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm text-slate-300">Solde réel constaté</span>
                <input
                  inputMode="decimal"
                  placeholder="Ex. 1248,32"
                  value={realBalanceInput}
                  onChange={event => setRealBalanceInput(event.target.value)}
                  className="input input-bordered w-full bg-slate-950"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-slate-300">À la date du</span>
                <input
                  type="date"
                  value={targetDate}
                  onChange={event => setTargetDate(event.target.value)}
                  className="input input-bordered w-full bg-slate-950"
                />
              </label>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Référence actuelle : {formatEuro(Number(espace.solde_reference))} au {formatDate(espace.date_solde_reference)}.
            </p>
          </section>

          {beforeReference ? (
            <div className="flex gap-3 rounded-xl border border-amber-800/60 bg-amber-950/30 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <p className="font-medium text-amber-200">Date antérieure au point de référence</p>
                <p className="mt-1 text-sm text-amber-300/80">
                  Neyguichen ne peut pas reconstruire un solde fiable avant le {formatDate(espace.date_solde_reference)} à partir de ce point de référence.
                </p>
              </div>
            </div>
          ) : (
            <section className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs text-slate-500">Solde réel</p>
                <p className="mt-1 text-xl font-bold">{realBalance == null ? '—' : formatEuro(realBalance)}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs text-slate-500">Solde Neyguichen</p>
                <p className="mt-1 text-xl font-bold">
                  {calculated.isLoading ? 'Calcul…' : calculated.data == null ? '—' : formatEuro(calculated.data)}
                </p>
              </div>

              <div className={`rounded-xl border p-4 ${
                delta == null
                  ? 'border-slate-800 bg-slate-900'
                  : Math.abs(delta) < 0.01
                    ? 'border-emerald-800/60 bg-emerald-950/30'
                    : 'border-amber-800/60 bg-amber-950/30'
              }`}>
                <p className="text-xs text-slate-500">Écart</p>
                <div className="mt-1 flex items-center gap-2">
                  {delta != null && Math.abs(delta) < 0.01
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    : <Scale className="h-5 w-5 text-slate-500" />}
                  <p className="text-xl font-bold">{delta == null ? '—' : formatEuro(delta)}</p>
                </div>
              </div>
            </section>
          )}

          {delta != null && Math.abs(delta) >= 0.01 && !beforeReference && (
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <h2 className="font-semibold">Pistes de rapprochement</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Neyguichen cherche des opérations qui pourraient expliquer un écart de {formatEuro(delta)}.
                    Le diagnostic couvre les revenus, dépenses, épargne, remboursements et dettes/créances. Une égalité de montants n&apos;est pas une preuve : vérifie les opérations avant toute correction.
                  </p>
                </div>
              </div>

              {suggestions.isError ? (
                <div className="mt-4 rounded-lg border border-red-800/60 bg-red-950/25 p-3" role="alert">
                  <p className="text-sm font-medium text-red-300">La recherche n’a pas pu aboutir.</p>
                  <p className="mt-1 text-xs text-red-200/80">{suggestions.error instanceof Error ? suggestions.error.message : 'Erreur de chargement des opérations.'}</p>
                  <button type="button" onClick={() => suggestions.refetch()} className="mt-2 text-sm text-blue-300 underline">Réessayer</button>
                </div>
              ) : suggestions.isLoading ? (
                <p className="mt-4 text-sm text-slate-500">Recherche des pistes…</p>
              ) : suggestions.data && suggestions.data.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {suggestions.data.map(suggestion => (
                    <div key={suggestion.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{suggestion.title}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                              suggestion.confidence === 'forte'
                                ? 'bg-emerald-950 text-emerald-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {suggestion.confidence === 'forte' ? 'Montant exact · à confirmer' : 'À vérifier'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{suggestion.detail}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            Impact potentiel : <span className="font-medium">{suggestion.effect > 0 ? '+' : ''}{formatEuro(suggestion.effect)}</span>
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Link
                            href={suggestion.href}
                            className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                          >
                            Vérifier
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                          {suggestion.actions.length > 0 && <button
                            type="button"
                            onClick={() => setSelectedSuggestion(suggestion)}
                            className="rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-3 py-1.5 text-sm text-emerald-300 hover:bg-emerald-950/50"
                          >
                            Utiliser cette correction
                          </button>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <p className="text-sm text-slate-300">Aucune correspondance parmi les pistes actuellement analysées.</p>
                  <p className="mt-1 text-xs text-slate-500">
                    L&apos;écart peut venir d&apos;une opération absente, d&apos;une mauvaise date, d&apos;un montant différent ou d&apos;une combinaison plus complexe.
                  </p>
                </div>
              )}
            </section>
          )}

          {selectedSuggestion && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-3 sm:items-center">
              <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
                <h2 className="text-lg font-semibold">Confirmer la correction</h2>
                <p className="mt-2 text-sm text-slate-300">{selectedSuggestion.title}</p>
                <p className="mt-2 text-sm text-slate-500">
                  Neyguichen appliquera cette correction à la date du {formatDate(targetDate)} puis recalculera immédiatement le solde et l&apos;écart.
                </p>
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Impact attendu</span>
                    <span className="font-semibold">
                      {selectedSuggestion.effect > 0 ? '+' : ''}{formatEuro(selectedSuggestion.effect)}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between gap-3">
                    <span className="text-slate-500">Opérations modifiées</span>
                    <span>{selectedSuggestion.actions.length}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-amber-300/80">
                  Cette action modifie uniquement les statuts/dates de validation des opérations sélectionnées. Elle ne crée aucune nouvelle opération.
                </p>
                {applyCorrection.isError && (
                  <p className="mt-3 text-sm text-red-400">La correction n&apos;a pas pu être appliquée. Aucune confirmation de réussite n&apos;est affichée tant que l&apos;écriture échoue.</p>
                )}
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSuggestion(null)}
                    disabled={applyCorrection.isPending}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={confirmCorrection}
                    disabled={applyCorrection.isPending}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {applyCorrection.isPending ? 'Correction…' : 'Confirmer et recalculer'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
