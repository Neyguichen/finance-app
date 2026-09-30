'use client'

import { Bell, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/components/AppContext'
import { useNotifications } from '@/lib/hooks/useNotifications'

export default function HeaderActions() {
  const router = useRouter()
  const { espace, isAdminViewing } = useApp()
  const notificationsEnabled = espace?.features?.notifications !== false
  const notifications = useNotifications(
    !isAdminViewing && notificationsEnabled ? espace?.id : undefined
  )

  return (
    <div className="flex shrink-0 items-center gap-1">
      {!isAdminViewing && notificationsEnabled && (
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
        onClick={() => router.push('/parametres')}
        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-white"
        aria-label="Paramètres"
      >
        <Settings className="h-5 w-5" />
      </button>
    </div>
  )
}
