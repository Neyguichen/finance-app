'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

import { useApp } from '@/components/AppContext'
import { Button } from '@/components/ui/button'
import RemboursementForm from '@/components/pages/admin/alsh/RemboursementForm'
import RemboursementResume from '@/components/pages/admin/alsh/RemboursementResume'
import RemboursementCard from '@/components/pages/admin/alsh/RemboursementCard'

import { isAdmin } from '@/lib/utils'
import type { RemboursementAlsh } from '@/lib/types'
import { useRemboursementsAlsh } from '@/lib/hooks/useRemboursementsAlsh'
import { useDettes } from '@/lib/hooks/useDettes'

export default function RemboursementsAlshPage() {
  const { userId, espace } = useApp()
  const { data: items = [], create, update, remove } = useRemboursementsAlsh(espace?.id)
  const { data: receivables = [], create: createReceivable, update: updateReceivable, archive: archiveReceivable, remboursements } = useDettes(espace?.id)
  const repaymentRows = remboursements.data || []

  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<RemboursementAlsh | null>(null)

  if (!isAdmin(userId)) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400 text-lg">🔒 Accès réservé</p>
      </div>
    )
  }

  const handleOpenNew = () => {
    setEditItem(null)
    setOpen(true)
  }

  const handleEdit = (item: RemboursementAlsh) => {
    setEditItem(item)
    setOpen(true)
  }

  const handleClose = (v: boolean) => {
    if (!v) setEditItem(null)
    setOpen(v)
  }

  const handleSubmit = async (data: any) => {
    if (!userId || !espace) return

    let debtId = editItem?.dette_id || null
    const amount = Number(data.montant || 0)
    const title = 'ALSH · ' + new Date(data.periode_debut + 'T12:00:00').toLocaleDateString('fr-FR') + ' → ' + new Date(data.periode_fin + 'T12:00:00').toLocaleDateString('fr-FR')

    if (amount > 0) {
      if (debtId) {
        await updateReceivable.mutateAsync({
          id: debtId,
          titre: title,
          description: 'Créance liée au suivi privé ALSH.',
          personne: 'Audrey',
          montant: amount,
          date_echeance: null,
        })
      } else {
        const createdDebt = await createReceivable.mutateAsync({
          espace_id: espace.id,
          type: 'jai_prete',
          titre: title,
          description: 'Créance liée au suivi privé ALSH.',
          personne: 'Audrey',
          montant: amount,
          date_echeance: null,
        })
        debtId = createdDebt.id
      }
    }

    const payload = { user_id: userId, espace_id: espace.id, dette_id: debtId, ...data }
    if (editItem) await update.mutateAsync({ id: editItem.id, ...payload })
    else await create.mutateAsync(payload)

    setEditItem(null)
    setOpen(false)
  }

  const handleDelete = async (item: RemboursementAlsh) => {
    if (item.dette_id) await archiveReceivable.mutateAsync(item.dette_id)
    await remove.mutateAsync(item.id)
  }

  const remainingFor = (item: RemboursementAlsh) => {
    if (!item.dette_id) return null
    const debt = receivables.find(row => row.id === item.dette_id)
    if (!debt) return null
    const repaid = repaymentRows.filter(row => row.dette_id === debt.id).reduce((sum, row) => sum + Number(row.montant), 0)
    return Math.max(0, Number(debt.montant) - repaid)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div><h1 className="text-xl font-bold">🏕️ Remboursements ALSH</h1><p className="mt-1 text-xs text-slate-500">Suivi privé : les montants renseignés créent automatiquement une créance standard dans « On me doit ».</p></div>
        <Button size="sm" onClick={handleOpenNew}>
          <Plus className="w-4 h-4 mr-1" />Ajouter
        </Button>
      </div>

      <RemboursementForm
        open={open}
        onOpenChange={handleClose}
        editItem={editItem}
        onSubmit={handleSubmit}
      />

      <RemboursementResume items={items} />

      <div className="space-y-2">
        {items.map(item => (
          <RemboursementCard
            key={item.id}
            item={item}
            onEdit={handleEdit}
            remaining={remainingFor(item)}
            onDelete={() => handleDelete(item)}
          />
        ))}
        {items.length === 0 && (
          <p className="text-center text-slate-500 py-8">Aucun remboursement pour le moment</p>
        )}
      </div>
    </div>
  )
}