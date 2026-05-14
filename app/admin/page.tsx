'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppContext'
import { isAdmin } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Eye, Receipt } from 'lucide-react'

type UserRow = {
  id: string
  email: string
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const { userId, enterAdminView } = useApp()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

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

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('espaces')
      .select('user_id')
      .then(({ data }) => {
        // Récupère les user_ids uniques depuis les espaces
        const uniqueIds = [...new Set((data || []).map((e: any) => e.user_id))]
        // Pour chaque user_id, on récupère l'email depuis auth (via une table profil ou espaces)
        // Simplification : on liste les user_ids avec leur premier espace
        const userRows: UserRow[] = uniqueIds.map((uid: any) => ({
          id: uid,
          email: uid, // On affichera l'ID — voir note ci-dessous
          created_at: '',
        }))
        setUsers(userRows)
        setLoading(false)
      })
      .then(() => setLoading(false), () => setLoading(false))
  }, [])

  const handleViewAs = (targetUserId: string) => {
    enterAdminView(targetUserId)
    router.push('/')
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">🔒 Administration</h1>
      </div>

      {/* Liens admin */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 mb-2">Outils admin</h2>
        <Card className="bg-slate-900 border-slate-800 cursor-pointer hover:bg-slate-800 transition"
          onClick={() => router.push('/admin/remboursements-alsh')}>
          <CardContent className="p-3 flex items-center gap-3">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="font-medium">Remboursements ALSH</p>
              <p className="text-xs text-slate-500">Gérer les remboursements des familles</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des utilisateurs */}
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
                    <p className="text-sm font-medium font-mono">{u.id.slice(0, 8)}...</p>
                    <p className="text-xs text-slate-500">
                      {u.id === userId ? '(Toi)' : 'Utilisateur'}
                    </p>
                  </div>
                  {u.id !== userId && (
                    <Button size="sm" variant="outline" className="gap-1.5"
                      onClick={() => handleViewAs(u.id)}>
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
    </div>
  )
}