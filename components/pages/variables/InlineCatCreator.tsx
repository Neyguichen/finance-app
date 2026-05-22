'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmojiPicker } from '@/components/ui/emoji-picker'

type Props = {
  onCreated: (catId: string) => void
  onCancel: () => void
  createCat: (data: { espace_id: string; nom: string; icone: string; couleur: string; ordre: number }) => Promise<{ id: string }>
  espaceId: string
  categoriesCount: number
}

export default function InlineCatCreator({ onCreated, onCancel, createCat, espaceId, categoriesCount }: Props) {
  const [nom, setNom] = useState('')
  const [icone, setIcone] = useState('🛒')

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
      <p className="text-xs text-slate-400 font-semibold">Nouveau budget</p>
      <Input placeholder="Nom (ex: Courses)" value={nom} onChange={e => setNom(e.target.value)} />
      <EmojiPicker value={icone} onChange={setIcone} />
      <div className="flex gap-2">
        <Button className="flex-1" size="sm" onClick={async () => {
          if (!nom.trim()) return
          const newCat = await createCat({
            espace_id: espaceId, nom: nom.trim(), icone, couleur: '#8B5CF6', ordre: categoriesCount,
          })
          onCreated(newCat.id)
          setNom('')
          setIcone('🛒')
        }}>Créer</Button>
        <Button className="flex-1" size="sm" variant="ghost" onClick={() => { onCancel(); setNom('') }}>Annuler</Button>
      </div>
    </div>
  )
}