'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Archive, Bell, CheckCheck, ExternalLink, ListTodo } from 'lucide-react'
import { useApp } from '@/components/AppContext'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { useTodos } from '@/lib/hooks/useTodos'

const familyLabels = {
  finances: 'Finances',
  actions: 'Actions',
  neyguichen: 'Neyguichen',
} as const

export default function NotificationsPage() {
  const { espace, isAdminViewing } = useApp()
  const notificationsEnabled = espace?.features?.notifications !== false
  const todoEnabled = espace?.features?.todo !== false
  const notifications = useNotifications(notificationsEnabled ? espace?.id : undefined)
  const todos = useTodos(todoEnabled ? espace?.id : undefined)
  const [family, setFamily] = useState<'all' | 'finances' | 'actions' | 'neyguichen'>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)

  const items = useMemo(() => {
    return (notifications.data || []).filter(item => {
      if (family !== 'all' && item.family !== family) return false
      if (unreadOnly && item.read_at) return false
      return true
    })
  }, [notifications.data, family, unreadOnly])

  if (isAdminViewing) {
    return <div className="p-4 text-sm text-slate-400">Les notifications sont désactivées en vue administrateur.</div>
  }

  if (!notificationsEnabled) {
    return <div className="p-4 text-sm text-slate-400">Les notifications sont désactivées pour ce Budget. Tu peux les réactiver dans Paramètres → Fonctionnalités du Budget.</div>
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-3 pb-24 sm:p-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-400">Phase 9 · Centre interne</p>
          <h1 className="mt-1 text-2xl font-bold">Notifications</h1>
          <p className="mt-2 text-sm text-slate-400">
            Les alertes restent séparées des opérations financières. Elles peuvent t&apos;orienter vers une action ou alimenter ta Todo.
          </p>
        </div>

        {notifications.unreadCount > 0 && (
          <button
            type="button"
            onClick={() => notifications.markAllRead.mutate()}
            className="btn btn-outline btn-sm"
            disabled={notifications.markAllRead.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            Tout marquer lu
          </button>
        )}
      </header>

      <div className="grid gap-2 sm:grid-cols-3">
        <Summary label="Non lues" value={notifications.unreadCount} />
        <Summary label="Actives" value={items.length} />
        <Summary label="Actions liées" value={items.filter(item => item.action_href).length} />
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1">
            {([
              ['all', 'Toutes'],
              ['finances', 'Finances'],
              ['actions', 'Actions'],
              ['neyguichen', 'Neyguichen'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFamily(value)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  family === value
                    ? 'border-blue-700 bg-blue-950/50 text-blue-300'
                    : 'border-slate-700 text-slate-500 hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              className="checkbox checkbox-xs"
              checked={unreadOnly}
              onChange={event => setUnreadOnly(event.target.checked)}
            />
            Non lues uniquement
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="space-y-2">
          {notifications.isLoading ? (
            <p className="text-sm text-slate-500">Chargement…</p>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/30 p-5 text-center">
              <Bell className="mx-auto h-6 w-6 text-slate-600" />
              <p className="mt-2 text-sm text-slate-400">Aucune notification active.</p>
            </div>
          ) : items.map(item => (
            <article
              key={item.id}
              className={`rounded-lg border p-3 ${
                item.read_at
                  ? 'border-slate-800 bg-slate-950/30'
                  : 'border-blue-900/70 bg-blue-950/20'
              }`}
              onClick={() => {
                if (!item.read_at) notifications.markRead.mutate(item.id)
              }}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] ${
                  item.family === 'finances'
                    ? 'bg-emerald-950 text-emerald-300'
                    : item.family === 'actions'
                      ? 'bg-amber-950 text-amber-300'
                      : 'bg-blue-950 text-blue-300'
                }`}>
                  {familyLabels[item.family]}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words font-medium text-slate-200">{item.title}</h2>
                    {!item.read_at && <span className="h-2 w-2 rounded-full bg-blue-400" aria-label="Non lue" />}
                  </div>
                  {item.message && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-500">{item.message}</p>}
                  <p className="mt-2 text-[11px] text-slate-600">
                    {new Date(item.created_at).toLocaleString('fr-FR')}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.action_href && (
                      <Link
                        href={item.action_href}
                        className="btn btn-outline btn-xs"
                        onClick={() => {
                          if (!item.read_at) notifications.markRead.mutate(item.id)
                        }}
                      >
                        {item.action_label || 'Ouvrir'}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}

                    {todoEnabled && (() => {
                      const linkedTodo = (todos.data || []).find(todo =>
                        todo.object_type === 'notification' && todo.object_id === item.id
                      )
                      return (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={event => {
                            event.stopPropagation()
                            if (linkedTodo) return
                            todos.createTodo.mutate({
                              title: item.title,
                              note: item.message,
                              link_label: item.action_label || (item.action_href ? 'Ouvrir' : null),
                              link_href: item.action_href,
                              object_type: 'notification',
                              object_id: item.id,
                            })
                          }}
                          disabled={todos.createTodo.isPending || !!linkedTodo}
                        >
                          <ListTodo className="h-3.5 w-3.5" />
                          {linkedTodo ? 'Dans la Todo' : 'Ajouter à la Todo'}
                        </button>
                      )
                    })()}
                  </div>
                </div>

                <button
                  type="button"
                  className="rounded-md p-1 text-slate-600 hover:bg-slate-800 hover:text-slate-300"
                  onClick={event => {
                    event.stopPropagation()
                    notifications.archive.mutate(item.id)
                  }}
                  aria-label="Archiver"
                >
                  <Archive className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  )
}
