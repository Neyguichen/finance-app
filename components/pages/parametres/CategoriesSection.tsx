'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { Pencil, Trash2, ArchiveRestore, ChevronDown, ChevronRight, Plus } from 'lucide-react'
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
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  // Nouvelle catégorie
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newCatNom, setNewCatNom] = useState('')
  const [newCatIcone, setNewCatIcone] = useState('🛒')

  // Nouvelle sous-catégorie
  const [newSubCatParentId, setNewSubCatParentId] = useState<string | null>(null)
  const [newSubCatNom, setNewSubCatNom] = useState('')
  const [newSubCatIcone, setNewSubCatIcone] = useState('📎')

  // Édition catégorie / sous-catégorie
  const [editCat, setEditCat] = useState<any>(null)
  const [editCatNom, setEditCatNom] = useState('')
  const [editCatIcone, setEditCatIcone] = useState('')
  const [editCatCouleur, setEditCatCouleur] = useState('#8B5CF6')

  // Suppression
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  // Séparer parents et enfants
  const parentCategories = categories.filter((c: any) => !c.parent_id && c.actif !== false)
  const archivedCategories = categories.filter((c: any) => c.actif === false)
  const getSubCats = (parentId: string) =>
    categories.filter((c: any) => c.parent_id === parentId && c.actif !== false)
      .sort((a: any, b: any) => a.nom.localeCompare(b.nom))

  const toggleExpand = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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

  const handleCreateSubCat = async () => {
    if (!newSubCatParentId || !newSubCatNom.trim() || !espaceId) return
    const parent = categories.find((c: any) => c.id === newSubCatParentId)
    const subCats = getSubCats(newSubCatParentId)
    await createCat.mutateAsync({
      espace_id: espaceId,
      nom: newSubCatNom.trim(),
      icone: newSubCatIcone,
      couleur: parent?.couleur || '#8B5CF6',
      ordre: subCats.length,
      parent_id: newSubCatParentId,
    })
    setNewSubCatNom('')
    setNewSubCatIcone('📎')
    setNewSubCatParentId(null)
    // Auto-expand le parent
    setExpandedCats(prev => new Set(prev).add(newSubCatParentId!))
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <p className="text-xs text-slate-500">Actives ({parentCategories.length})</p>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setNewCatOpen(true); setNewCatNom(''); setNewCatIcone('🛒') }}>
            + Ajouter
          </Button>
        </div>

        {parentCategories.sort((a: any, b: any) => a.nom.localeCompare(b.nom)).map((cat: any) => {
          const subCats = getSubCats(cat.id)
          const isExpanded = expandedCats.has(cat.id)

          return (
            <div key={cat.id}>
              {/* Catégorie parente */}
              <div className="bg-slate-800 rounded-lg p-2 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Chevron expand si sous-catégories ou pour en ajouter */}
                  <button type="button" onClick={() => toggleExpand(cat.id)} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.couleur || getCategoryColor(0) }} />
                  <span className="text-sm truncate">{cat.icone} {cat.nom}</span>
                  {subCats.length > 0 && (
                    <span className="text-[10px] text-slate-500 flex-shrink-0">({subCats.length})</span>
                  )}
                </div>
                <div className="flex gap-0.5 flex-shrink-0">
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

              {/* Sous-catégories (dépliées) */}
              {isExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                  {subCats.map((sub: any) => (
                    <div key={sub.id} className="bg-slate-800/60 rounded-lg p-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sub.couleur || cat.couleur || getCategoryColor(0) }} />
                        <span className="text-sm text-slate-300">{sub.icone} {sub.nom}</span>
                      </div>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400" onClick={() => {
                          setEditCat(sub)
                          setEditCatNom(sub.nom)
                          setEditCatIcone(sub.icone || '📎')
                          setEditCatCouleur(sub.couleur || cat.couleur || '#8B5CF6')
                        }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => setDeleteTarget(sub)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {/* Bouton ajouter sous-catégorie */}
                  <button
                    type="button"
                    onClick={() => { setNewSubCatParentId(cat.id); setNewSubCatNom(''); setNewSubCatIcone('📎') }}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 py-1 px-2"
                  >
                    <Plus className="w-3 h-3" /> Sous-catégorie
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Archivées */}
        {archivedCategories.length > 0 && (
          <>
            <button type="button" onClick={() => setShowArchived(!showArchived)} className="text-xs text-slate-500 hover:text-slate-300 mt-2">
              {showArchived ? '▼' : '▶'} Archivées ({archivedCategories.length})
            </button>
            {showArchived && archivedCategories.map((cat: any) => (
              <div key={cat.id} className="bg-slate-800/50 rounded-lg p-2 flex items-center justify-between opacity-60">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.couleur || getCategoryColor(0) }} />
                  <span className="text-sm">
                    {cat.icone} {cat.nom}
                    {cat.parent_id && <span className="text-[10px] text-slate-600 ml-1">(sous-cat)</span>}
                  </span>
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

      {/* Dialog nouvelle catégorie parente */}
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

      {/* Dialog nouvelle sous-catégorie */}
      <Dialog open={!!newSubCatParentId} onOpenChange={v => { if (!v) setNewSubCatParentId(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>
              Nouvelle sous-catégorie
              {newSubCatParentId && (
                <span className="text-sm text-slate-400 font-normal ml-2">
                  dans {categories.find((c: any) => c.id === newSubCatParentId)?.icone} {categories.find((c: any) => c.id === newSubCatParentId)?.nom}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nom (ex: Alimentation)" value={newSubCatNom} onChange={e => setNewSubCatNom(e.target.value)} />
            <EmojiPicker value={newSubCatIcone} onChange={setNewSubCatIcone} />
            <Button className="w-full" onClick={handleCreateSubCat}>Créer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog édition catégorie / sous-catégorie */}
      <Dialog open={!!editCat} onOpenChange={v => { if (!v) setEditCat(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>
              Modifier {editCat?.parent_id ? 'la sous-catégorie' : 'la catégorie'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nom" value={editCatNom} onChange={e => setEditCatNom(e.target.value)} />
            <EmojiPicker value={editCatIcone} onChange={setEditCatIcone} />
            <Button className="w-full" onClick={handleSaveEdit}>Enregistrer</Button>
            <Button className="w-full" variant="ghost" onClick={() => setEditCat(null)}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Supprimer « {deleteTarget?.nom} » ?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-yellow-950 border border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-300">
                {deleteTarget?.parent_id
                  ? '⚠️ Les transactions liées à cette sous-catégorie perdront leur sous-catégorie.'
                  : '⚠️ Les transactions liées à cette catégorie perdront leur catégorie. Les sous-catégories et budgets associés seront également supprimés.'
                }
              </p>
            </div>
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>
              Supprimer
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => setDeleteTarget(null)}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}