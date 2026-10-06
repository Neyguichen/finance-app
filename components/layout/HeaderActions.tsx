'use client'

import { Bell, CheckSquare2, CircleHelp, Settings, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/components/AppContext'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { useTodos } from '@/lib/hooks/useTodos'
import { localDateISO } from '@/lib/utils'
import { isAdmin } from '@/lib/utils'

export default function HeaderActions() {
  const router = useRouter()
  const { espace, isAdminViewing, userId } = useApp()
  const allowedFamilies = ([
    ['finances', espace?.features?.notification_finances !== false],
    ['actions', espace?.features?.notification_actions !== false],
    ['neyguichen', espace?.features?.notification_neyguichen !== false],
  ] as const).filter(([, enabled]) => enabled).map(([family]) => family)
  const notifications = useNotifications(!isAdminViewing ? espace?.id : undefined, allowedFamilies)
  const todoEnabled = espace?.features?.todo !== false
  const todos = useTodos(!isAdminViewing && todoEnabled ? espace?.id : undefined)
  const today = localDateISO()
  const todoAlertCount = (todos.data || []).filter(item =>
    item.status === 'todo' && !!item.due_date && item.due_date <= today
  ).length

  return (
    <div className="flex shrink-0 items-center gap-1">
      {isAdmin(userId) && !isAdminViewing && (
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="relative rounded-xl p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-white"
          aria-label="Administration"
        >
          <Shield className="h-5 w-5" />
        </button>
      )}

      {!isAdminViewing && todoEnabled && (
        <button
          type="button"
          onClick={() => router.push('/todo')}
          className="relative rounded-xl p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-white"
          aria-label="Todo"
        >
          <CheckSquare2 className="h-5 w-5" />
          {todoAlertCount > 0 && (
            <span className="absolute right-0 top-0 min-w-4 rounded-full bg-amber-500 px-1 text-center text-[10px] font-bold leading-4 text-slate-950">
              {todoAlertCount > 9 ? '9+' : todoAlertCount}
            </span>
          )}
        </button>
      )}

      {!isAdminViewing && (
        <button
          type="button"
          onClick={() => router.push('/notifications')}
          className="relative rounded-xl p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-white"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {notifications.unreadCount > 0 && (
            <span className="absolute right-0 top-0 min-w-4 rounded-full bg-indigo-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
              {notifications.unreadCount > 9 ? '9+' : notifications.unreadCount}
            </span>
          )}
        </button>
      )}

      <button
        type="button"
        onClick={() => router.push('/aide')}
        className="relative rounded-xl p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-white"
        aria-label="Aide et support"
      >
        <CircleHelp className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => router.push('/parametres')}
        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-white"
        aria-label="Paramètres"
      >
        <Settings className="h-5 w-5" />
      </button>
    </div>
  )
}
