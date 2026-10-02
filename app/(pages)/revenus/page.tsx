'use client'

import { useEffect, useState } from 'react'
import MonthSelector from '@/components/layout/MonthSelector'
import { useRevenus, useRevenusRecurrents } from '@/lib/hooks/useRevenus'
import { useMouvements, useEnveloppes } from '@/lib/hooks/useEpargne'
import { useApp } from '@/components/AppContext'
import { useAdminMoisData } from '@/lib/hooks/useAdminMoisData'
import { useBalanceAtDate } from '@/lib/hooks/useBalanceAtDate'
import { useIncomeHistory } from '@/lib/hooks/useIncomeHistory'
import { localDateISO } from '@/lib/utils'

import RevenusResume from '@/components/pages/revenus/RevenusResume'
import RevenusTable from '@/components/pages/revenus/RevenusTable'
import RepartitionRevenus from '@/components/pages/revenus/RepartitionRevenus'
import EvolutionRevenus from '@/components/pages/revenus/EvolutionRevenus'
import RevenuForm from '@/components/pages/revenus/RevenuForm'
import RevenuEditDialog from '@/components/pages/revenus/RevenuEditDialog'
import RevenuDeleteDialog from '@/components/pages/revenus/RevenuDeleteDialog'
import RevenusFab from '@/components/pages/revenus/RevenusFab'
import { summarizeIncome } from '@/lib/income-summary'

function previousMonthEnd(month: string) {
  const [year, monthNumber] = month.slice(0,7).split('-').map(Number)
  return localDateISO(new Date(year, monthNumber - 1, 0, 12))
}

