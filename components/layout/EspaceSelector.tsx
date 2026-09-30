'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Plus } from 'lucide-react'
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
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🏠')
  const [creating, setCreating] = useState(false)
  const selectorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectorOpen) return

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!selectorRef.current?.contains(event.target as Node)) setSelectorOpen(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectorOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [selectorOpen])

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
      <div className="inline-flex max-w-full min-w-0 items-center gap-1.5">
        <div ref={selectorRef} className="relative min-w-0">
          <button
            type="button"
            onClick={() => setSelectorOpen(current => !current)}
            className="flex h-9 w-[8.5rem] min-w-0 max-w-[8.5rem] items-center gap-2 rounded-xl sm:w-[10.5rem] sm:max-w-[10.5rem] border border-indigo-400/35 bg-gradient-to-r from-indigo-500/20 to-cyan-500/10 px-3 text-sm font-semibold text-white shadow-sm shadow-indigo-950/20 outline-none transition hover:border-indigo-300/55 hover:from-indigo-500/25 hover:to-cyan-500/15 focus:border-indigo-300/70 focus:ring-2 focus:ring-indigo-500/15 sm:max-w-[16rem]"
            aria-haspopup="listbox"
            aria-expanded={selectorOpen}
            aria-label="Budget actif"
          >
            <span className="shrink-0" aria-hidden="true">{espace.icone}</span>
            <span className="min-w-0 flex-1 truncate text-left">{espace.nom}</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-indigo-200 transition-transform ${selectorOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {selectorOpen && (
            <div
              role="listbox"
              aria-label="Choisir un Budget"
              className="absolute left-0 top-full z-50 mt-2 min-w-full overflow-hidden rounded-xl border border-indigo-400/25 bg-[#0b1728] p-1.5 shadow-2xl shadow-black/45"
            >
              {espaces.map(item => {
                const selected = item.id === espace.id

                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setEspaceId(item.id)
                      setSelectorOpen(false)
                    }}
                    className={`flex w-full min-w-[9.5rem] items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition ${
                      selected
                        ? 'bg-gradient-to-r from-indigo-500/30 to-cyan-500/15 text-white'
                        : 'bg-transparent text-slate-200 hover:bg-indigo-500/15 hover:text-white'
                    }`}
                  >
                    <span className="shrink-0" aria-hidden="true">{item.icone}</span>
                    <span className="min-w-0 flex-1 truncate">{item.nom}</span>
                    {selected && <Check className="h-4 w-4 shrink-0 text-cyan-300" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/5 text-indigo-300 transition hover:border-indigo-400/40 hover:bg-indigo-500/10"
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
