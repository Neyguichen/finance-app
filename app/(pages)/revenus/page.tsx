'use client'

import { useState } from 'react'
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
  const totalEntrants = effectiveRevenus.reduce((s: number, r: any) => s + Number(r.montant), 0) + totalReprises
  const totalActif = effectiveRevenus.filter((r: any) => r.type === 'actif').reduce((s: number, r: any) => s + Number(r.montant), 0)
  const totalPassif = effectiveRevenus.filter((r: any) => r.type === 'passif').reduce((s: number, r: any) => s + Number(r.montant), 0)

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  const getEnvNom = (id: string | null) => effectiveEnveloppes.find((e: any) => e.id === id)?.nom || 'Enveloppe'

  // Création
  const handleCreate = async (values: { nom: string; montant: number; type: 'actif' | 'passif'; frequence: number }) => {
    if (isAdminViewing || !moisId || !espace) return
    if (values.frequence === 0) {
      await create.mutateAsync({
        mois_id: moisId, recurrent_id: null, type: values.type,
        nom: values.nom, montant: values.montant, recu: false, ordre: effectiveRevenus.length,
      })
    } else {
      const rec = await createRecurrent.mutateAsync({
        espace_id: espace.id, type: values.type, nom: values.nom,
        montant: values.montant, actif: true, frequence_mois: values.frequence,
        ordre: effectiveRevenus.length, mois_debut: month,
      })
      await create.mutateAsync({
        mois_id: moisId, recurrent_id: rec.id, type: values.type,
        nom: values.nom, montant: values.montant, recu: false, ordre: effectiveRevenus.length,
      })
    }
  }

  // Édition
  const handleSaveEdit = async (data: any, scope: 'mois' | 'tous') => {
    if (isAdminViewing) return
    await update.mutateAsync({ id: data.id, nom: data.nom, montant: data.montant, type: data.type })
    if (scope === 'tous' && data.recurrentId) {
      await updateRecurrent.mutateAsync({ id: data.recurrentId, nom: data.nom, montant: data.montant, type: data.type })
    }
  }

  // Suppression
  const handleDelete = (mode: 'mois' | 'definitif') => {
    if (isAdminViewing || !deleteTarget) return
    if (mode === 'definitif' && deleteTarget.recurrentId) {
      removeDefinitif.mutate({ revenuId: deleteTarget.id, recurrentId: deleteTarget.recurrentId })
    } else {
      remove.mutate(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />
      <div className="p-4 space-y-4 pb-24">
        <h1 className="text-xl font-bold">Revenus</h1>

        <RevenusResume totalEntrants={totalEntrants} totalActif={totalActif} totalPassif={totalPassif} totalReprises={totalReprises} />

        <div className="space-y-2">
          {effectiveRevenus.map((rev: any) => (
            <RevenuCard key={rev.id} rev={rev} readOnly={isAdminViewing}
              onToggleRecu={(id, recu) => toggleRecu.mutate({ id, recu })}
              onEdit={setEditTarget} onDelete={setDeleteTarget} />
          ))}
          {reprises.map((rep: any) => (
            <RepriseCard key={rep.id} reprise={rep} getEnvNom={getEnvNom} />
          ))}
        </div>

        {!isAdminViewing && (
          <button onClick={() => setFormOpen(true)}
            className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center text-2xl hover:brightness-110 transition-all"
            aria-label="Ajouter un revenu">
            <Plus className="w-6 h-6" />
          </button>
        )}

        <RevenuForm open={formOpen} onOpenChange={setFormOpen} onSubmit={handleCreate} />
        <RevenuEditDialog editTarget={editTarget} onClose={() => setEditTarget(null)} onSave={handleSaveEdit} />
        <RevenuDeleteDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} onDelete={handleDelete} />
      </div>
    </div>
  )
}