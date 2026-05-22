'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Eye, Receipt } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { isAdmin } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

import { useApp } from '@/components/AppContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type UserRow = { id: string; email: string; created_at: string }
type EspaceRow = { id: string; nom: string; icone: string }

export default function AdminPage() {
  const router = useRouter()
  const { userId, setAdminViewUserId, setAdminViewEspaceId } = useApp()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  // Étape 2 : sélection d'espace
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [espaces, setEspaces] = useState<EspaceRow[]>([])
  const [loadingEspaces, setLoadingEspaces] = useState(false)

  useEffect(() => {
    if (!isAdmin(userId)) return
    const supabase = createClient()
    supabase.rpc('get_all_users').then(({ data, error }) => {
      if (error) {
        console.error('Erreur get_all_users:', error)
        setUsers([])
      } else {
        setUsers(
          (data || []).map((u: Record<string, string>) => ({
            id: u.id,
            email: u.email || u.id,
            created_at: u.created_at || '',
          }))
        )
      }
      setLoading(false)
    })
  }, [userId])

  // Protection admin
  if (!isAdmin(userId)) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400 font-semibold">⛔ Accès refusé</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push('/')}>
          Retour
        </Button>
      </div>
    )
  }

  // Charger les espaces quand un user est sélectionné
  const handleSelectUser = async (user: UserRow) => {
    setSelectedUser(user)
    setLoadingEspaces(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('espaces')
      .select('id, nom, icone')
      .eq('user_id', user.id)
      .order('ordre')
    setEspaces(data || [])
    setLoadingEspaces(false)
  }

  const handleViewEspace = (espaceId: string) => {
    if (!selectedUser) return
    setAdminViewUserId(selectedUser.id)
    setAdminViewEspaceId(espaceId)
    router.push('/')
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => {
          if (selectedUser) { setSelectedUser(null); setEspaces([]) }
          else router.push('/')
        }}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">
          {selectedUser ? `👤 ${selectedUser.email}` : '🔒 Administration'}
        </h1>
      </div>

      {/* Outils admin (uniquement si pas en sélection d'espace) */}
      {!selectedUser && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 mb-2">Outils admin</h2>
          <Card
            className="bg-slate-900 border-slate-800 cursor-pointer hover:bg-slate-800 transition"
            onClick={() => router.push('/admin/remboursements-alsh')}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <Receipt className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="font-medium">Remboursements ALSH</p>
                <p className="text-xs text-slate-500">Gérer les remboursements des familles</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Espaces du user sélectionné */}
      {selectedUser ? (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 mb-2">Espaces de {selectedUser.email}</h2>
          {loadingEspaces ? (
            <p className="text-sm text-slate-500">Chargement...</p>
          ) : espaces.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun espace trouvé</p>
          ) : (
            <div className="space-y-2">
              {espaces.map((esp) => (
                <Card key={esp.id} className="bg-slate-900 border-slate-800 cursor-pointer hover:bg-slate-800 transition"
                  onClick={() => handleViewEspace(esp.id)}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{esp.icone}</span>
                      <p className="font-medium">{esp.nom}</p>
                    </div>
                    <Eye className="w-4 h-4 text-slate-500" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Liste des utilisateurs */
        <div>
          <h2 className="text-sm font-semibold text-slate-400 mb-2">Utilisateurs</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Chargement...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun utilisateur trouvé</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <Card key={u.id} className="bg-slate-900 border-slate-800">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{u.email}</p>
                      <p className="text-xs text-slate-500 font-mono">{u.id.slice(0, 8)}...</p>
                      <p className="text-xs text-slate-500">
                        {u.id === userId ? '(Toi)' : 'Utilisateur'}
                      </p>
                    </div>
                    {u.id !== userId && (
                      <Button size="sm" variant="outline" className="gap-1.5"
                        onClick={() => handleSelectUser(u)}>
                        <Eye className="w-3.5 h-3.5" />
                        Voir comme
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}