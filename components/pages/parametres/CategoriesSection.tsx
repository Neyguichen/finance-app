'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { Pencil, Trash2, Archive, ArchiveRestore } from 'lucide-react'
import { getCategoryColor } from '@/lib/utils'

type Props = {
  categories: any[]
  espaceId: string | undefined
  createCat: any
  updateCat: any
  removeCat: any
}

export default function CategoriesSection({ categories, espaceId, createCat, updateCat, removeCat }: Props) {
  const [showArchived, setShowArchived] = useState(false)

  // Nouvelle catégorie
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newCatNom, setNewCatNom] = useState('')
  const [newCatIcone, setNewCatIcone] = useState('🛒')

  // Édition catégorie
  const [editCat, setEditCat] = useState<any>(null)
  const [editCatNom, setEditCatNom] = useState('')
  const [editCatIcone, setEditCatIcone] = useState('')
  const [editCatCouleur, setEditCatCouleur] = useState('#8B5CF6')

  // Suppression catégorie
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  const activeCategories = categories.filter((c: any) => c.actif !== false)
  const archivedCategories = categories.filter((c: any) => c.actif === false)

  const handleSaveEdit = async () => {
    if (!editCat || !editCatNom.trim()) return
    await updateCat.mutateAsync({
      id: editCat.id,
      nom: editCatNom.trim(),
      icone: editCatIcone,
      couleur: editCatCouleur,
    })
    setEditCat(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await removeCat.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <p className="text-xs text-slate-500">Actives ({activeCategories.length})</p>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setNewCatOpen(true); setNewCatNom(''); setNewCatIcone('🛒') }}>
            + Ajouter
          </Button>
        </div>
        {activeCategories.sort((a: any, b: any) => a.nom.localeCompare(b.nom)).map((cat: any) => (
          <div key={cat.id} className="bg-slate-800 rounded-lg p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style= {{backgroundColor: getCategoryColor(cat)}}  />
              <span className="text-sm">{cat.icone} {cat.nom}</span>
            </div>
            <div className="flex gap-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => {
                setEditCat(cat)
                setEditCatNom(cat.nom)
                setEditCatIcone(cat.icone || '📂')
                setEditCatCouleur(cat.couleur || '#8B5CF6')
              }}>
                <Pencil className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => setDeleteTarget(cat)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}

        {archivedCategories.length > 0 && (
          <>
            <button type="button" onClick={() => setShowArchived(!showArchived)} className="text-xs text-slate-500 hover:text-slate-300 mt-2">
              {showArchived ? '▼' : '▶'} Archivées ({archivedCategories.length})
            </button>
            {showArchived && archivedCategories.map((cat: any) => (
              <div key={cat.id} className="bg-slate-800/50 rounded-lg p-2 flex items-center justify-between opacity-60">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style= {{backgroundColor: getCategoryColor(cat)}}  />
                  <span className="text-sm">{cat.icone} {cat.nom}</span>
                </div>
                <Button variant="ghost" size="sm" className="text-emerald-400 text-xs h-7" onClick={async () => {
                  await updateCat.mutateAsync({ id: cat.id, actif: true })
                }}>
                  <ArchiveRestore className="w-3 h-3 mr-1" /> Restaurer
                </Button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Dialog nouvelle catégorie */}
      <Dialog open={newCatOpen} onOpenChange={setNewCatOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader><DialogTitle>Nouvelle catégorie</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nom (ex: Courses)" value={newCatNom} onChange={e => setNewCatNom(e.target.value)} />
            <EmojiPicker value={newCatIcone} onChange={setNewCatIcone} />
            <Button className="w-full" onClick={async () => {
              if (!newCatNom.trim() || !espaceId) return
              await createCat.mutateAsync({ espace_id: espaceId, nom: newCatNom.trim(), icone: newCatIcone, couleur: '#8B5CF6', ordre: categories.length })
              setNewCatOpen(false)
            }}>Créer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog édition catégorie */}
      <Dialog open={!!editCat} onOpenChange={v => { if (!v) setEditCat(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader><DialogTitle>Modifier la catégorie</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nom" value={editCatNom} onChange={e => setEditCatNom(e.target.value)} />
            <EmojiPicker value={editCatIcone} onChange={setEditCatIcone} />
            <Button className="w-full" onClick={handleSaveEdit}>Enregistrer</Button>
            <Button className="w-full" variant="ghost" onClick={() => setEditCat(null)}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression catégorie */}
      <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader><DialogTitle>Supprimer « {deleteTarget?.nom} » ?</DialogTitle></DialogHeader>
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
            <Button className="w-full" variant="ghost" onClick={() => setDeleteTarget(null)}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}