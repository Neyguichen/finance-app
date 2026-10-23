'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckSquare2, ExternalLink, Save } from 'lucide-react'
import { useApp } from '@/components/AppContext'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useTodos } from '@/lib/hooks/useTodos'

type LinkedObject = {
  type: string
  id: string
  label: string
  href: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  linkedObject?: LinkedObject | null
  titlePlaceholder?: string
}

export default function QuickTodoDialog({
  open,
  onOpenChange,
  linkedObject = null,
  titlePlaceholder = 'Ex. Vérifier une facture',
}: Props) {
  const { userId, isAdminViewing } = useApp()
  const model = useTodos(!isAdminViewing ? userId ?? undefined : undefined)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')

  const linkedTodo = useMemo(() => {
    if (!linkedObject) return null
    return (model.data || []).find(item =>
      item.object_type === linkedObject.type && item.object_id === linkedObject.id
    ) || null
  }, [linkedObject, model.data])

  useEffect(() => {
    if (!open) return
    if (linkedTodo) {
      setTitle(linkedTodo.title)
      setDueDate(linkedTodo.due_date || '')
      setNote(linkedTodo.note || '')
      return
    }
    setTitle('')
    setDueDate('')
    setNote('')
  }, [open, linkedTodo?.id])

  const submit = async () => {
    const cleanTitle = title.trim()
    if (!cleanTitle) return

    if (linkedTodo) {
      await model.updateTodo.mutateAsync({
        id: linkedTodo.id,
        title: cleanTitle,
        due_date: dueDate || null,
        note: note.trim() || null,
        link_label: linkedObject?.label || linkedTodo.link_label,
        link_href: linkedObject?.href || linkedTodo.link_href,
      })
    } else {
      await model.createTodo.mutateAsync({
        title: cleanTitle,
        due_date: dueDate || null,
        note: note.trim() || null,
        object_type: linkedObject?.type || null,
        object_id: linkedObject?.id || null,
        link_label: linkedObject?.label || null,
        link_href: linkedObject?.href || null,
      })
    }

    onOpenChange(false)
  }

  const busy = model.createTodo.isPending || model.updateTodo.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{linkedTodo ? 'Modifier la tâche liée' : 'Ajouter une tâche'}</DialogTitle>
          <DialogDescription>
            {linkedObject
              ? 'Cette tâche restera accessible depuis la Todo et depuis la transaction liée.'
              : 'Ajoute rapidement une tâche sans quitter l’écran actuel.'}
          </DialogDescription>
        </DialogHeader>

        {linkedObject && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.07] px-3 py-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-indigo-300/70">Élément lié</p>
              <p className="truncate text-sm font-medium text-indigo-100">{linkedObject.label}</p>
            </div>
            <Link
              href={linkedObject.href}
              className="inline-flex shrink-0 items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200"
              onClick={() => onOpenChange(false)}
            >
              Ouvrir
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Tâche</label>
            <Input
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder={titlePlaceholder}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1 text-xs text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" />
              Échéance <span className="text-slate-700">(optionnel)</span>
            </label>
            <Input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-500">Note <span className="text-slate-700">(optionnel)</span></label>
            <textarea
              className="textarea textarea-bordered min-h-20 w-full bg-slate-950"
              value={note}
              onChange={event => setNote(event.target.value)}
              placeholder="Ajouter un contexte ou une information utile…"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/todo"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"
          >
            <CheckSquare2 className="h-3.5 w-3.5" />
            Voir toutes les tâches
          </Link>
          <Button onClick={submit} disabled={!title.trim() || busy}>
            <Save className="mr-2 h-4 w-4" />
            {linkedTodo ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
