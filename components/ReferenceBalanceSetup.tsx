'use client'

import { FormEvent, useState } from 'react'
import { useApp } from '@/components/AppContext'
import { useReferenceBalance } from '@/lib/hooks/useReferenceBalance'

function todayLocal() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export function ReferenceBalanceSetup() {
  const { espace, refreshEspaces } = useApp()
  const mutation = useReferenceBalance()
  const [balance, setBalance] = useState('')
  const [date, setDate] = useState(todayLocal())

  if (!espace || espace.solde_reference != null || espace.date_solde_reference) return null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const parsed = Number(balance.replace(',', '.'))
    if (!Number.isFinite(parsed)) return

    await mutation.mutateAsync({
      espaceId: espace.id,
      balance: parsed,
      date,
    })
    await refreshEspaces()
  }

  return (
    <section className="card bg-base-100 border border-base-300 shadow-sm mb-6">
      <div className="card-body gap-4">
        <div>
          <div className="badge badge-primary badge-outline mb-2">Nouveau moteur V2</div>
          <h2 className="card-title">Définir le solde réel de référence</h2>
          <p className="text-sm opacity-70 mt-1">
            Indique le solde réel de ce Budget à une date précise. Tes anciennes données restent intactes :
            cette valeur devient simplement le point de départ fiable des futurs calculs.
          </p>
        </div>

        <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="form-control">
            <span className="label-text mb-1">Solde réel</span>
            <input
              className="input input-bordered w-full"
              inputMode="decimal"
              placeholder="2437,82"
              value={balance}
              onChange={event => setBalance(event.target.value)}
              required
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">À la date du</span>
            <input
              className="input input-bordered w-full"
              type="date"
              value={date}
              onChange={event => setDate(event.target.value)}
              required
            />
          </label>

          <button className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Enregistrement…' : 'Utiliser comme référence'}
          </button>
        </form>

        {mutation.isError && (
          <div className="alert alert-error text-sm">
            Impossible d’enregistrer le solde de référence. Aucune donnée existante n’a été modifiée.
          </div>
        )}
      </div>
    </section>
  )
}
