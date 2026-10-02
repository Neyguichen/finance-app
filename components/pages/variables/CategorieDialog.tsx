'use client'

import { useEffect, useState } from 'react'
import { FolderTree, Shapes } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { FormActions, FormField, FormSection } from '@/components/ui/form-layout'
import { SearchableSelect } from '@/components/ui/searchable-select'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  categories?: any[]
  initialParentId?: string | null
  lockParent?: boolean
  onCreate: (data: { nom: string; icone: string; parent_id?: string }) => Promise<any>
  onCreated?: (created: any) => void
}

export default function CategorieDialog({ open, onOpenChange, categories = [], initialParentId = null, lockParent = false, onCreate, onCreated }: Props) {
  const [nom, setNom] = useState('')
  const [icone, setIcone] = useState('🛒')
  const [parentId, setParentId] = useState('')
  const [saving, setSaving] = useState(false)

  const parentCategories = categories.filter((c: any) => !c.parent_id && c.actif !== false)

  useEffect(() => {
    if (!open) return
    setParentId(initialParentId || '')
    setIcone(initialParentId ? '📎' : '🛒')
  }, [open, initialParentId])

  const reset = () => {
    setNom('')
    setIcone('🛒')
    setParentId('')
  }

  const handleClose = (v: boolean) => {
    if (saving) return
    onOpenChange(v)
    if (!v) reset()
  }

  const handleCreate = async () => {
    if (!nom.trim() || saving) return
    setSaving(true)
    try {
      const created = await onCreate({ nom: nom.trim(), icone, ...(parentId ? { parent_id: parentId } : {}) })
      onCreated?.(created)
      reset()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{parentId ? 'Nouvelle sous-catégorie' : 'Nouvelle catégorie'}</DialogTitle>
          <DialogDescription>
            {parentId ? 'Ajoutez un niveau de détail à votre classement.' : 'Créez une catégorie réutilisable dans vos dépenses.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!lockParent && parentCategories.length > 0 && (
            <FormSection title="Classement" icon={<FolderTree className="h-4 w-4" />}>
              <FormField label="Catégorie parente" hint="Facultatif">
                <select
                  className="select select-bordered w-full rounded-xl border-slate-700/80 bg-slate-950/70 text-slate-100"
                  value={parentId}
                  onChange={e => {
                    setParentId(e.target.value)
                    setIcone(e.target.value ? '📎' : '🛒')
                  }}
                >
                  <option value="">Aucune — catégorie principale</option>
                  {[...parentCategories].sort((a: any, b: any) => a.nom.localeCompare(b.nom)).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.icone} {c.nom}</option>
                  ))}
                </select>
              </FormField>
            </FormSection>
          )}

          <FormSection title="Apparence" description="Le nom et l’icône seront visibles dans les listes et graphiques." icon={<Shapes className="h-4 w-4" />}>
            <FormField label="Nom">
              <Input placeholder={parentId ? 'Ex. Alimentation' : 'Ex. Courses'} value={nom} onChange={e => setNom(e.target.value)} />
            </FormField>
            <FormField label="Icône">
              <EmojiPicker value={icone} onChange={setIcone} />
            </FormField>
          </FormSection>
        </div>

        <FormActions>
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleCreate} disabled={!nom.trim() || saving}>{saving ? 'Création…' : 'Créer'}</Button>
        </FormActions>
      </DialogContent>
    </Dialog>
  )
}
