'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppContext'
import { useDbUsage } from '@/lib/hooks/useDbUsage'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { useTodos } from '@/lib/hooks/useTodos'
import { Bell, Calendar, CheckSquare2, CircleHelp, Database, Handshake, Info, LogOut, Menu, Scale, Settings, Upload, Users, X } from 'lucide-react'
import { isAdmin } from '@/lib/utils'
import { APP_VERSION } from '@/lib/version'

export default function AppMenu() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const { userId, espace, isAdminViewing } = useApp()
  const { data: dbUsage } = useDbUsage()
  const features = {
    import_csv: true,
    todo: true,
    notifications: true,
    ...(espace?.features || {}),
  }
  const notifications = useNotifications(!isAdminViewing && features.notifications ? espace?.id : undefined)
  const todos = useTodos(!isAdminViewing && features.todo ? espace?.id : undefined)
  const pendingTodos = (todos.data || []).filter(item => item.status === 'todo').length

  useEffect(() => {
    setMounted(true)
  }, [])

  const closeMenu = () => {
    setOpen(false)
  }

  const handleLogout = async () => {
    closeMenu()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const portal = (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[9999] bg-black/50"
          onClick={closeMenu}
        />
      )}

      <div
        className={`fixed right-0 top-0 z-[10000] h-full w-72 transform border-l border-slate-800 bg-slate-900 transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <h2 className="text-lg font-semibold">Menu</h2>
          <button
            onClick={closeMenu}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1 p-4">
          {isAdmin(userId) && (
            <MenuLink icon={Users} label="Admin" onClick={() => { closeMenu(); router.push('/admin') }} />
          )}

          <MenuLink icon={Calendar} label="Bilan Annuel" onClick={() => {
            closeMenu()
            router.push('/bilan-annuel')
          }} />

          <MenuLink icon={Handshake} label="Dettes" onClick={() => {
            closeMenu()
            router.push('/dette')
          }} />

          <MenuLink icon={Scale} label="Vérifier le solde" onClick={() => {
            closeMenu()
            router.push('/verification-solde')
          }} />

          {features.import_csv && (
            <MenuLink icon={Upload} label="Importer un CSV" onClick={() => {
              closeMenu()
              router.push('/import-csv')
            }} />
          )}

          {!isAdminViewing && (
            <>
              {features.notifications && (
                <MenuLink
                  icon={Bell}
                  label="Notifications"
                  badge={notifications.unreadCount}
                  onClick={() => {
                    closeMenu()
                    router.push('/notifications')
                  }}
                />
              )}
              {features.todo && (
                <MenuLink
                  icon={CheckSquare2}
                  label="Todo"
                  badge={pendingTodos}
                  onClick={() => {
                    closeMenu()
                    router.push('/todo')
                  }}
                />
              )}
            </>
          )}

          <MenuLink icon={Settings} label="Paramètres" onClick={() => {
            closeMenu()
            router.push('/parametres')
          }} />

          <MenuLink icon={CircleHelp} label="Aide & retours" onClick={() => {
            closeMenu()
            router.push('/aide')
          }} />

          <MenuLink icon={Info} label="À propos" onClick={() => {
            closeMenu()
            router.push('/a-propos')
          }} />

          <MenuLink icon={LogOut} label="Se déconnecter" danger onClick={handleLogout} />
        </div>

        <div className="absolute bottom-6 left-0 right-0 px-4 text-center">
          {dbUsage && (
            <div className="mb-3 space-y-2 rounded-lg bg-slate-800 p-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-300">Base de données</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">
                  {dbUsage.size_mb} Mo / {dbUsage.limit_mb} Mo
                </span>
                <span className={`font-bold ${
                  dbUsage.percent > 80 ? 'text-red-400' :
                  dbUsage.percent > 60 ? 'text-yellow-400' :
                  'text-emerald-400'
                }`}
                >
                  {dbUsage.percent}%
                </span>
              </div>
              <progress
                className={`progress h-2 w-full ${
                  dbUsage.percent > 80 ? 'progress-error' :
                  dbUsage.percent > 60 ? 'progress-warning' :
                  'progress-success'
                }`}
                value={dbUsage.percent}
                max={100}
              />
            </div>
          )}

          <span className="text-xs text-slate-600">Finance App v{APP_VERSION}</span>
        </div>
      </div>
    </>
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        aria-expanded={open}
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
        {!isAdminViewing && features.notifications && notifications.unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-blue-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
            {notifications.unreadCount > 9 ? '9+' : notifications.unreadCount}
          </span>
        )}
      </button>

      {mounted && createPortal(portal, document.body)}
    </>
  )
}

function MenuLink({ icon: Icon, label, onClick, danger, badge }: {
  icon: any
  label: string
  onClick: () => void
  danger?: boolean
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-950'
          : 'text-slate-300 hover:bg-slate-800'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1 text-left">{label}</span>
      {!!badge && badge > 0 && (
        <span className="min-w-5 rounded-full bg-blue-950 px-1.5 py-0.5 text-center text-[10px] font-semibold text-blue-300">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )
}
