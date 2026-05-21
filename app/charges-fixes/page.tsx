'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

import { useApp } from '@/components/AppContext'
import MonthSelector from '@/components/layout/MonthSelector'
import ChargeFixeResume from '@/components/pages/charges-fixes/ChargeFixeResume'
import ChargeFixeCard from '@/components/pages/charges-fixes/ChargeFixeCard'
import ChargeFixeForm from '@/components/pages/charges-fixes/ChargeFixeForm'
import { ChargeFixeEditDialog, ChargeFixeDeleteDialog, ChargeFixeScopeDialog } from '@/components/pages/charges-fixes/ChargeFixeDialogs'

import { useChargesFixes, useChargesFixesRecurrentes } from '@/lib/hooks/useChargesFixes'
import { useAdminMoisData } from '@/lib/hooks/useAdminMoisData'

export default function ChargesFixesPage() {
  const { moisId, month, setMonth, espace, isAdminViewing } = useApp()
  const { data: charges = [], togglePayee, create, update, remove, removeDefinitif } = useChargesFixes(moisId)
  const { create: createRecurrent, update: updateRecurrent } = useChargesFixesRecurrentes(espace?.id)
  const { data: adminData } = useAdminMoisData(month)

  const effectiveCharges = isAdminViewing ? (adminData?.charges_fixes || []) : charges

  const [openForm, setOpenForm] = useState(false)
  const [editTarget, setEditTarget] = useState<{ id: string; nom: string; montant: number; recurrentId: string | null } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; recurrentId: string | null; nom: string } | null>(null)
  const [scopeEdit, setScopeEdit] = useState<{ id: string; nom: string; montant: number; recurrentId: string } | null>(null)

  // --- Totaux ---
  const total = effectiveCharges.reduce((s: number, c: any) => s + Number(c.montant), 0)
  const totalPayee = effectiveCharges.filter((c: any) => c.payee).reduce((s: number, c: any) => s + Number(c.montant), 0)
  const aVenir = effectiveCharges.filter((c: any) => !c.payee).reduce((s: number, c: any) => s + Number(c.montant), 0)

  // --- Handlers ---
  const handleCreate = async (values: { nom: string; montant: number; frequence: number }) => {
    if (isAdminViewing || !moisId || !espace) return
    if (values.frequence === 0) {
      await create.mutateAsync({
        mois_id: moisId, recurrent_id: null,
        nom: values.nom, montant: values.montant,
        payee: false, ordre: charges.length,
      })
    } else {
      const rec = await createRecurrent.mutateAsync({
        espace_id: espace.id, nom: values.nom, montant: values.montant,
        actif: true, frequence_mois: values.frequence,
        ordre: charges.length, mois_debut: month,
      })
      await create.mutateAsync({
        mois_id: moisId, recurrent_id: rec.id,
        nom: values.nom, montant: values.montant,
        payee: false, ordre: charges.length,
      })
    }
    setOpenForm(false)
  }

  const handleEditSave = (id: string, nom: string, montant: number, recurrentId: string | null) => {
    if (recurrentId) {
      setScopeEdit({ id, nom, montant, recurrentId })
    } else {
      update.mutateAsync({ id, nom, montant })
    }
    setEditTarget(null)
  }

  const handleScopeEdit = async (scope: 'mois' | 'tous') => {
    if (isAdminViewing || !scopeEdit) return
    await update.mutateAsync({ id: scopeEdit.id, nom: scopeEdit.nom, montant: scopeEdit.montant })
    if (scope === 'tous') {
      await updateRecurrent.mutateAsync({ id: scopeEdit.recurrentId, nom: scopeEdit.nom, montant: scopeEdit.montant })
    }
    setScopeEdit(null)
  }

  const handleDelete = (mode: 'mois' | 'definitif') => {
    if (isAdminViewing || !deleteTarget) return
    if (mode === 'definitif' && deleteTarget.recurrentId) {
      removeDefinitif.mutate({ chargeId: deleteTarget.id, recurrentId: deleteTarget.recurrentId })
    } else {
      remove.mutate(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">Charges Fixes</h1>

        <ChargeFixeResume total={total} totalPayee={totalPayee} aVenir={aVenir} />

        <div className="space-y-2">
          {[...effectiveCharges].sort((a: any, b: any) => a.nom.localeCompare(b.nom)).map((charge: any) => (
            <ChargeFixeCard
              key={charge.id}
              charge={charge}
              readOnly={isAdminViewing}
              onTogglePayee={(id, payee) => togglePayee.mutate({ id, payee })}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>

        <ChargeFixeForm open={openForm} onOpenChange={setOpenForm} onSubmit={handleCreate} />
        <ChargeFixeEditDialog editTarget={editTarget} onClose={() => setEditTarget(null)} onSave={handleEditSave} />
        <ChargeFixeDeleteDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} onDelete={handleDelete} />
        <ChargeFixeScopeDialog target={scopeEdit} onClose={() => setScopeEdit(null)} onSave={handleScopeEdit} />
      </div>

      {/* FAB */}
      {!isAdminViewing && (
        <button
          onClick={() => setOpenForm(true)}
          className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}
    </div>
  )
}