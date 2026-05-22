'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmojiPicker } from '@/components/ui/emoji-picker'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreate: (data: { nom: string; icone: string }) => Promise<void>
}

export default function CategorieDialog({ open, onOpenChange, onCreate }: Props) {
  const [nom, setNom] = useState('')
  const [icone, setIcone] = useState('🛒')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader><DialogTitle>Nouveau budget</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Nom (ex: Courses)" value={nom} onChange={e => setNom(e.target.value)} />
          <EmojiPicker value={icone} onChange={setIcone} />
          <Button className="w-full" onClick={async () => {
            if (!nom.trim()) return
            await onCreate({ nom: nom.trim(), icone })
            setNom('')
            onOpenChange(false)
          }}>Créer</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}