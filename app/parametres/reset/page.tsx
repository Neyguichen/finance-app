'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, RotateCcw, AlertTriangle } from 'lucide-react'

export default function ResetPage() {
  const supabase = createClient()
  const router = useRouter()
  const { userId } = useApp()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleReset = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { error } = await supabase.rpc('reset_user_data')
      if (error) throw error
      setResult('Toutes les données ont été supprimées.')
      setConfirmOpen(false)
      setConfirmText('')
      // Recharger la page pour réinitialiser le contexte
      setTimeout(() => window.location.href = '/dashboard', 1500)
    } catch (err: any) {
      setResult(`Erreur : ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Réinitialiser les données</h1>
      </div>

      <Card className="bg-red-950/50 border-red-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-300 font-semibold">Zone de danger</p>
              <p className="text-sm text-red-400 mt-1">
                Cette action supprime <strong>toutes</strong> tes données :
              </p>
              <ul className="text-xs text-red-400 mt-2 space-y-1 list-disc list-inside">
                <li>Tous les espaces</li>
                <li>Tous les mois budgétaires</li>
                <li>Tous les revenus et charges fixes</li>
                <li>Toutes les catégories et transactions</li>
                <li>Toutes les enveloppes et mouvements d&apos;épargne</li>
                <li>Tous les modèles récurrents</li>
                <li>Toutes les dettes et leurs remboursements</li>
              </ul>
              <p className="text-xs text-red-500 mt-2">
                Ton compte utilisateur sera conservé. Tu repartiras de zéro.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full bg-red-600 hover:bg-red-700 text-white"
        onClick={() => setConfirmOpen(true)}
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Réinitialiser toutes les données
      </Button>

      {result && (
        <p className={`text-sm text-center ${result.startsWith('Erreur') ? 'text-red-400' : 'text-emerald-400'}`}>
          {result}
        </p>
      )}

      {/* Dialog de confirmation avec saisie */}
      <Dialog open={confirmOpen} onOpenChange={v => { setConfirmOpen(v); setConfirmText('') }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>🚨 Confirmation requise</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-300">
            Pour confirmer, tape <strong className="text-red-400">REINITIALISER</strong> ci-dessous :
          </p>
          <Input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="REINITIALISER"
            className="mt-2"
          />
          <div className="space-y-2 mt-4">
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={loading || confirmText !== 'REINITIALISER'}
              onClick={handleReset}
            >
              {loading ? 'Suppression en cours...' : 'Confirmer la réinitialisation'}
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