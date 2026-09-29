'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Scale } from 'lucide-react'
import { useApp } from '@/components/AppContext'
import { useBalanceAtDate } from '@/lib/hooks/useBalanceAtDate'
import { formatEuro, localDateISO } from '@/lib/utils'

export default function VerificationSoldePage() {
  const { espace } = useApp()
  const [realBalanceInput, setRealBalanceInput] = useState('')
  const [targetDate, setTargetDate] = useState(localDateISO())

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

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4 pb-24">
      <div>
        <p className="text-xs uppercase tracking-wide text-blue-400">Phase 7 · Vérification du solde</p>
        <h1 className="mt-1 text-2xl font-bold">Comparer Neyguichen à ton solde réel</h1>
        <p className="mt-2 text-sm text-slate-400">
          Saisis le solde réellement constaté à une date donnée. Neyguichen calcule son propre solde à cette même date sans modifier tes données.
        </p>
      </div>

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
              Référence actuelle : {formatEuro(Number(espace.solde_reference))} au {espace.date_solde_reference}.
            </p>
          </section>

          {beforeReference ? (
            <div className="flex gap-3 rounded-xl border border-amber-800/60 bg-amber-950/30 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <p className="font-medium text-amber-200">Date antérieure au point de référence</p>
                <p className="mt-1 text-sm text-amber-300/80">
                  Neyguichen ne peut pas reconstruire un solde fiable avant le {espace.date_solde_reference} à partir de ce point de référence.
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

          {delta != null && Math.abs(delta) >= 0.01 && (
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h2 className="font-semibold">Pistes de rapprochement</h2>
              <p className="mt-1 text-sm text-slate-400">
                Le moteur de suggestions sera la prochaine étape de cette phase. Aucune correction ne sera appliquée automatiquement.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  )
}
