'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CalendarDays, Check, CheckSquare2, ExternalLink, Plus, RotateCcw, Trash2 } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { useApp } from '@/components/AppContext'
import { useTodos } from '@/lib/hooks/useTodos'
import { formatDate } from '@/lib/utils'

export default function TodoPage() {
  const { espace, isAdminViewing } = useApp()
  const enabled = espace?.features?.todo !== false
  const model = useTodos(enabled ? espace?.id : undefined)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [showDone, setShowDone] = useState(false)

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
    })
    setTitle('')
    setDueDate('')
    setNote('')
  }

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
        description="Garde les actions financières à traiter sans les transformer en opérations comptables."
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
        <div className="mt-3 flex justify-stretch sm:justify-end">
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
          ) : pending.map(todo => (
            <div key={todo.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  className="mt-0.5 rounded-md border border-slate-700 p-1 text-slate-400 hover:border-emerald-700 hover:text-emerald-400"
                  onClick={() => model.toggleTodo.mutate(todo)}
                  aria-label="Marquer comme terminée"
                >
                  <Check className="h-4 w-4" />
                </button>

                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium text-slate-200">{todo.title}</p>
                  {todo.note && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-500">{todo.note}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {todo.due_date && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(todo.due_date)}
                      </span>
                    )}
                    {todo.link_href && (
                      <Link href={todo.link_href} className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">
                        {todo.link_label || 'Ouvrir'}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>

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
            </div>
          ))}
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
            ) : done.map(todo => (
              <div key={todo.id} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                <button
                  type="button"
                  onClick={() => model.toggleTodo.mutate(todo)}
                  className="rounded-md p-1 text-emerald-400 hover:bg-slate-800"
                  aria-label="Remettre à faire"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <p className="flex-1 text-sm text-slate-500 line-through">{todo.title}</p>
                <button
                  type="button"
                  onClick={() => model.deleteTodo.mutate(todo.id)}
                  className="rounded-md p-1 text-slate-600 hover:text-red-400"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
