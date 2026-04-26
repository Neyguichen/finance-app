'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { useCategories } from '@/lib/hooks/useCategories'
import { useApp } from '@/components/AppContext'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { getCategoryColor } from '@/lib/utils'

export default function GererCategoriesPage() {
  const router = useRouter()
  const { espace } = useApp()
  const { data: categories = [], update, remove } = useCategories(espace?.id)

  const [editTarget, setEditTarget] = useState<{
    id: string; nom: string; icone: string | null; couleur: string
  } | null>(null)
  const [editNom, setEditNom] = useState('')
  const [editIcone, setEditIcone] = useState('')
  const [editCouleur, setEditCouleur] = useState('#8B5CF6')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nom: string } | null>(null)

  const handleEdit = (cat: { id: string; nom: string; icone: string | null; couleur: string }) => {
    setEditTarget(cat)
    setEditNom(cat.nom)
    setEditIcone(cat.icone || '📂')
    setEditCouleur(cat.couleur)
  }

  const handleSaveEdit = async () => {
    if (!editTarget || !editNom.trim()) return
    await update.mutateAsync({
      id: editTarget.id,
      nom: editNom.trim(),
      icone: editIcone,
      couleur: editCouleur,
    })
    setEditTarget(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await remove.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  if (!espace) {
    return (
      <div className="p-4 text-center text-slate-400">
        <p>Aucun espace sélectionné.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Gérer les catégories</h1>
      </div>

      <p className="text-sm text-slate-400">
        Espace : {espace.icone} {espace.nom} — La création rapide reste sur la page Variables.
      </p>

      {categories.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <p>Aucune catégorie pour cet espace.</p>
          <p className="text-sm mt-1">Crée-en une depuis la page Variables.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...categories].sort((a, b) => a.nom.localeCompare(b.nom)).map((cat, i) => {
            return (
              <Card key={cat.id} className="bg-slate-900 border-slate-800">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{backgroundColor: getCategoryColor(i)}} />
                    <span className="text-lg">{cat.icone || '📂'}</span>
                    <p className="font-medium">{cat.nom}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500"
                      onClick={() => handleEdit(cat)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500"
                      onClick={() => setDeleteTarget({ id: cat.id, nom: cat.nom })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog édition */}
      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) setEditTarget(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader><DialogTitle>Modifier la catégorie</DialogTitle></DialogHeader>
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
            <div className="p-3 bg-yellow-950 border border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-300">
                ⚠️ Les transactions liées à cette catégorie perdront leur catégorie (elles ne seront pas supprimées).
                Les budgets associés seront supprimés.
              </p>
            </div>
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>
              Supprimer la catégorie
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