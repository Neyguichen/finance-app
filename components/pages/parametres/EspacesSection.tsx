'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { Pencil, Trash2, ChevronUp, ChevronDown, Target } from 'lucide-react'
import { formatEuro } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useCalibrateEspace } from '@/lib/hooks/useCalibrateEspace'

type Props = {
  espaces: any[]
  currentEspaceId: string | undefined
  updateEspace: (id: string, data: any) => Promise<void>
  removeEspace: (id: string) => Promise<void>
}

export default function EspacesSection({ espaces, currentEspaceId, updateEspace, removeEspace }: Props) {
  const supabase = createClient()
  const calibrate = useCalibrateEspace()

  // Édition
  const [editTarget, setEditTarget] = useState<any>(null)
  const [editNom, setEditNom] = useState('')
  const [editIcone, setEditIcone] = useState('')

  // Suppression
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  // Calibration
  const [calibrateTarget, setCalibrateTarget] = useState<any>(null)
  const [soldeActuel, setSoldeActuel] = useState<number | null>(null)
  const [resteCumule, setResteCumule] = useState<number | null>(null)
  const [loadingReste, setLoadingReste] = useState(false)

  // Charger le reste cumulé brut quand le dialog calibration s'ouvre
  useEffect(() => {
    if (!calibrateTarget) {
      setResteCumule(null)
      return
    }
    let cancelled = false
    setLoadingReste(true)

    async function fetchReste() {
      const { data: moisList } = await supabase
        .from('mois')
        .select('id')
        .eq('espace_id', calibrateTarget!.id)

      if (cancelled) return
      if (!moisList || moisList.length === 0) {
        setResteCumule(0)
        setLoadingReste(false)
        return
      }

      const moisIds = moisList.map(m => m.id)

      const [revRes, cfRes, txRes, mvRes] = await Promise.all([
        supabase.from('revenus').select('montant').in('mois_id', moisIds),
        supabase.from('charges_fixes').select('montant, payee').in('mois_id', moisIds),
        supabase.from('transactions').select('montant, remboursements(montant)').in('mois_id', moisIds),
        supabase.from('mouvements_epargne').select('montant, type').in('mois_id', moisIds),
      ])

      if (cancelled) return

      const totalRevenus = (revRes.data || []).reduce((s, r) => s + Number(r.montant), 0)
      const totalReprises = (mvRes.data || [])
        .filter(m => m.type === 'reprise')
        .reduce((s, m) => s + Number(m.montant), 0)
      const totalChargesPayees = (cfRes.data || [])
        .filter(c => c.payee)
        .reduce((s, c) => s + Number(c.montant), 0)
      const totalDepenses = (txRes.data || []).reduce((s, t) => {
        const rembs = (t as any).remboursements || []
        const totalRemb = rembs.reduce((sr: number, r: any) => sr + Number(r.montant), 0)
        return s + Number(t.montant) - totalRemb
      }, 0)
      const totalEpargnes = (mvRes.data || [])
        .filter(m => m.type === 'epargne')
        .reduce((s, m) => s + Number(m.montant), 0)

      setResteCumule(totalRevenus + totalReprises - totalChargesPayees - totalDepenses - totalEpargnes)
      setLoadingReste(false)
    }

    fetchReste()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calibrateTarget])

  // Réordonnement
  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const idx = espaces.findIndex(e => e.id === id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= espaces.length) return
    const current = espaces[idx]
    const swap = espaces[swapIdx]
    await supabase.from('espaces').update({ ordre: swapIdx }).eq('id', current.id)
    await supabase.from('espaces').update({ ordre: idx }).eq('id', swap.id)
    window.location.reload()
  }

  // Édition
  const handleSaveEdit = async () => {
    if (!editTarget || !editNom.trim()) return
    await updateEspace(editTarget.id, { nom: editNom.trim(), icone: editIcone })
    setEditTarget(null)
  }

  // Suppression
  const handleDelete = async () => {
    if (!deleteTarget) return
    await removeEspace(deleteTarget.id)
    setDeleteTarget(null)
  }

  // Calibration via hook dédié
  const handleSaveCalibrate = async () => {
    if (!calibrateTarget || soldeActuel === null) return
    const result = await calibrate.mutateAsync({
      espaceId: calibrateTarget.id,
      soldeSaisi: soldeActuel,
    })
    await updateEspace(calibrateTarget.id, { solde_initial: result.soldeInitial })
    setCalibrateTarget(null)
    setSoldeActuel(null)
  }

  // Preview du nouveau solde initial
  const nouveauSoldeInitial = soldeActuel !== null && resteCumule !== null
    ? soldeActuel - resteCumule
    : null

  return (
    <>
      <div className="space-y-2">
        {espaces.map((esp: any, idx: number) => (
          <div key={esp.id} className={`bg-slate-800 rounded-lg p-3 space-y-2 ${
            currentEspaceId === esp.id ? 'ring-1 ring-blue-500' : ''
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{esp.icone}</span>
                <div>
                  <p className="font-medium">{esp.nom}</p>
                  {currentEspaceId === esp.id && (
                    <span className="text-xs text-blue-400">Actif</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500"
                  disabled={idx === 0}
                  onClick={() => handleReorder(esp.id, 'up')}>
                  <ChevronUp className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500"
                  disabled={idx === espaces.length - 1}
                  onClick={() => handleReorder(esp.id, 'down')}>
                  <ChevronDown className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400"
                  onClick={() => {
                    setEditTarget(esp)
                    setEditNom(esp.nom)
                    setEditIcone(esp.icone)
                  }}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400"
                  disabled={espaces.length <= 1}
                  onClick={() => setDeleteTarget(esp)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Bouton calibration */}
            <button
              onClick={() => { setCalibrateTarget(esp); setSoldeActuel(null) }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors text-sm"
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="text-slate-300">Calibrer mon solde</span>
              </div>
              <span className="text-xs text-slate-500">
                Solde initial : {formatEuro(esp.solde_initial ?? 0)}
              </span>
            </button>

            {/* Toggle double date */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700">
              <div>
                <p className="text-sm text-slate-300">Double date</p>
                <p className="text-xs text-slate-500">Date d&apos;opération + date de validation bancaire</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={!!esp.double_date}
                onChange={async (e) => {
                  await updateEspace(esp.id, { double_date: e.target.checked })
                }}
              />
            </div>
          </div>
        ))}

        {espaces.length <= 1 && (
          <p className="text-xs text-slate-500 text-center">
            Tu ne peux pas supprimer ton dernier espace.
          </p>
        )}
      </div>

      {/* Dialog édition */}
      <Dialog open={!!editTarget} onOpenChange={v => { if (!v) setEditTarget(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader><DialogTitle>Modifier l&apos;espace</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nom" value={editNom} onChange={e => setEditNom(e.target.value)} />
            <EmojiPicker value={editIcone} onChange={setEditIcone} />
            <Button className="w-full" onClick={handleSaveEdit}>Enregistrer</Button>
            <Button className="w-full" variant="ghost" onClick={() => setEditTarget(null)}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader><DialogTitle>Supprimer « {deleteTarget?.nom} » ?</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-red-950 border border-red-800 rounded-lg">
              <p className="text-sm text-red-300">
                ⚠️ Cette action supprimera définitivement l&apos;espace et <strong>toutes ses données</strong> :
                revenus, charges, transactions, catégories, budgets et mouvements d&apos;épargne.
              </p>
            </div>
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>
              Supprimer définitivement
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => setDeleteTarget(null)}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog calibration avec preview */}
      <Dialog open={!!calibrateTarget} onOpenChange={v => { if (!v) { setCalibrateTarget(null); setSoldeActuel(null) } }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader><DialogTitle>Calibrer « {calibrateTarget?.nom} »</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-blue-950 border border-blue-800 rounded-lg space-y-1">
              <p className="text-sm text-blue-300">
                💡 Saisis ton <strong>solde réel actuel</strong> (ce que tu as vraiment sur ton compte).
                L&apos;app calculera automatiquement ton solde initial.
              </p>
              <p className="text-xs text-slate-400">
                Solde initial actuel : {formatEuro(calibrateTarget?.solde_initial ?? 0)}
              </p>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1 block">Mon solde actuel (€)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 1250.00"
                value={soldeActuel ?? ''}
                onChange={e => {
                  const val = e.target.value
                  setSoldeActuel(val === '' ? null : parseFloat(val))
                }}
              />
            </div>

            {/* Preview */}
            {soldeActuel !== null && (
              <div className="p-3 bg-slate-800 rounded-lg text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Solde saisi</span>
                  <span className="text-white font-medium">{formatEuro(soldeActuel)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Reste réel calculé</span>
                  {loadingReste ? (
                    <span className="text-slate-500 text-xs">Calcul...</span>
                  ) : (
                    <span className="text-slate-300">{formatEuro(resteCumule ?? 0)}</span>
                  )}
                </div>
                <div className="border-t border-slate-700 pt-1 flex justify-between">
                  <span className="text-slate-400">→ Nouveau solde initial</span>
                  {loadingReste ? (
                    <span className="text-slate-500 text-xs">Calcul...</span>
                  ) : (
                    <span className="text-blue-400 font-bold">
                      {formatEuro(nouveauSoldeInitial ?? 0)}
                    </span>
                  )}
                </div>
              </div>
            )}

            <Button className="w-full" disabled={soldeActuel === null || loadingReste} onClick={handleSaveCalibrate}>
              Enregistrer
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => { setCalibrateTarget(null); setSoldeActuel(null) }}>
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}