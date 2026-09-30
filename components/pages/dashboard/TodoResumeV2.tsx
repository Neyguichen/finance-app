'use client'

import Link from 'next/link'
import { Check, CheckSquare2, ChevronRight, ExternalLink, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useApp } from '@/components/AppContext'
import { useTodos, type TodoItem } from '@/lib/hooks/useTodos'
import { formatDate } from '@/lib/utils'

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

  const pending = useMemo(
    () => (todos.data || []).filter(item => item.status === 'todo'),
    [todos.data]
  )
  const top = pending.slice(0, 5)

  if (!todoEnabled) return null

  const addTodo = async () => {
    if (!title.trim()) return
    await todos.createTodo.mutateAsync({
      title: title.trim(),
      note: note.trim() || null,
      due_date: dueDate || null,
    })
    setTitle('')
    setNote('')
    setDueDate('')
    setAdding(false)
  }

  const startEdit = (todo: TodoItem) => {
    setEditingId(todo.id)
    setEditTitle(todo.title)
    setEditNote(todo.note || '')
    setEditDueDate(todo.due_date || '')
  }

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return
    await todos.updateTodo.mutateAsync({
      id: editingId,
      title: editTitle.trim(),
      note: editNote.trim() || null,
      due_date: editDueDate || null,
    })
    setEditingId(null)
  }

  return (
    <Card className="nf-card-hover">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
          <span className="flex items-center gap-2">
            <CheckSquare2 className="h-4 w-4 text-emerald-400" />
            Todo
            {pending.length > 0 && (
              <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] text-emerald-300">
                {pending.length}
              </span>
            )}
          </span>
          {!isAdminViewing && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAdding(value => !value)}
                className="inline-flex items-center gap-1 rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1.5 text-xs font-medium text-indigo-200 hover:bg-indigo-500/15"
              >
                {adding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {adding ? 'Fermer' : 'Ajouter'}
              </button>
              <Link href="/todo" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
                Tout voir
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {adding && !isAdminViewing && (
          <div className="rounded-xl border border-indigo-400/15 bg-indigo-500/5 p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_155px]">
              <input
                className="input input-bordered input-sm w-full"
                placeholder="Nouvelle tâche…"
                value={title}
                onChange={event => setTitle(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter') addTodo() }}
                autoFocus
              />
              <input
                type="date"
                className="input input-bordered input-sm w-full"
                value={dueDate}
                onChange={event => setDueDate(event.target.value)}
              />
            </div>
            <textarea
              className="textarea textarea-bordered textarea-sm mt-2 min-h-16 w-full"
              placeholder="Note facultative"
              value={note}
              onChange={event => setNote(event.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={addTodo}
                disabled={!title.trim() || todos.createTodo.isPending}
                className="btn btn-primary btn-sm"
              >
                Ajouter
              </button>
            </div>
          </div>
        )}

        {isAdminViewing ? (
          <p className="text-sm text-slate-500">Todo personnelle masquée en vue administrateur.</p>
        ) : todos.isLoading ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : top.length === 0 ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full rounded-xl border border-dashed border-slate-700 bg-slate-950/30 p-4 text-left"
          >
            <p className="text-sm text-slate-300">Aucune action en attente.</p>
            <p className="mt-1 text-xs text-indigo-300">Ajouter rapidement une tâche</p>
          </button>
        ) : (
          <div className="space-y-2">
            {top.map(todo => {
              const editing = editingId === todo.id
              return (
                <div key={todo.id} className="group rounded-xl border border-slate-800/80 bg-slate-950/35 p-3">
                  {editing ? (
                    <div className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-[1fr_155px]">
                        <input
                          className="input input-bordered input-sm w-full"
                          value={editTitle}
                          onChange={event => setEditTitle(event.target.value)}
                          autoFocus
                        />
                        <input
                          type="date"
                          className="input input-bordered input-sm w-full"
                          value={editDueDate}
                          onChange={event => setEditDueDate(event.target.value)}
                        />
                      </div>
                      <textarea
                        className="textarea textarea-bordered textarea-sm min-h-16 w-full"
                        value={editNote}
                        onChange={event => setEditNote(event.target.value)}
                        placeholder="Note facultative"
                      />
                      <div className="flex justify-end gap-2">
                        <button type="button" className="btn btn-ghost btn-xs" onClick={() => setEditingId(null)}>
                          Annuler
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
                          onClick={saveEdit}
                          disabled={!editTitle.trim() || todos.updateTodo.isPending}
                        >
                          <Save className="h-3.5 w-3.5" />
                          Enregistrer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        aria-label="Marquer comme terminée"
                        className="mt-0.5 rounded-md border border-slate-700 p-1 text-slate-500 hover:border-emerald-600 hover:text-emerald-400"
                        onClick={() => todos.toggleTodo.mutate(todo)}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-medium text-slate-200">{todo.title}</p>
                        {todo.note && (
                          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-500">
                            {todo.note}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                          {todo.due_date && <span>Échéance {formatDate(todo.due_date)}</span>}
                          {todo.link_href && (
                            <Link href={todo.link_href} className="inline-flex items-center gap-1 text-indigo-300 hover:text-indigo-200">
                              {todo.link_label || 'Ouvrir'}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(todo)}
                          className="rounded-md p-1 text-slate-600 transition hover:text-indigo-300"
                          aria-label="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => todos.deleteTodo.mutate(todo.id)}
                          className="rounded-md p-1 text-slate-700 transition hover:text-rose-400"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {pending.length > top.length && (
              <Link href="/todo" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
                + {pending.length - top.length} autre(s) action(s)
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
