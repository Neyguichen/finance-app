'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useIsAdmin } from '@/lib/hooks/useIsAdmin'
import { useApp } from '@/components/AppContext'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const supabase = createClient()
  const isAdmin = useIsAdmin()
  const router = useRouter()
  const { setAdminViewUserId, setAdminViewEspaceId } = useApp()

  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [espaces, setEspaces] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    supabase.rpc('admin_list_users').then(({ data }) => {
      if (data) setUsers(data)
    })
  }, [isAdmin])

  useEffect(() => {
    if (!selectedUser) { setEspaces([]); return }
    supabase.rpc('admin_list_espaces', { target_user_id: selectedUser })
      .then(({ data }) => { if (data) setEspaces(data) })
  }, [selectedUser])

  const viewEspace = (espaceId: string) => {
    setAdminViewUserId(selectedUser)
    setAdminViewEspaceId(espaceId)
    router.push('/dashboard')
  }

  if (!isAdmin) return <p className="p-4 text-red-400">Accès refusé</p>

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-amber-300">🔧 Admin — Voir en tant que</h1>

      <select className="select select-bordered w-full bg-slate-800 border-slate-700"
        value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
        <option value="">Sélectionner un utilisateur...</option>
        {users.map(u => (
          <option key={u.id} value={u.id}>{u.email}</option>
        ))}
      </select>

      {espaces.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-slate-400">Espaces :</p>
          {espaces.map(e => (
            <button key={e.id} onClick={() => viewEspace(e.id)}
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-left hover:border-amber-500 transition">
              <span className="mr-2">{e.icone}</span> {e.nom}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}