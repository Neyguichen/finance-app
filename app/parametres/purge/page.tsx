'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react'
import { format, subMonths, startOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

const PERIODS = [
  { label: 'Plus de 3 mois', months: 3 },
  { label: 'Plus de 6 mois', months: 6 },
  { label: 'Plus de 1 an', months: 12 },
  { label: 'Plus de 2 ans', months: 24 },
]

export default function PurgePage() {
  const supabase = createClient()
  const router = useRouter()
  const { userId } = useApp()
  const [selected, setSelected] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const cutoffDate = selected !== null
    ? format(startOfMonth(subMonths(new Date(), selected)), 'yyyy-MM-dd')
    : null

  const cutoffLabel = selected !== null
    ? format(startOfMonth(subMonths(new Date(), selected)), 'MMMM yyyy', { locale: fr })
    : ''

  const handlePurge = async () => {
    if (!cutoffDate || !userId) return
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('purge_old_months', {
        before_date: cutoffDate,
      })
      if (error) throw error
      setResult(`${data} mois supprimé(s) avec succès.`)
      setConfirmOpen(false)
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
        <h1 className="text-xl font-bold">Purger les anciens mois</h1>
      </div>

      <p className="text-sm text-slate-400">
        Supprime les mois budgétaires anciens et toutes leurs données associées
        (revenus, charges, transactions, mouvements d&apos;épargne).
        Les dettes archivées dont la date d&apos;échéance est dépassée seront aussi supprimées.
        Les modèles récurrents et les enveloppes sont conservés.
      </p>

      <div className="space-y-2">
        <label className="text-sm text-slate-400 block">Supprimer les mois antérieurs à :</label>
        <div className="grid grid-cols-2 gap-2">
          {PERIODS.map(p => (
            <button
              key={p.months}
              onClick={() => setSelected(p.months)}
              className={`py-3 px-4 rounded-xl text-sm font-medium transition-colors border ${
                selected === p.months
                  ? 'bg-red-600/20 border-red-500 text-red-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {selected !== null && (
        <Card className="bg-yellow-950/50 border-yellow-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-300">
                  Tous les mois <strong>avant {cutoffLabel}</strong> seront
                  définitivement supprimés avec leurs revenus, charges, transactions
                  et mouvements d&apos;épargne. Les dettes archivées dont la date d&apos;échéance
                  est antérieure à cette date seront aussi supprimées.
                </p>
                <p className="text-xs text-yellow-600 mt-1">Cette action est irréversible.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        className="w-full bg-red-600 hover:bg-red-700 text-white"
        disabled={selected === null}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Purger
      </Button>

      {result && (
        <p className={`text-sm text-center ${result.startsWith('Erreur') ? 'text-red-400' : 'text-emerald-400'}`}>
          {result}
        </p>
      )}

      {/* Dialog de confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>⚠️ Confirmer la purge</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-300">
            Tu es sur le point de supprimer tous les mois antérieurs à <strong>{cutoffLabel}</strong>.
            Cette action est <strong>irréversible</strong>.
          </p>
          <div className="space-y-2 mt-4">
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
              onClick={handlePurge}
            >
              {loading ? 'Suppression...' : 'Confirmer la purge'}
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}