'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, UserX, AlertTriangle } from 'lucide-react'

export default function DeleteAccountPage() {
  const supabase = createClient()
  const router = useRouter()
  const { userId } = useApp()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDeleteAccount = async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const { error: rpcError } = await supabase.rpc('delete_user_account')
      if (rpcError) throw rpcError
      // Le user est supprimé côté serveur, on déconnecte côté client
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Supprimer mon compte</h1>
      </div>

      <Card className="bg-red-950/50 border-red-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-300 font-semibold">Action définitive</p>
              <p className="text-sm text-red-400 mt-1">
                Cette action supprime <strong>définitivement</strong> :
              </p>
              <ul className="text-xs text-red-400 mt-2 space-y-1 list-disc list-inside">
                <li>Toutes tes données (espaces, mois, revenus, charges, transactions, épargne…)</li>
                <li>Ton compte utilisateur</li>
              </ul>
              <p className="text-xs text-red-500 mt-2 font-semibold">
                Tu ne pourras plus te reconnecter avec cette adresse email.
                Il faudra recréer un compte de zéro.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full bg-red-600 hover:bg-red-700 text-white"
        onClick={() => setConfirmOpen(true)}
      >
        <UserX className="w-4 h-4 mr-2" />
        Supprimer mon compte
      </Button>

      {error && (
        <p className="text-sm text-center text-red-400">Erreur : {error}</p>
      )}

      {/* Dialog de confirmation avec saisie */}
      <Dialog open={confirmOpen} onOpenChange={v => { setConfirmOpen(v); setConfirmText('') }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>🚨 Supprimer définitivement ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-300">
            Pour confirmer la suppression de ton compte et de toutes tes données,
            tape <strong className="text-red-400">SUPPRIMER</strong> ci-dessous :
          </p>
          <Input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="SUPPRIMER"
            className="mt-2"
          />
          <div className="space-y-2 mt-4">
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={loading || confirmText !== 'SUPPRIMER'}
              onClick={handleDeleteAccount}
            >
              {loading ? 'Suppression en cours...' : 'Supprimer définitivement'}
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => { setConfirmOpen(false); setConfirmText('') }}>
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}