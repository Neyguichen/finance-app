'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppContext'
import { useDbUsage } from '@/lib/hooks/useDbUsage'
import { Menu, X, Database, LogOut, Settings, Trash2, Info, RotateCcw, UserX, Handshake } from 'lucide-react'

export default function AppMenu() {
  const [open, setOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const { espace, espaces } = useApp()
  const { data: dbUsage } = useDbUsage()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Bouton hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[60]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer (slide depuis la droite) */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-slate-900 border-l border-slate-800 z-[70] transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header du drawer */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="font-semibold text-lg">Menu</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu du menu */}
        <div className="p-4 space-y-1">

          {/* Autres fonctionnalités */}
          <div className="border-t border-slate-700 pt-3 mt-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-2">Autres fonctionnalités</p>
            <MenuLink icon={Handshake} label="Dettes" onClick={() => {
              setOpen(false)
              router.push('/dette')
            }} />
          </div>

          {/* Section Paramètres */}
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 mt-2">Paramètres</p>

          <MenuLink icon={Settings} label="Gérer les espaces" onClick={() => {
            setOpen(false)
            router.push('/parametres/espaces')
          }} />

          <MenuLink icon={Settings} label="Gérer les catégories" onClick={() => {
            setOpen(false)
            router.push('/parametres/categories')
          }} />

          {/* Section Données */}
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 mt-6">Données</p>

          <MenuLink icon={Trash2} label="Purger les anciens mois" onClick={() => {
            setOpen(false)
            router.push('/parametres/purge')
          }} />

          <MenuLink icon={RotateCcw} label="Réinitialiser les données" onClick={() => {
            setOpen(false)
            router.push('/parametres/reset')
          }} />

          {/* Jauge BDD */}
          {dbUsage && (
            <div className="mt-2 p-3 bg-slate-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-400" />
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
                }`}>
                  {dbUsage.percent}%
                </span>
              </div>
              <progress
                className={`progress w-full h-2 ${
                  dbUsage.percent > 80 ? 'progress-error' :
                  dbUsage.percent > 60 ? 'progress-warning' :
                  'progress-success'
                }`}
                value={dbUsage.percent}
                max={100}
              />
            </div>
          )}

          {/* Section Compte */}
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 mt-6">Compte</p>

          <MenuLink icon={Info} label="À propos" onClick={() => {
            setOpen(false)
            router.push('/parametres/a-propos')
          }} />

          <MenuLink icon={LogOut} label="Se déconnecter" danger onClick={handleLogout} />
        </div>

        {/* Version en bas */}
        <div className="absolute bottom-6 left-0 right-0 text-center">

            <MenuLink icon={UserX} label="Supprimer mon compte" danger onClick={() => {
            setOpen(false)
            router.push('/parametres/delete-account')
            }} />

          <span className="text-xs text-slate-600">Finance App v1.0</span>
        </div>
      </div>
    </>
  )
}

// Composant interne pour les liens du menu
function MenuLink({ icon: Icon, label, onClick, danger }: {
  icon: any
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-950'
          : 'text-slate-300 hover:bg-slate-800'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}