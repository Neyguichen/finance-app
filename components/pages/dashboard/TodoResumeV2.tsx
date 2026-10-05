'use client'

import Link from 'next/link'
import { Check, ChevronRight, ExternalLink, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useApp } from '@/components/AppContext'
import { useTodos, type TodoItem } from '@/lib/hooks/useTodos'
import { formatDate, localDateISO } from '@/lib/utils'

export default function TodoResumeV2() {
  const { espace, isAdminViewing } = useApp()
  const todoEnabled = espace?.features?.todo !== false
  const todos = useTodos(!isAdminViewing && todoEnabled ? espace?.id : undefined)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editDueDate, setEditDueDate] = useState('')

  const pending = useMemo(() => (todos.data || []).filter(item => item.status === 'todo'), [todos.data])
  const visibleTodos = pending.slice(0, 3)
  const today = localDateISO()
  if (!todoEnabled) return null

  const addTodo = async () => {
    if (!title.trim()) return
    await todos.createTodo.mutateAsync({ title: title.trim(), note: note.trim() || null, due_date: dueDate || null })
    setTitle(''); setNote(''); setDueDate(''); setAdding(false)
  }

  const startEdit = (todo: TodoItem) => {
    setEditingId(todo.id)
    setEditTitle(todo.title)
    setEditNote(todo.note || '')
    setEditDueDate(todo.due_date || '')
  }

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return
    await todos.updateTodo.mutateAsync({ id: editingId, title: editTitle.trim(), note: editNote.trim() || null, due_date: editDueDate || null })
    setEditingId(null)
  }

  return (
    <Card id="todo" className="nf-card-hover h-full scroll-mt-24">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-3 text-base text-slate-100">
          <span>Mes tâches</span>
          {!isAdminViewing && (
            <Link href="/todo" className="inline-flex items-center gap-1 text-xs font-normal text-slate-400 hover:text-indigo-300">
              Voir toutes les tâches <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2 p-3 pt-1">
        {adding && !isAdminViewing && (
          <div className="rounded-xl border border-indigo-400/15 bg-indigo-500/5 p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_145px]">
              <input className="input input-bordered input-sm w-full" placeholder="Nouvelle tâche…" value={title} onChange={event => setTitle(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') addTodo() }} autoFocus />
              <input type="date" className="input input-bordered input-sm w-full" value={dueDate} onChange={event => setDueDate(event.target.value)} />
            </div>
            <textarea className="textarea textarea-bordered textarea-sm mt-2 min-h-14 w-full" placeholder="Note facultative" value={note} onChange={event => setNote(event.target.value)} />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => setAdding(false)}><X className="h-3.5 w-3.5" />Annuler</button>
              <button type="button" onClick={addTodo} disabled={!title.trim() || todos.createTodo.isPending} className="btn btn-primary btn-xs">Ajouter</button>
            </div>
          </div>
        )}

        {isAdminViewing ? (
          <p className="text-sm text-slate-500">Todo personnelle masquée en vue administrateur.</p>
        ) : todos.isLoading ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : visibleTodos.length === 0 ? (
          <button type="button" onClick={() => setAdding(true)} className="w-full rounded-xl border border-dashed border-slate-800 bg-slate-950/25 p-4 text-left">
            <p className="text-sm text-slate-300">Aucune tâche en attente.</p>
            <p className="mt-1 text-xs text-indigo-300">+ Ajouter une tâche</p>
          </button>
        ) : (
          <div className="divide-y divide-slate-800/70 rounded-xl border border-slate-800/70 bg-slate-950/20">
            {visibleTodos.map(todo => {
              const editing = editingId === todo.id
              return (
                <div key={todo.id} className="px-3 py-2.5">
                  {editing ? (
                    <div className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-[1fr_135px]">
                        <input className="input input-bordered input-sm w-full" value={editTitle} onChange={event => setEditTitle(event.target.value)} autoFocus />
                        <input type="date" className="input input-bordered input-sm w-full" value={editDueDate} onChange={event => setEditDueDate(event.target.value)} />
                      </div>
                      <textarea className="textarea textarea-bordered textarea-sm min-h-14 w-full" value={editNote} onChange={event => setEditNote(event.target.value)} placeholder="Note facultative" />
                      <div className="flex justify-end gap-2">
                        <button type="button" className="btn btn-ghost btn-xs" onClick={() => setEditingId(null)}>Annuler</button>
                        <button type="button" className="btn btn-primary btn-xs" onClick={saveEdit} disabled={!editTitle.trim() || todos.updateTodo.isPending}><Save className="h-3.5 w-3.5" />Enregistrer</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button type="button" aria-label="Marquer comme terminée" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-700 text-transparent transition hover:border-emerald-500 hover:text-emerald-400" onClick={() => todos.toggleTodo.mutate(todo)}>
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-200">{todo.title}</p>
                        {todo.link_href && <Link href={todo.link_href} className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-indigo-300"><ExternalLink className="h-3 w-3" />{todo.link_label || 'Ouvrir'}</Link>}
                      </div>
                      {todo.due_date && <span className={'shrink-0 rounded-md border px-2 py-1 text-[10px] ' + (todo.due_date < today ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-slate-700 bg-slate-900 text-slate-400')}>{formatDate(todo.due_date)}</span>}
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button type="button" onClick={() => startEdit(todo)} className="rounded-md p-1 text-slate-600 hover:text-indigo-300" aria-label="Modifier"><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => todos.deleteTodo.mutate(todo.id)} className="rounded-md p-1 text-slate-700 hover:text-rose-400" aria-label="Supprimer"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!isAdminViewing && !adding && visibleTodos.length > 0 && (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200">
            <Plus className="h-3.5 w-3.5" />Ajouter une tâche
          </button>
        )}
      </CardContent>
    </Card>
  )
}
