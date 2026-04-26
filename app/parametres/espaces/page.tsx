'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { useApp } from '@/components/AppContext'
import { ArrowLeft, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function GererEspacesPage() {
  const router = useRouter()
  const supabase = createClient()
  const { espaces, espace, updateEspace, removeEspace } = useApp()

  const [editTarget, setEditTarget] = useState<{ id: string; nom: string; icone: string } | null>(null)
  const [editNom, setEditNom] = useState('')
  const [editIcone, setEditIcone] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nom: string } | null>(null)

  const handleEdit = (e: { id: string; nom: string; icone: string }) => {
    setEditTarget(e)
    setEditNom(e.nom)
    setEditIcone(e.icone)
  }

  const handleSaveEdit = async () => {
    if (!editTarget || !editNom.trim()) return
    await updateEspace(editTarget.id, { nom: editNom.trim(), icone: editIcone })
    setEditTarget(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await removeEspace(deleteTarget.id)
    setDeleteTarget(null)
  }

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const idx = espaces.findIndex(e => e.id === id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= espaces.length) return

    const current = espaces[idx]
    const swap = espaces[swapIdx]

    // Mettre à jour l'ordre en BDD
    await supabase.from('espaces').update({ ordre: swapIdx }).eq('id', current.id)
    await supabase.from('espaces').update({ ordre: idx }).eq('id', swap.id)

    // Refresh — on recharge la page
    window.location.reload()
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Gérer les espaces</h1>
      </div>

      <p className="text-sm text-slate-400">
        Modifie le nom, l&apos;icône ou l&apos;ordre de tes espaces. La création rapide reste sur le Dashboard.
      </p>

      <div className="space-y-2">
        {espaces.map((esp, idx) => (
          <Card key={esp.id} className={`bg-slate-900 border-slate-800 ${
            espace?.id === esp.id ? 'ring-1 ring-blue-500' : ''
          }`}>
            <CardContent className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{esp.icone}</span>
                <div>
                  <p className="font-medium">{esp.nom}</p>
                  {espace?.id === esp.id && (
                    <span className="text-xs text-blue-400">Actif</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Réordonner */}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500"
                  disabled={idx === 0}
                  onClick={() => handleReorder(esp.id, 'up')}>
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500"
                  disabled={idx === espaces.length - 1}
                  onClick={() => handleReorder(esp.id, 'down')}>
                  <ChevronDown className="w-4 h-4" />
                </Button>

                {/* Éditer */}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500"
                  onClick={() => handleEdit({ id: esp.id, nom: esp.nom, icone: esp.icone })}>
                  <Pencil className="w-4 h-4" />
                </Button>

                {/* Supprimer */}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500"
                  disabled={espaces.length <= 1}
                  onClick={() => setDeleteTarget({ id: esp.id, nom: esp.nom })}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {espaces.length <= 1 && (
        <p className="text-xs text-slate-500 text-center">
          Tu ne peux pas supprimer ton dernier espace.
        </p>
      )}

      {/* Dialog édition */}
      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) setEditTarget(null) }}>
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
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Supprimer « {deleteTarget?.nom} » ?</DialogTitle>
          </DialogHeader>
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
            <Button className="w-full" variant="ghost" onClick={() => setDeleteTarget(null)}>
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}