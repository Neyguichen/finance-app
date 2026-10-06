'use client'

import { Bell, CheckSquare2, CircleHelp, MoreVertical, Settings, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/components/AppContext'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { useTodos } from '@/lib/hooks/useTodos'
import { localDateISO } from '@/lib/utils'
import { isAdmin } from '@/lib/utils'

export default function HeaderActions() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    if (!mobileMenuOpen) return
    const close = (event: MouseEvent | TouchEvent) => {
      if (!mobileMenuRef.current?.contains(event.target as Node)) setMobileMenuOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
      document.removeEventListener('keydown', escape)
    }
  }, [mobileMenuOpen])
  const todoAlertCount = (todos.data || []).filter(item =>
    item.status === 'todo' && !!item.due_date && item.due_date <= today
  ).length

  return (
    <div className="flex shrink-0 items-center gap-1">
      {isAdmin(userId) && !isAdminViewing && (
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="relative hidden rounded-xl p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-white sm:block"
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
        className="relative hidden rounded-xl p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-white sm:block"
        aria-label="Aide et support"
      >
        <CircleHelp className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => router.push('/parametres')}
        className="hidden rounded-xl p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-white sm:block"
        aria-label="Paramètres"
      >
        <Settings className="h-5 w-5" />
      </button>

      <div ref={mobileMenuRef} className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(current => !current)}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-white"
          aria-label="Plus d’options"
          aria-expanded={mobileMenuOpen}
        >
          <MoreVertical className="h-5 w-5" />
        </button>
        {mobileMenuOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-800 bg-[#0b1728] p-1.5 shadow-2xl shadow-black/45">
            {isAdmin(userId) && !isAdminViewing && (
              <button type="button" onClick={() => { setMobileMenuOpen(false); router.push('/admin') }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-200 transition hover:bg-slate-800/70">
                <Shield className="h-4 w-4 text-indigo-300" />Administration
              </button>
            )}
            <button type="button" onClick={() => { setMobileMenuOpen(false); router.push('/aide') }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-200 transition hover:bg-slate-800/70">
              <CircleHelp className="h-4 w-4 text-indigo-300" />Aide & Support
            </button>
            <button type="button" onClick={() => { setMobileMenuOpen(false); router.push('/parametres') }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-200 transition hover:bg-slate-800/70">
              <Settings className="h-4 w-4 text-indigo-300" />Paramètres
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
