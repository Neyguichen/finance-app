'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trash2, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  espaceId: string | undefined
  espaceNom: string | undefined
}

export default function DonneesSection({ espaceId, espaceNom }: Props) {
  const supabase = createClient()

  const [purgeConfirm, setPurgeConfirm] = useState(false)
  const [purgeMonths, setPurgeMonths] = useState(6)
  const [purging, setPurging] = useState(false)
  const [purgeResult, setPurgeResult] = useState<string | null>(null)

  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetText, setResetText] = useState('')
  const [resetting, setResetting] = useState(false)

  const handlePurge = async () => {
    if (!espaceId) return
    setPurging(true)
    try {
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - purgeMonths)
      const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-01`

      const { data: oldMois } = await supabase
        .from('mois').select('id').eq('espace_id', espaceId).lt('mois', cutoffStr)

      if (!oldMois || oldMois.length === 0) {
        setPurgeResult('Aucun mois à purger.')
        return
      }

      const ids = oldMois.map(m => m.id)
      await Promise.all([
        supabase.from('revenus').delete().in('mois_id', ids),
        supabase.from('charges_fixes').delete().in('mois_id', ids),
        supabase.from('transactions').delete().in('mois_id', ids),
        supabase.from('mouvements_epargne').delete().in('mois_id', ids),
        supabase.from('budgets').delete().in('mois_id', ids),
      ])
      await supabase.from('mois').delete().in('id', ids)

      setPurgeResult(`${oldMois.length} mois purgé(s) avec succès.`)
      setPurgeConfirm(false)
    } catch (err) {
      setPurgeResult('Erreur lors de la purge.')
    } finally {
      setPurging(false)
    }
  }

  const handleReset = async () => {
    if (!espaceId || resetText !== 'REINITIALISER') return
    setResetting(true)
    try {
      const { data: allMois } = await supabase
        .from('mois').select('id').eq('espace_id', espaceId)
      if (allMois && allMois.length > 0) {
        const ids = allMois.map(m => m.id)
        await Promise.all([
          supabase.from('revenus').delete().in('mois_id', ids),
          supabase.from('charges_fixes').delete().in('mois_id', ids),
          supabase.from('transactions').delete().in('mois_id', ids),
          supabase.from('mouvements_epargne').delete().in('mois_id', ids),
          supabase.from('budgets').delete().in('mois_id', ids),
        ])
        await supabase.from('mois').delete().in('id', ids)
      }
      await supabase.from('categories').delete().eq('espace_id', espaceId)
      setResetConfirm(false)
      setResetText('')
      alert('Données réinitialisées avec succès.')
      window.location.reload()
    } catch (err) {
      alert('Erreur lors de la réinitialisation.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Purge */}
        <div className="bg-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold">Purger les anciens mois</span>
          </div>
          <p className="text-xs text-slate-500">Supprime les mois plus vieux que la période choisie.</p>
          <div className="flex gap-2">
            <select
              className="select select-sm bg-slate-700 border-slate-600 flex-1"
              value={purgeMonths}
              onChange={e => setPurgeMonths(Number(e.target.value))}
            >
              <option value={3}>3 mois</option>
              <option value={6}>6 mois</option>
              <option value={12}>12 mois</option>
              <option value={24}>24 mois</option>
            </select>
            <Button size="sm" variant="outline" className="text-orange-400 border-orange-800" onClick={() => setPurgeConfirm(true)}>
              Purger
            </Button>
          </div>
          {purgeResult && <p className="text-xs text-emerald-400">{purgeResult}</p>}
        </div>

        {/* Réinitialiser */}
        <div className="bg-red-950/30 border border-red-900 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">Réinitialiser les données</span>
          </div>
          <p className="text-xs text-slate-500">Supprime toutes les données de l&apos;espace <strong>{espaceNom}</strong> (mois, revenus, charges, dépenses, catégories). Cette action est irréversible.</p>
          <Button size="sm" variant="outline" className="text-red-400 border-red-800" onClick={() => setResetConfirm(true)}>
            Réinitialiser
          </Button>
        </div>
      </div>

      {/* Dialog purge */}
      <Dialog open={purgeConfirm} onOpenChange={setPurgeConfirm}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader><DialogTitle>Confirmer la purge</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-400">Les mois de plus de {purgeMonths} mois seront supprimés définitivement avec toutes leurs données.</p>
          <div className="space-y-3 mt-2">
            <Button className="w-full bg-orange-600 hover:bg-orange-700" onClick={handlePurge} disabled={purging}>
              {purging ? 'Purge en cours...' : 'Confirmer la purge'}
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => setPurgeConfirm(false)}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog réinitialisation */}
      <Dialog open={resetConfirm} onOpenChange={v => { if (!v) { setResetConfirm(false); setResetText('') } }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader><DialogTitle>⚠️ Réinitialiser les données</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-400">Tapez <strong className="text-red-400">REINITIALISER</strong> pour confirmer.</p>
          <Input value={resetText} onChange={e => setResetText(e.target.value)} placeholder="REINITIALISER" />
          <div className="space-y-3 mt-2">
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleReset}
              disabled={resetting || resetText !== 'REINITIALISER'}>
              {resetting ? 'Réinitialisation...' : 'Confirmer'}
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => { setResetConfirm(false); setResetText('') }}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}