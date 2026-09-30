'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useApp } from '@/components/AppContext'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { EmojiPicker } from '@/components/ui/emoji-picker'

export default function EspaceSelector() {
  const { espaces, espace, setEspaceId, addEspace, isAdminViewing } = useApp()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🏠')
  const [creating, setCreating] = useState(false)

  if (pathname === '/login') return null

  if (isAdminViewing) {
    return (
      <div className="nf-chip border-rose-400/20 bg-rose-500/10 text-rose-200">
        <span aria-hidden="true">👁️</span>
        <span>Vue administrateur</span>
      </div>
    )
  }

  if (!espace) return null

  const createBudget = async () => {
    if (!name.trim() || creating) return
    setCreating(true)
    try {
      await addEspace(name.trim(), icon || undefined)
      setName('')
      setIcon('🏠')
      setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <div className="flex min-w-0 items-center gap-1.5">
        <label className="min-w-0">
          <span className="sr-only">Budget actif</span>
          <select
            value={espace.id}
            onChange={event => setEspaceId(event.target.value)}
            className="h-9 max-w-[10.5rem] truncate rounded-xl border border-slate-700/70 bg-slate-950/55 px-3 text-sm font-medium text-slate-200 outline-none transition hover:border-slate-600 focus:border-indigo-400/60 sm:max-w-[16rem]"
          >
            {espaces.map(item => (
              <option key={item.id} value={item.id}>
                {item.icone} {item.nom}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-950/55 text-slate-400 transition hover:border-indigo-400/30 hover:text-indigo-300"
          aria-label="Créer un Budget"
          title="Créer un Budget"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="mx-auto w-11/12 max-w-sm">
          <DialogHeader><DialogTitle>Nouveau Budget</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nom (ex. Foyer)"
              value={name}
              onChange={event => setName(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') createBudget() }}
            />
            <EmojiPicker value={icon} onChange={setIcon} />
            <Button className="w-full" onClick={createBudget} disabled={!name.trim() || creating}>
              {creating ? 'Création…' : 'Créer le Budget'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
