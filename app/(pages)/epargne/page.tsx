'use client'

import { useState } from 'react'

import { useApp } from '@/components/AppContext'
import MonthSelector from '@/components/layout/MonthSelector'
import EpargneResume from '@/components/pages/epargne/EpargneResume'
import EnveloppeCard from '@/components/pages/epargne/EnveloppeCard'
import EnveloppeForm from '@/components/pages/epargne/EnveloppeForm'
import EnveloppeEditDialog from '@/components/pages/epargne/EnveloppeEditDialog'
import MouvementForm from '@/components/pages/epargne/MouvementForm'
import MouvementCard from '@/components/pages/epargne/MouvementCard'
import { MouvementEditDialog, MouvementScopeDialog, MouvementDeleteDialog } from '@/components/pages/epargne/MouvementDialogs'
import EpargneFab from '@/components/pages/epargne/EpargneFab'

import { useEnveloppes, useMouvements, useEpargneRecurrentes } from '@/lib/hooks/useEpargne'
import { useEnveloppesAtMonth } from '@/lib/hooks/useEnveloppesAtMonth'
import { useAdminMoisData } from '@/lib/hooks/useAdminMoisData'

export default function EpargnePage() {
  const { moisId, month, setMonth, espace, isAdminViewing } = useApp()
  const { create: createEnv, update: updateEnv, archive, unarchive } = useEnveloppes(espace?.id)
  const { data: enveloppes = [] } = useEnveloppesAtMonth(espace?.id, month)
  const { data: mouvements = [], create: createMvt, update: updateMvt, remove: removeMvt, removeDefinitif } = useMouvements(moisId)
  const { create: createRecurrent, update: updateRecurrent } = useEpargneRecurrentes(espace?.id)
  const { data: adminData } = useAdminMoisData(month)

  const effectiveEnveloppes = isAdminViewing ? (adminData?.enveloppes || []) : enveloppes
  const effectiveMouvements = isAdminViewing ? (adminData?.mouvements_epargne || []) : mouvements

  // Classement enveloppes
  const enveloppesActives = effectiveEnveloppes.filter((e: any) => !e.archived)
  const enveloppesVisibles = enveloppesActives.filter((env: any) =>
    Number(env.solde) !== 0 || (env.objectif && Number(env.objectif) > 0)
  )
  const enveloppesInactives = enveloppesActives.filter((env: any) =>
    Number(env.solde) === 0 && (!env.objectif || Number(env.objectif) === 0)
  )
  const enveloppesArchivees = effectiveEnveloppes.filter((e: any) => e.archived)

  // États dialogs
  const [openEnv, setOpenEnv] = useState(false)
  const [editEnv, setEditEnv] = useState<{ id: string; nom: string; objectif: number | null; solde: number; solde_initial: number } | null>(null)
  const [openMvt, setOpenMvt] = useState(false)
  const [editMvt, setEditMvt] = useState<{ id: string; montant: number; note: string | null; recurrentId: string | null } | null>(null)
  const [scopeMvt, setScopeMvt] = useState<{ id: string; montant: number; note: string | null; recurrentId: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; recurrentId: string | null; note: string | null } | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [showInactiveEnv, setShowInactiveEnv] = useState(false)

  // Totaux
  const totalEpargne = effectiveMouvements.filter((m: any) => m.type === 'epargne').reduce((s: number, m: any) => s + Number(m.montant), 0)
  const totalReprise = effectiveMouvements.filter((m: any) => m.type === 'reprise').reduce((s: number, m: any) => s + Number(m.montant), 0)
  const totalDisponible = enveloppesActives.reduce((s: number, e: any) => s + Number(e.solde), 0)

  const getEnvNom = (id: string | null) => effectiveEnveloppes.find((e: any) => e.id === id)?.nom || '—'

  // --- Handlers ---
  const handleCreateEnv = async (data: { nom: string; objectif: number | null; solde_initial: number | null }) => {
    if (isAdminViewing || !espace) return
    await createEnv.mutateAsync({
      espace_id: espace.id, nom: data.nom,
      solde_initial: data.solde_initial ?? 0, solde: data.solde_initial ?? 0,
      objectif: data.objectif, ordre: effectiveEnveloppes.length,
    })
    setOpenEnv(false)
  }

  const handleSaveEditEnv = (data: { id: string; nom: string; objectif: number | null; solde_initial: number; solde: number }) => {
    if (isAdminViewing) return
    updateEnv.mutateAsync(data)
    setEditEnv(null)
  }

  const handleCreateMvt = async (data: {
    type: 'epargne' | 'reprise' | 'transfert'; montant: number; note: string | null;
    sourceId: string | null; destId: string | null; frequence: number
  }) => {
    if (isAdminViewing || !moisId || !espace || data.montant <= 0) return
    if (data.type === 'reprise' && !data.sourceId) return
    if (data.type === 'epargne' && !data.destId) return
    if (data.type === 'transfert' && (!data.sourceId || !data.destId)) return

    if (data.frequence === 0) {
      await createMvt.mutateAsync({
        mois_id: moisId, recurrent_id: null,
        enveloppe_source_id: data.sourceId, enveloppe_dest_id: data.destId,
        montant: data.montant, type: data.type, date: month, note: data.note,
      })
    } else {
      const rec = await createRecurrent.mutateAsync({
        espace_id: espace.id, enveloppe_dest_id: data.destId!,
        montant: data.montant, actif: true, frequence_mois: data.frequence,
        note: data.note, ordre: 0, mois_debut: month,
      })
      await createMvt.mutateAsync({
        mois_id: moisId, recurrent_id: rec.id,
        enveloppe_source_id: null, enveloppe_dest_id: data.destId,
        montant: data.montant, type: 'epargne' as const, date: month, note: data.note,
      })
    }
    setOpenMvt(false)
  }

  const handleEditMvtSave = (id: string, montant: number, note: string | null, recurrentId: string | null) => {
    if (isAdminViewing) return
    if (recurrentId) {
      setScopeMvt({ id, montant, note, recurrentId })
    } else {
      updateMvt.mutateAsync({ id, montant, note })
    }
    setEditMvt(null)
  }

  const handleScopeEditMvt = async (scope: 'mois' | 'tous') => {
    if (isAdminViewing || !scopeMvt) return
    await updateMvt.mutateAsync({ id: scopeMvt.id, montant: scopeMvt.montant, note: scopeMvt.note })
    if (scope === 'tous') {
      await updateRecurrent.mutateAsync({ id: scopeMvt.recurrentId, montant: scopeMvt.montant, note: scopeMvt.note })
    }
    setScopeMvt(null)
  }

  const handleDeleteMvt = (mode: 'mois' | 'definitif') => {
    if (isAdminViewing || !deleteTarget) return
    if (mode === 'definitif' && deleteTarget.recurrentId) {
      removeDefinitif.mutate({ mouvementId: deleteTarget.id, recurrentId: deleteTarget.recurrentId })
    } else {
      removeMvt.mutate(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  return (
    <div>
      <MonthSelector currentMonth={month} onChange={setMonth} />
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">Épargne</h1>

        <EpargneResume totalDisponible={totalDisponible} totalEpargne={totalEpargne} totalReprise={totalReprise} />

        {/* Enveloppes actives */}
        {(enveloppesActives.length > 1 || enveloppesActives.some((e: any) => e.objectif && Number(e.objectif) > 0)) && (
          <div>
            {enveloppesVisibles.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {enveloppesVisibles.map((env: any) => (
                  <EnveloppeCard key={env.id} env={env} readOnly={isAdminViewing} variant="active"
                    onEdit={setEditEnv} onArchive={(id) => archive.mutate(id)} />
                ))}
              </div>
            )}
            {enveloppesInactives.length > 0 && (
              <div className="mt-2">
                <button onClick={() => setShowInactiveEnv(!showInactiveEnv)}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                  {showInactiveEnv ? '▼' : '▶'} Autres enveloppes ({enveloppesInactives.length})
                </button>
                {showInactiveEnv && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    {enveloppesInactives.map((env: any) => (
                      <EnveloppeCard key={env.id} env={env} readOnly={isAdminViewing} variant="inactive"
                        onEdit={setEditEnv} onArchive={(id) => archive.mutate(id)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Enveloppes archivées */}
        {enveloppesArchivees.length > 0 && (
          <div>
            <button onClick={() => setShowArchived(!showArchived)}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
              {showArchived ? '▼' : '▶'} Archivées ({enveloppesArchivees.length})
            </button>
            {showArchived && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                {enveloppesArchivees.map((env: any) => (
                  <EnveloppeCard key={env.id} env={env} readOnly={isAdminViewing} variant="archived"
                    onUnarchive={(id) => unarchive.mutate(id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mouvements du mois */}
        <h2 className="text-lg font-semibold">Mouvements du mois</h2>
        <div className="space-y-2">
          {effectiveMouvements.map((mvt: any) => (
            <MouvementCard key={mvt.id} mvt={mvt} readOnly={isAdminViewing}
              getEnvNom={getEnvNom} onEdit={setEditMvt} onDelete={setDeleteTarget} />
          ))}
          {effectiveMouvements.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-4">Aucun mouvement ce mois</p>
          )}
        </div>

        {/* Tous les dialogs */}
        <EnveloppeForm open={openEnv} onOpenChange={setOpenEnv} onSubmit={handleCreateEnv} />
        <EnveloppeEditDialog editEnv={editEnv} onClose={() => setEditEnv(null)} onSave={handleSaveEditEnv} />
        <MouvementForm open={openMvt} onOpenChange={setOpenMvt} enveloppesActives={enveloppesActives} onSubmit={handleCreateMvt} />
        <MouvementEditDialog editMvt={editMvt} onClose={() => setEditMvt(null)} onSave={handleEditMvtSave} />
        <MouvementScopeDialog target={scopeMvt} onClose={() => setScopeMvt(null)} onSave={handleScopeEditMvt} />
        <MouvementDeleteDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} onDelete={handleDeleteMvt} />
      </div>

      {/* FAB */}
      {!isAdminViewing && (
        <EpargneFab onOpenMouvement={() => setOpenMvt(true)} onOpenEnveloppe={() => setOpenEnv(true)} />
      )}
    </div>
  )
}