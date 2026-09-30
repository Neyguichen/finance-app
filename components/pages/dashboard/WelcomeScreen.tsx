'use client'

import { useState } from 'react'
import { CheckCircle2, Landmark, Repeat2, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmojiPicker } from '@/components/ui/emoji-picker'

interface WelcomeScreenProps {
  onCreateEspace: (nom: string, icone?: string) => Promise<void>
}

export default function WelcomeScreen({ onCreateEspace }: WelcomeScreenProps) {
  const [newNom, setNewNom] = useState('')
  const [newIcone, setNewIcone] = useState('🏠')
  const [creating, setCreating] = useState(false)

  const create = async () => {
    if (!newNom.trim() || creating) return
    setCreating(true)
    try {
      await onCreateEspace(newNom.trim(), newIcone || undefined)
      setNewNom('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-24 sm:p-6">
      <header className="text-center">
        <p className="text-xs uppercase tracking-wide text-blue-400">Bienvenue dans Neyguichen Finances</p>
        <h1 className="mt-2 text-3xl font-bold">Commence par créer ton premier Budget</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Un Budget regroupe ses propres revenus, dépenses, catégories, épargne et réglages.
          Tu pourras en créer plusieurs plus tard sans mélanger leurs données.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Info icon={WalletCards} title="1. Crée ton Budget" text="Choisis simplement un nom et une icône." />
        <Info icon={Landmark} title="2. Indique ton solde réel" text="Il servira de point de départ fiable aux calculs V2." />
        <Info icon={Repeat2} title="3. Prépare ton mois" text="Définis tes récurrences ou commence de zéro." />
      </section>

      <section className="nf-card nf-glow mx-auto max-w-md p-5 sm:p-6">
        <div className="space-y-4">
          <label>
            <span className="mb-1 block text-sm text-slate-300">Nom du Budget</span>
            <Input
              placeholder="Ex. Perso, Foyer, Vacances…"
              value={newNom}
              onChange={event => setNewNom(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') create() }}
            />
          </label>

          <div>
            <span className="mb-1 block text-sm text-slate-300">Icône</span>
            <EmojiPicker value={newIcone} onChange={setNewIcone} />
          </div>

          <Button className="w-full" onClick={create} disabled={!newNom.trim() || creating}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {creating ? 'Création…' : 'Créer mon Budget'}
          </Button>
        </div>
      </section>

      <p className="text-center text-xs text-slate-600">
        Créer le Budget ne crée aucune opération financière. Un guide court te proposera ensuite les prochaines étapes.
      </p>
    </div>
  )
}

function Info({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-left">
      <Icon className="h-5 w-5 text-blue-400" />
      <p className="mt-3 text-sm font-semibold text-slate-200">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
    </div>
  )
}
