'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmojiPicker } from '@/components/ui/emoji-picker'

interface WelcomeScreenProps {
  onCreateEspace: (nom: string, icone?: string) => Promise<void>
}

export default function WelcomeScreen({ onCreateEspace }: WelcomeScreenProps) {
  const [newNom, setNewNom] = useState('')
  const [newIcone, setNewIcone] = useState('🏠')

  return (
    <div className="p-6 space-y-4 text-center">
      <h1 className="text-2xl font-bold">Bienvenue !</h1>
      <p className="text-slate-400">Crée ton premier espace pour commencer.</p>
      <div className="max-w-xs mx-auto space-y-3">
        <Input placeholder="Nom (ex: Perso)" value={newNom} onChange={e => setNewNom(e.target.value)} />
        <EmojiPicker value={newIcone} onChange={setNewIcone} />
        <Button className="w-full" onClick={async () => {
          if (!newNom.trim()) return
          await onCreateEspace(newNom.trim(), newIcone || undefined)
          setNewNom('')
        }}>Créer l&apos;espace</Button>
      </div>
    </div>
  )
}