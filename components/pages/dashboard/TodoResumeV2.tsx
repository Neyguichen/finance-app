'use client'

import Link from 'next/link'
import { CheckSquare2, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useApp } from '@/components/AppContext'
import { useTodos } from '@/lib/hooks/useTodos'
import { formatDate } from '@/lib/utils'

export default function TodoResumeV2() {
  const { espace, isAdminViewing } = useApp()
  const todoEnabled = espace?.features?.todo !== false
  const todos = useTodos(!isAdminViewing && todoEnabled ? espace?.id : undefined)
  const pending = (todos.data || []).filter(item => item.status === 'todo')
  const top = pending.slice(0, 3)

  if (!todoEnabled) return null

  return (
    <Card className="nf-card-hover">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-sm text-slate-300">
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
            <Link href="/todo" className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200">
              Voir tout
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isAdminViewing ? (
          <p className="text-sm text-slate-500">Todo personnelle masquée en vue administrateur.</p>
        ) : todos.isLoading ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : top.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/30 p-3">
            <p className="text-sm text-slate-300">Aucune action en attente.</p>
            <Link href="/todo" className="mt-1 inline-flex text-xs text-indigo-300 hover:text-indigo-200">
              Ajouter une action
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {top.map(todo => (
              <div key={todo.id} className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/30 p-2.5">
                <button
                  type="button"
                  aria-label="Marquer comme terminée"
                  className="mt-0.5 h-4 w-4 rounded border border-slate-600 hover:border-emerald-500"
                  onClick={() => todos.toggleTodo.mutate(todo)}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-300">{todo.title}</p>
                  {todo.due_date && <p className="mt-0.5 text-[11px] text-slate-600">Échéance {formatDate(todo.due_date)}</p>}
                </div>
              </div>
            ))}
            {pending.length > top.length && (
              <p className="text-xs text-slate-600">+ {pending.length - top.length} autre(s) action(s)</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
