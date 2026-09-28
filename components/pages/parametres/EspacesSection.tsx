'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  espaces: any[]
  currentEspaceId: string | undefined
  updateEspace: (id: string, data: any) => Promise<void>
  removeEspace: (id: string) => Promise<void>
}

export default function EspacesSection({ espaces, currentEspaceId, updateEspace, removeEspace }: Props) {
  const supabase = createClient()

  // Édition
  const [editTarget, setEditTarget] = useState<any>(null)
  const [editNom, setEditNom] = useState('')
  const [editIcone, setEditIcone] = useState('')

  // Suppression
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  // Réordonnement
  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const idx = espaces.findIndex(e => e.id === id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= espaces.length) return
    const current = espaces[idx]
    const swap = espaces[swapIdx]
    await supabase.from('espaces').update({ ordre: swapIdx }).eq('id', current.id)
    await supabase.from('espaces').update({ ordre: idx }).eq('id', swap.id)
    window.location.reload()
  }

  // Édition
  const handleSaveEdit = async () => {
    if (!editTarget || !editNom.trim()) return
    await updateEspace(editTarget.id, { nom: editNom.trim(), icone: editIcone })
    setEditTarget(null)
  }

  // Suppression
  const handleDelete = async () => {
    if (!deleteTarget) return
    await removeEspace(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <>
      <div className="space-y-2">
        {espaces.map((esp: any, idx: number) => (
          <div key={esp.id} className={`bg-slate-800 rounded-lg p-3 space-y-2 ${
            currentEspaceId === esp.id ? 'ring-1 ring-blue-500' : ''
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{esp.icone}</span>
                <div>
                  <p className="font-medium">{esp.nom}</p>
                  {currentEspaceId === esp.id && (
                    <span className="text-xs text-blue-400">Actif</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500"
                  disabled={idx === 0}
                  onClick={() => handleReorder(esp.id, 'up')}>
                  <ChevronUp className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500"
                  disabled={idx === espaces.length - 1}
                  onClick={() => handleReorder(esp.id, 'down')}>
                  <ChevronDown className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400"
                  onClick={() => {
                    setEditTarget(esp)
                    setEditNom(esp.nom)
                    setEditIcone(esp.icone)
                  }}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400"
                  disabled={espaces.length <= 1}
                  onClick={() => setDeleteTarget(esp)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Toggle double date */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700">
              <div>
                <p className="text-sm text-slate-300">Double date</p>
                <p className="text-xs text-slate-500">Active la saisie d&apos;une date d&apos;opération + date de validation bancaire dans les charges variables. Sinon, une seule date.</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={!!esp.double_date}
                onChange={async (e) => {
                  await updateEspace(esp.id, { double_date: e.target.checked })
                }}
              />
            </div>
          </div>
        ))}

        {espaces.length <= 1 && (
          <p className="text-xs text-slate-500 text-center">
            Tu ne peux pas supprimer ton dernier espace.
          </p>
        )}
      </div>

      {/* Dialog édition */}
      <Dialog open={!!editTarget} onOpenChange={v => { if (!v) setEditTarget(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader><DialogTitle>Modifier l&apos;espace</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nom" value={editNom} onChange={e => setEditNom(e.target.value)} />
            <EmojiPicker value={editIcone} onChange={setEditIcone} />
            <Button className="w-full" onClick={handleSaveEdit}>Enregistrer</Button>
            <Button className="w-full" variant="ghost" onClick={() => setEditTarget(null)}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader><DialogTitle>Supprimer « {deleteTarget?.nom} » ?</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-red-950 border border-red-800 rounded-lg">
              <p className="text-sm text-red-300">
                ⚠️ Cette action supprimera définitivement l&apos;espace et <strong>toutes ses données</strong> :
                revenus, charges, transactions, catégories, budgets et mouvements d&apos;épargne.
              </p>
            </div>
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>
              Supprimer définitivement
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => setDeleteTarget(null)}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>

    </>
  )
}