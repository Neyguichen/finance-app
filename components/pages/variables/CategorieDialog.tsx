'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmojiPicker } from '@/components/ui/emoji-picker'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  categories?: any[]
  onCreate: (data: { nom: string; icone: string; parent_id?: string }) => Promise<void>
}

export default function CategorieDialog({ open, onOpenChange, categories = [], onCreate }: Props) {
  const [nom, setNom] = useState('')
  const [icone, setIcone] = useState('🛒')
  const [parentId, setParentId] = useState('')

  const parentCategories = categories.filter((c: any) => !c.parent_id && c.actif !== false)

  const handleClose = (v: boolean) => {
    onOpenChange(v)
    if (!v) { setNom(''); setIcone('🛒'); setParentId('') }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
        <DialogHeader><DialogTitle>{parentId ? 'Nouvelle sous-catégorie' : 'Nouveau budget'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Sélecteur catégorie parente (optionnel) */}
          {parentCategories.length > 0 && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Rattacher à un budget <span className="text-slate-600">(optionnel)</span>
              </label>
              <select
                className="select select-bordered w-full bg-slate-800 border-slate-700 text-sm"
                value={parentId}
                onChange={e => {
                  setParentId(e.target.value)
                  if (e.target.value) setIcone('📎')
                  else setIcone('🛒')
                }}
              >
                <option value="">Aucun (budget principal)</option>
                {[...parentCategories].sort((a: any, b: any) => a.nom.localeCompare(b.nom)).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.icone} {c.nom}</option>
                ))}
              </select>
            </div>
          )}
          <Input placeholder={parentId ? "Nom (ex: Alimentation)" : "Nom (ex: Courses)"} value={nom} onChange={e => setNom(e.target.value)} />
          <EmojiPicker value={icone} onChange={setIcone} />
          <Button className="w-full" onClick={async () => {
            if (!nom.trim()) return
            await onCreate({ nom: nom.trim(), icone, ...(parentId ? { parent_id: parentId } : {}) })
            setNom('')
            setIcone('🛒')
            setParentId('')
            onOpenChange(false)
          }}>Créer</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}