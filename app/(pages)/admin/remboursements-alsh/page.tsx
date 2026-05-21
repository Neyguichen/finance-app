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

export default function RemboursementsAlshPage() {
  const { userId } = useApp()
  const { data: items = [], create, update, remove } = useRemboursementsAlsh()

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
    if (!userId) return
    const payload = { user_id: userId, ...data }
    if (editItem) {
      await update.mutateAsync({ id: editItem.id, ...payload })
    } else {
      await create.mutateAsync(payload)
    }
    setEditItem(null)
    setOpen(false)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">🏕️ Remboursements ALSH</h1>
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
            onDelete={(id) => remove.mutate(id)}
          />
        ))}
        {items.length === 0 && (
          <p className="text-center text-slate-500 py-8">Aucun remboursement pour le moment</p>
        )}
      </div>
    </div>
  )
}