export default function RevenusPage() {
  const { moisId, month, setMonth, espace, isAdminViewing } = useApp()
  const { data: revenus = [], toggleRecu, create, update, updateFromMonth, remove, removeFromMonth } = useRevenus(moisId)
  const { data: recurrents = [], create: createRecurrent } = useRevenusRecurrents(espace?.id)
  const { data: mouvements = [] } = useMouvements(moisId)
  const { data: enveloppes = [] } = useEnveloppes(espace?.id)
  const { data: adminData } = useAdminMoisData(month)
  const history = useIncomeHistory(isAdminViewing ? undefined : espace?.id)
  const carried = useBalanceAtDate(
    isAdminViewing ? undefined : espace?.id,
    espace?.solde_reference ?? null,
    espace?.date_solde_reference ?? null,
    previousMonthEnd(month),
    espace?.double_date ?? false,
  )

  const effectiveRevenus = isAdminViewing ? (adminData?.revenus || []) : revenus
  const effectiveMouvements = isAdminViewing ? (adminData?.mouvements_epargne || []) : mouvements
  const effectiveEnveloppes = isAdminViewing ? (adminData?.enveloppes || []) : enveloppes

  const reprises = effectiveMouvements.filter((movement: any) => movement.type === 'reprise')
  const {
    plannedIncome,
    receivedIncome,
    expectedIncome,
    plannedActiveIncome: totalActif,
    plannedPassiveIncome: totalPassif,
  } = summarizeIncome(effectiveRevenus)

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  useEffect(() => {
    if (isAdminViewing || !moisId) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('add') === '1') setFormOpen(true)
    const focusId = params.get('focus')
    if (focusId) {
      const revenue = effectiveRevenus.find((item: any) => item.id === focusId)
      if (revenue) {
        setEditTarget({
          id: revenue.id,
          nom: revenue.nom,
          montant: Number(revenue.montant),
          type: revenue.type,
          recurrentId: revenue.recurrent_id,
          datePrevue: revenue.date_prevue,
        })
      }
    }
  }, [isAdminViewing, moisId, effectiveRevenus])

  const getEnvNom = (id: string | null | undefined) => effectiveEnveloppes.find((envelope: any) => envelope.id === id)?.nom || 'Reprise d’épargne'

  const handleCreate = async (values: { nom: string; montant: number; type: 'actif' | 'passif'; frequence: number; datePrevue: string | null }) => {
    if (isAdminViewing || !moisId || !espace) return

    if (values.frequence === 0) {
      await create.mutateAsync({
        mois_id: moisId,
        recurrent_id: null,
        type: values.type,
        nom: values.nom,
        montant: values.montant,
        recu: false,
        date_prevue: values.datePrevue,
        ordre: effectiveRevenus.length,
      })
      return
    }

    const recurrent = await createRecurrent.mutateAsync({
      espace_id: espace.id,
      type: values.type,
      nom: values.nom,
      montant: values.montant,
      actif: true,
      frequence_mois: values.frequence,
      ordre: effectiveRevenus.length,
      mois_debut: month,
    })

    await create.mutateAsync({
      mois_id: moisId,
      recurrent_id: recurrent.id,
      type: values.type,
      nom: values.nom,
      montant: values.montant,
      recu: false,
      date_prevue: values.datePrevue,
      ordre: effectiveRevenus.length,
    })
  }

  const handleSaveEdit = async (data: any, scope: 'mois' | 'future') => {
    if (isAdminViewing) return

    const updates = {
      nom: data.nom,
      montant: data.montant,
      type: data.type,
      date_prevue: data.datePrevue ?? null,
    }

    if (scope === 'future' && data.recurrentId) {
      await update.mutateAsync({ id: data.id, ...updates })
      await updateFromMonth.mutateAsync({
        recurrentId: data.recurrentId,
        month,
        updates: {
          nom: data.nom,
          montant: data.montant,
          type: data.type,
        },
      })
      return
    }

    await update.mutateAsync({ id: data.id, ...updates })
  }

  const handleDelete = async (mode: 'mois' | 'future') => {
    if (isAdminViewing || !deleteTarget) return

    if (mode === 'future' && deleteTarget.recurrentId) {
      await removeFromMonth.mutateAsync({ recurrentId: deleteTarget.recurrentId, month })
    } else {
      await remove.mutateAsync(deleteTarget.id)
    }

    setDeleteTarget(null)
  }

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} showPreparationAction={false} />

      <div className="mx-auto w-full max-w-7xl space-y-4 p-3 pb-28 sm:p-4">
        <h1 className="text-xl font-bold">Revenus</h1>

        <RevenusResume
          plannedIncome={plannedIncome}
          receivedIncome={receivedIncome}
          expectedIncome={expectedIncome}
          totalActif={totalActif}
          totalPassif={totalPassif}
          carriedBalance={carried.data}
        />

        <div className="md:hidden">
          <RepartitionRevenus revenus={effectiveRevenus as any[]} />
        </div>

        <RevenusTable
          revenus={effectiveRevenus as any[]}
          reprises={reprises as any[]}
          recurrents={recurrents as any[]}
          readOnly={isAdminViewing}
          doubleDate={espace?.double_date ?? false}
          getEnvNom={getEnvNom}
          onAdd={() => setFormOpen(true)}
          onToggleRecu={(id, recu, dateReelle) => toggleRecu.mutate({ id, recu, dateReelle })}
          onEdit={setEditTarget}
          onDelete={setDeleteTarget}
        />

        <div className="hidden gap-3 md:grid md:grid-cols-2">
          <RepartitionRevenus revenus={effectiveRevenus as any[]} />
          <EvolutionRevenus monthly={history.data?.monthly || []} loading={history.isLoading} />
        </div>

        <RevenuForm open={formOpen} onOpenChange={setFormOpen} onSubmit={handleCreate} />
        <RevenuEditDialog editTarget={editTarget} onClose={() => setEditTarget(null)} onSave={handleSaveEdit} />
        <RevenuDeleteDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} onDelete={handleDelete} />
      </div>
      {!isAdminViewing && <RevenusFab onAdd={() => setFormOpen(true)} />}
    </div>
  )
}
