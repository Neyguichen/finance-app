'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle, UserX } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  userId: string | undefined
}

export default function CompteSection({ userId }: Props) {
  const supabase = createClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDeleteAccount = async () => {
    if (!userId || confirmText !== 'SUPPRIMER') return
    setLoading(true)
    setError(null)
    try {
      const { error: rpcError } = await supabase.rpc('delete_user_account')
      if (rpcError) throw rpcError
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-red-950/30 border border-red-900 rounded-lg p-3 space-y-2">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-300 font-semibold">Action définitive</p>
            <p className="text-sm text-red-400 mt-1">
              Cette action supprime <strong>définitivement</strong> :
            </p>
            <ul className="text-xs text-red-400 mt-2 space-y-1 list-disc list-inside">
              <li>Toutes tes données (espaces, mois, revenus, charges, transactions, épargne…)</li>
              <li>Toutes tes dettes et leurs remboursements</li>
              <li>Ton compte utilisateur</li>
            </ul>
            <p className="text-xs text-red-500 mt-2 font-semibold">
              Tu ne pourras plus te reconnecter avec cette adresse email.
            </p>
          </div>
        </div>
      </div>

      <Button className="w-full bg-red-600 hover:bg-red-700 text-white mt-3" onClick={() => setConfirmOpen(true)}>
        <UserX className="w-4 h-4 mr-2" />
        Supprimer mon compte
      </Button>

      {error && <p className="text-sm text-center text-red-400 mt-2">Erreur : {error}</p>}

      <Dialog open={confirmOpen} onOpenChange={v => { setConfirmOpen(v); setConfirmText('') }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader><DialogTitle>🚨 Supprimer définitivement ?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-300">
            Pour confirmer la suppression de ton compte et de toutes tes données,
            tape <strong className="text-red-400">SUPPRIMER</strong> ci-dessous :
          </p>
          <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="SUPPRIMER" className="mt-2" />
          <div className="space-y-2 mt-4">
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={loading || confirmText !== 'SUPPRIMER'}
              onClick={handleDeleteAccount}>
              {loading ? 'Suppression en cours...' : 'Supprimer définitivement'}
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => { setConfirmOpen(false); setConfirmText('') }}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}