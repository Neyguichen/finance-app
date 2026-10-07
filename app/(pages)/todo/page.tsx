'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CalendarDays, Check, CheckSquare2, ExternalLink, Plus, RotateCcw, Save, Trash2, Users, X } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { useApp } from '@/components/AppContext'
import { useTodos, type TodoItem } from '@/lib/hooks/useTodos'
import { formatDate } from '@/lib/utils'

export default function TodoPage() {
  const { espace, espaces, isAdminViewing, userId } = useApp()
  const enabled = espace?.features?.todo !== false
  const model = useTodos(enabled && !isAdminViewing ? userId ?? undefined : undefined)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [shareEspaceId, setShareEspaceId] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editShareEspaceId, setEditShareEspaceId] = useState('')

  const pending = useMemo(
    () => (model.data || []).filter(item => item.status === 'todo'),
    [model.data]
  )
  const done = useMemo(
    () => (model.data || []).filter(item => item.status === 'done'),
    [model.data]
  )

  const submit = async () => {
    if (!title.trim()) return
    await model.createTodo.mutateAsync({
      title: title.trim(),
      due_date: dueDate || null,
      note: note.trim() || null,
      espace_id: shareEspaceId || null,
    })
    setTitle('')
    setDueDate('')
    setNote('')
    setShareEspaceId('')
  }

  const startEdit = (todo: TodoItem) => {
    if (todo.owner_user_id !== userId) return
    setEditingId(todo.id)
    setEditTitle(todo.title)
    setEditDueDate(todo.due_date || '')
    setEditNote(todo.note || '')
    setEditShareEspaceId(todo.espace_id || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditDueDate('')
    setEditNote('')
    setEditShareEspaceId('')
  }

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return
    await model.updateTodo.mutateAsync({
      id: editingId,
      title: editTitle.trim(),
      due_date: editDueDate || null,
      note: editNote.trim() || null,
      espace_id: editShareEspaceId || null,
    })
    cancelEdit()
  }

  const shareLabel = (todo: TodoItem) => {
    if (!todo.espace_id) return null
    return espaces.find(item => item.id === todo.espace_id)?.nom || 'Budget partagé'
  }

  const editForm = (todo: TodoItem) => (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <input
          className="input input-bordered w-full bg-slate-950"
          value={editTitle}
          onChange={event => setEditTitle(event.target.value)}
          placeholder="Titre de la tâche"
          autoFocus
        />
        <input
          type="date"
          className="input input-bordered w-full bg-slate-950"
          value={editDueDate}
          onChange={event => setEditDueDate(event.target.value)}
        />
      </div>
      <textarea
        className="textarea textarea-bordered w-full bg-slate-950"
        placeholder="Note facultative"
        rows={2}
        value={editNote}
        onChange={event => setEditNote(event.target.value)}
      />
      <label className="block">
        <span className="mb-1 block text-xs text-slate-500">Visibilité</span>
        <select
          className="select select-bordered w-full bg-slate-950"
          value={editShareEspaceId}
          onChange={event => setEditShareEspaceId(event.target.value)}
        >
          <option value="">Personnelle — visible uniquement par moi</option>
          {espaces.map(item => (
            <option key={item.id} value={item.id}>Partagée avec le Budget « {item.nom} »</option>
          ))}
        </select>
      </label>
      {todo.link_href && (
        <Link href={todo.link_href} className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
          {todo.link_label || 'Ouvrir l’élément lié'}
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit}>
          <X className="h-4 w-4" />
          Annuler
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={saveEdit}
          disabled={!editTitle.trim() || model.updateTodo.isPending}
        >
          <Save className="h-4 w-4" />
          Enregistrer
        </button>
      </div>
    </div>
  )

  if (isAdminViewing) {
    return <div className="p-4 text-sm text-slate-400">La Todo est désactivée en vue administrateur.</div>
  }

  if (!enabled) {
    return <div className="p-4 text-sm text-slate-400">La Todo est désactivée pour ce Budget. Tu peux la réactiver dans Paramètres → Fonctionnalités du Budget.</div>
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-3 pb-24 sm:p-4">
      <PageHeader
        eyebrow="Actions"
        title="Todo"
        description="Tes tâches personnelles te suivent dans tous tes Budgets. Tu peux choisir d’en partager certaines avec un Budget."
        icon={CheckSquare2}
      />

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="font-semibold">Ajouter une action</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px]">
          <input
            className="input input-bordered w-full bg-slate-950"
            placeholder="Ex. Vérifier la facture EDF"
            value={title}
            onChange={event => setTitle(event.target.value)}
          />
          <input
            type="date"
            className="input input-bordered w-full bg-slate-950"
            value={dueDate}
            onChange={event => setDueDate(event.target.value)}
          />
        </div>
        <textarea
          className="textarea textarea-bordered mt-3 w-full bg-slate-950"
          placeholder="Note facultative"
          rows={2}
          value={note}
          onChange={event => setNote(event.target.value)}
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Visibilité</span>
            <select
              className="select select-bordered w-full bg-slate-950"
              value={shareEspaceId}
              onChange={event => setShareEspaceId(event.target.value)}
            >
              <option value="">Personnelle — visible uniquement par moi</option>
              {espaces.map(item => (
                <option key={item.id} value={item.id}>Partagée avec le Budget « {item.nom} »</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-primary btn-sm w-full sm:w-auto"
            onClick={submit}
            disabled={!title.trim() || model.createTodo.isPending}
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">À faire</h2>
            <p className="text-xs text-slate-500">{pending.length} action(s) en attente</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {pending.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/30 p-4 text-sm text-slate-500">
              Aucune action en attente.
            </div>
          ) : pending.map(todo => {
            const owned = todo.owner_user_id === userId
            const sharedWith = shareLabel(todo)
            return (
              <div key={todo.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                {editingId === todo.id ? editForm(todo) : (
                  <div className="flex items-start gap-3">
                    {owned ? (
                      <button
                        type="button"
                        className="mt-0.5 rounded-md border border-slate-700 p-1 text-slate-400 hover:border-emerald-700 hover:text-emerald-400"
                        onClick={() => model.toggleTodo.mutate(todo)}
                        aria-label="Marquer comme terminée"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    ) : <span className="mt-0.5 h-7 w-7 shrink-0" />}

                    <div
                      className={'min-w-0 flex-1 ' + (owned ? 'cursor-pointer' : '')}
                      onClick={() => startEdit(todo)}
                      role={owned ? 'button' : undefined}
                      tabIndex={owned ? 0 : undefined}
                    >
                      <p className="break-words font-medium text-slate-200">{todo.title}</p>
                      {todo.note && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-500">{todo.note}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {todo.due_date && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatDate(todo.due_date)}
                          </span>
                        )}
                        {sharedWith && (
                          <span className="inline-flex items-center gap-1 text-indigo-300">
                            <Users className="h-3.5 w-3.5" />
                            {sharedWith}
                          </span>
                        )}
                        {!owned && <span className="text-slate-600">Lecture seule</span>}
                        {todo.link_href && (
                          <Link href={todo.link_href} className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300" onClick={event => event.stopPropagation()}>
                            {todo.link_label || 'Ouvrir'}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>

                    {owned && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Supprimer cette action ?')) model.deleteTodo.mutate(todo.id)
                          }}
                          className="rounded-md p-1 text-slate-600 hover:bg-red-950/40 hover:text-red-400"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={() => setShowDone(value => !value)}
        >
          <div className="flex items-center gap-2">
            <CheckSquare2 className="h-4 w-4 text-emerald-400" />
            <span className="font-semibold">Terminées</span>
          </div>
          <span className="text-xs text-slate-500">{done.length}</span>
        </button>

        {showDone && (
          <div className="mt-4 space-y-2">
            {done.length === 0 ? (
              <p className="text-sm text-slate-600">Aucune action terminée.</p>
            ) : done.map(todo => {
              const owned = todo.owner_user_id === userId
              const sharedWith = shareLabel(todo)
              return (
                <div key={todo.id} className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                  {editingId === todo.id ? editForm(todo) : (
                    <div className="flex items-center gap-3">
                      {owned ? (
                        <button
                          type="button"
                          onClick={() => model.toggleTodo.mutate(todo)}
                          className="rounded-md p-1 text-emerald-400 hover:bg-slate-800"
                          aria-label="Remettre à faire"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      ) : <span className="h-6 w-6 shrink-0" />}
                      <div className={'min-w-0 flex-1 ' + (owned ? 'cursor-pointer' : '')} onClick={() => startEdit(todo)} role={owned ? 'button' : undefined} tabIndex={owned ? 0 : undefined}>
                        <p className="break-words text-sm text-slate-500 line-through">{todo.title}</p>
                        {todo.note && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-600">{todo.note}</p>}
                        {sharedWith && <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-indigo-400"><Users className="h-3 w-3" />{sharedWith}</p>}
                      </div>
                      {owned && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Supprimer cette action ?')) model.deleteTodo.mutate(todo.id)
                            }}
                            className="rounded-md p-1 text-slate-600 hover:text-red-400"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
