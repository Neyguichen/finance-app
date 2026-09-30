'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useVisualViewport } from '@/lib/hooks/useVisualViewport'
import { Plus } from 'lucide-react'
import MonthSelector from '@/components/layout/MonthSelector'
import { useRevenus, useRevenusRecurrents } from '@/lib/hooks/useRevenus'
import { useMouvements, useEnveloppes } from '@/lib/hooks/useEpargne'
import { useApp } from '@/components/AppContext'
import { useAdminMoisData } from '@/lib/hooks/useAdminMoisData'

import RevenusResume from '@/components/pages/revenus/RevenusResume'
import RevenuCard from '@/components/pages/revenus/RevenuCard'
import RepriseCard from '@/components/pages/revenus/RepriseCard'
import RevenuForm from '@/components/pages/revenus/RevenuForm'
import RevenuEditDialog from '@/components/pages/revenus/RevenuEditDialog'
import RevenuDeleteDialog from '@/components/pages/revenus/RevenuDeleteDialog'
import { summarizeIncome } from '@/lib/income-summary'

export default function RevenusPage() {
  const { moisId, month, setMonth, espace, isAdminViewing } = useApp()
  const { data: revenus = [], toggleRecu, create, update, remove, removeDefinitif } = useRevenus(moisId)
  const { create: createRecurrent, update: updateRecurrent } = useRevenusRecurrents(espace?.id)
  const { data: mouvements = [] } = useMouvements(moisId)
  const { data: enveloppes = [] } = useEnveloppes(espace?.id)
  const { data: adminData } = useAdminMoisData(month)

  const effectiveRevenus = isAdminViewing ? (adminData?.revenus || []) : revenus
  const effectiveMouvements = isAdminViewing ? (adminData?.mouvements_epargne || []) : mouvements
  const effectiveEnveloppes = isAdminViewing ? (adminData?.enveloppes || []) : enveloppes

  const reprises = effectiveMouvements.filter((m: any) => m.type === 'reprise')
  const totalReprises = reprises.reduce((s: number, m: any) => s + Number(m.montant), 0)
  const {
    plannedIncome,
    receivedIncome,
    expectedIncome,
    plannedActiveIncome: totalActif,
    plannedPassiveIncome: totalPassif,
  } = summarizeIncome(effectiveRevenus)

  const [formOpen, setFormOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const visualViewport = useVisualViewport()
  const [editTarget, setEditTarget] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!isAdminViewing && moisId && new URLSearchParams(window.location.search).get('add') === '1') {
      setFormOpen(true)
    }
  }, [isAdminViewing, moisId])

  const getEnvNom = (id: string | null) => effectiveEnveloppes.find((e: any) => e.id === id)?.nom || 'Enveloppe'

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
    } else {
      const rec = await createRecurrent.mutateAsync({
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
        recurrent_id: rec.id,
        type: values.type,
        nom: values.nom,
        montant: values.montant,
        recu: false,
        date_prevue: values.datePrevue,
        ordre: effectiveRevenus.length,
      })
    }
  }

  const handleSaveEdit = async (data: any, scope: 'mois' | 'tous') => {
    if (isAdminViewing) return

    await update.mutateAsync({
      id: data.id,
      nom: data.nom,
      montant: data.montant,
      type: data.type,
      date_prevue: data.datePrevue ?? null,
    })

    if (scope === 'tous' && data.recurrentId) {
      await updateRecurrent.mutateAsync({
        id: data.recurrentId,
        nom: data.nom,
        montant: data.montant,
        type: data.type,
      })
    }
  }

  const handleDelete = (mode: 'mois' | 'definitif') => {
    if (isAdminViewing || !deleteTarget) return

    if (mode === 'definitif' && deleteTarget.recurrentId) {
      removeDefinitif.mutate({
        revenuId: deleteTarget.id,
        recurrentId: deleteTarget.recurrentId,
      })
    } else {
      remove.mutate(deleteTarget.id)
    }

    setDeleteTarget(null)
  }

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />

      <div className="mx-auto w-full max-w-6xl space-y-4 p-3 pb-28 sm:p-4">
        <h1 className="text-xl font-bold">Revenus</h1>

        <RevenusResume
          plannedIncome={plannedIncome}
          receivedIncome={receivedIncome}
          expectedIncome={expectedIncome}
          totalActif={totalActif}
          totalPassif={totalPassif}
          totalReprises={totalReprises}
        />

        <div className="space-y-2">
          {effectiveRevenus.map((rev: any) => (
            <RevenuCard
              key={rev.id}
              rev={rev}
              readOnly={isAdminViewing}
              doubleDate={espace?.double_date ?? false}
              onToggleRecu={(id, recu, dateReelle) => toggleRecu.mutate({ id, recu, dateReelle })}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          ))}

          {reprises.map((rep: any) => (
            <RepriseCard key={rep.id} reprise={rep} getEnvNom={getEnvNom} />
          ))}
        </div>

        {!isAdminViewing && mounted && createPortal(
          <div className="pointer-events-none fixed bottom-20 z-50 flex justify-end" style={{ left: visualViewport.offsetLeft, width: visualViewport.width ?? undefined, paddingRight: 16 }}>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:brightness-110"
              aria-label="Ajouter un revenu"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>,
          document.body
        )}

        <RevenuForm open={formOpen} onOpenChange={setFormOpen} onSubmit={handleCreate} />
        <RevenuEditDialog editTarget={editTarget} onClose={() => setEditTarget(null)} onSave={handleSaveEdit} />
        <RevenuDeleteDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} onDelete={handleDelete} />
      </div>
    </div>
  )
}
