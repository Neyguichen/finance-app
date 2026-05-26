'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { Plus, Trash2, Scissors } from 'lucide-react'
import { formatEuro } from '@/lib/utils'
import InlineCatCreator from './InlineCatCreator'

type SplitLine = {
  categorie_id: string
  sous_categorie_id: string
  montant: number
  infos: string
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  categories: any[]
  espaceId: string | undefined
  createCat: any
  doubleDate?: boolean
  onSubmit: (data: { categorie_id: string; sous_categorie_id: string | null; montant: number; date: string; date_validation: string | null; infos: string | null }) => Promise<void>
  onSubmitSplit?: (data: { categorie_id: string; montant: number; date: string; date_validation: string | null; infos: string | null }, lines: SplitLine[]) => Promise<void>
}

export default function DepenseForm({ open, onOpenChange, categories, espaceId, createCat, doubleDate, onSubmit, onSubmitSplit }: Props) {
  const [txCat, setTxCat] = useState('')
  const [txSubCat, setTxSubCat] = useState('')
  const [txMontant, setTxMontant] = useState(0)
  const [txInfos, setTxInfos] = useState('')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])
  const [txDateValidation, setTxDateValidation] = useState('')
  const [inlineCatOpen, setInlineCatOpen] = useState(false)

  // Split mode
  const [splitMode, setSplitMode] = useState(false)
  const [splitLines, setSplitLines] = useState<SplitLine[]>([
    { categorie_id: '', sous_categorie_id: '', montant: 0, infos: '' },
    { categorie_id: '', sous_categorie_id: '', montant: 0, infos: '' },
  ])

  // Inline sub-cat
  const [inlineSubOpen, setInlineSubOpen] = useState(false)
  const [newSubNom, setNewSubNom] = useState('')
  const [newSubIcone, setNewSubIcone] = useState('📎')

  const parentCategories = categories.filter((c: any) => !c.parent_id && c.actif !== false)
  const getSubCats = (parentId: string) =>
    categories.filter((c: any) => c.parent_id === parentId && c.actif !== false)
      .sort((a: any, b: any) => a.nom.localeCompare(b.nom))

  const subCats = txCat ? getSubCats(txCat) : []

  // Split helpers
  const sumSplitLines = splitLines.reduce((s, l) => s + l.montant, 0)
  const splitRemaining = Math.round((txMontant - sumSplitLines) * 100) / 100
  const splitValid = splitLines.length >= 2 && Math.abs(splitRemaining) < 0.01 && splitLines.every(l => l.categorie_id && l.montant > 0)

  const updateSplitLine = (index: number, field: string, value: any) => {
    setSplitLines(prev => prev.map((l, i) => {
      if (i !== index) return l
      const updated = { ...l, [field]: value }
      if (field === 'categorie_id') updated.sous_categorie_id = ''
      return updated
    }))
  }

  const handleCatChange = (value: string) => {
    if (value === '__NEW__') setInlineCatOpen(true)
    else { setTxCat(value); setTxSubCat('') }
  }

  const handleClose = (v: boolean) => {
    onOpenChange(v)
    if (!v) { setInlineCatOpen(false); setSplitMode(false); setInlineSubOpen(false) }
  }

  const resetForm = () => {
    setTxMontant(0); setTxInfos(''); setTxSubCat(''); setTxDateValidation('')
    setSplitMode(false)
    setSplitLines([
      { categorie_id: '', sous_categorie_id: '', montant: 0, infos: '' },
      { categorie_id: '', sous_categorie_id: '', montant: 0, infos: '' },
    ])
    setInlineSubOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nouvelle dépense</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Date */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{doubleDate ? "Date d'opération" : 'Date'}</label>
            <Input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} />
          </div>
          {doubleDate && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Date de validation bancaire <span className="text-slate-600">(optionnel)</span></label>
              <Input type="date" value={txDateValidation} onChange={e => setTxDateValidation(e.target.value)} />
            </div>
          )}

          {/* Montant total */}
          <CalculatorInput value={txMontant} onChange={setTxMontant} placeholder="Montant total" />
          <Input placeholder="Infos (optionnel)" value={txInfos} onChange={e => setTxInfos(e.target.value)} />

          {/* Toggle split */}
          <button type="button"
            onClick={() => setSplitMode(!splitMode)}
            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-colors ${splitMode ? 'bg-indigo-900 text-indigo-300' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
            <Scissors className="w-3 h-3" />
            {splitMode ? 'Mode split activé' : 'Splitter sur plusieurs catégories'}
          </button>

          {/* === MODE NORMAL === */}
          {!splitMode && (
            <>
              <div className="space-y-2">
                <select className="select select-bordered w-full bg-slate-800 border-slate-700"
                  value={txCat} onChange={e => handleCatChange(e.target.value)}>
                  <option value="">Budget...</option>
                  {[...parentCategories].sort((a: any, b: any) => a.nom.localeCompare(b.nom)).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.icone} {c.nom}</option>
                  ))}
                  <option value="__NEW__">➕ Nouveau budget...</option>
                </select>
                {inlineCatOpen && espaceId && (
                  <InlineCatCreator espaceId={espaceId} categoriesCount={categories.length}
                    createCat={(data) => createCat.mutateAsync(data)}
                    onCreated={(id) => { setTxCat(id); setInlineCatOpen(false) }}
                    onCancel={() => setInlineCatOpen(false)} />
                )}
              </div>
              {txCat && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Sous-catégorie <span className="text-slate-600">(optionnel)</span></label>
                  {subCats.length > 0 ? (
                    <select className="select select-bordered w-full bg-slate-800 border-slate-700"
                      value={txSubCat} onChange={e => {
                        if (e.target.value === '__NEW_SUB__') { setInlineSubOpen(true); setTxSubCat('') }
                        else { setTxSubCat(e.target.value); setInlineSubOpen(false) }
                      }}>
                      <option value="">Aucune</option>
                      {subCats.map((sc: any) => (
                        <option key={sc.id} value={sc.id}>{sc.icone} {sc.nom}</option>
                      ))}
                      <option value="__NEW_SUB__">➕ Nouvelle sous-catégorie...</option>
                    </select>
                  ) : (
                    !inlineSubOpen && (
                      <button type="button" onClick={() => setInlineSubOpen(true)}
                        className="text-xs text-slate-500 hover:text-slate-300 py-1">
                        ➕ Ajouter une sous-catégorie
                      </button>
                    )
                  )}
                  {inlineSubOpen && (
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2 mt-2">
                      <p className="text-xs text-slate-400 font-semibold">Nouvelle sous-catégorie</p>
                      <Input placeholder="Nom" value={newSubNom} onChange={e => setNewSubNom(e.target.value)} />
                      <EmojiPicker value={newSubIcone} onChange={setNewSubIcone} />
                      <div className="flex gap-2">
                        <Button className="flex-1" size="sm" onClick={async () => {
                          if (!newSubNom.trim() || !espaceId) return
                          const parent = categories.find((c: any) => c.id === txCat)
                          const newSub = await createCat.mutateAsync({
                            espace_id: espaceId, nom: newSubNom.trim(), icone: newSubIcone,
                            couleur: parent?.couleur || '#8B5CF6', ordre: categories.length, parent_id: txCat,
                          })
                          setTxSubCat(newSub.id); setNewSubNom(''); setNewSubIcone('📎'); setInlineSubOpen(false)
                        }}>Créer</Button>
                        <Button className="flex-1" size="sm" variant="ghost" onClick={() => { setInlineSubOpen(false); setNewSubNom('') }}>Annuler</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <Button className="w-full" onClick={async () => {
                if (!txCat) return
                await onSubmit({
                  categorie_id: txCat,
                  sous_categorie_id: txSubCat || null,
                  montant: txMontant,
                  date: txDate,
                  date_validation: doubleDate && txDateValidation ? txDateValidation : null,
                  infos: txInfos || null,
                })
                resetForm(); onOpenChange(false)
              }}>Ajouter</Button>
            </>
          )}

          {/* === MODE SPLIT === */}
          {splitMode && (
            <>
              {splitLines.map((line, i) => {
                const lineSubs = line.categorie_id ? getSubCats(line.categorie_id) : []
                return (
                  <div key={i} className="bg-slate-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-semibold">Ligne {i + 1}</span>
                      {splitLines.length > 2 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400"
                          onClick={() => setSplitLines(prev => prev.filter((_, j) => j !== i))}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <select className="select select-bordered w-full bg-slate-700 border-slate-600 text-sm"
                      value={line.categorie_id} onChange={e => updateSplitLine(i, 'categorie_id', e.target.value)}>
                      <option value="">Budget...</option>
                      {[...parentCategories].sort((a: any, b: any) => a.nom.localeCompare(b.nom)).map((c: any) => (
                        <option key={c.id} value={c.id}>{c.icone} {c.nom}</option>
                      ))}
                    </select>
                    {lineSubs.length > 0 && (
                      <select className="select select-bordered w-full bg-slate-700 border-slate-600 text-sm"
                        value={line.sous_categorie_id} onChange={e => updateSplitLine(i, 'sous_categorie_id', e.target.value)}>
                        <option value="">Sous-catégorie (optionnel)</option>
                        {lineSubs.map((sc: any) => (
                          <option key={sc.id} value={sc.id}>{sc.icone} {sc.nom}</option>
                        ))}
                      </select>
                    )}
                    <CalculatorInput value={line.montant} onChange={v => updateSplitLine(i, 'montant', v)} placeholder="Montant" />
                    <Input placeholder="Infos (optionnel)" value={line.infos} className="text-sm bg-slate-700 border-slate-600"
                      onChange={e => updateSplitLine(i, 'infos', e.target.value)} />
                  </div>
                )
              })}
              <Button variant="outline" size="sm" className="w-full text-xs"
                onClick={() => setSplitLines(prev => [...prev, { categorie_id: '', sous_categorie_id: '', montant: 0, infos: '' }])}>
                <Plus className="w-3 h-3 mr-1" /> Ajouter une ligne
              </Button>

              {/* Résumé */}
              <div className={`rounded-lg p-3 text-sm ${Math.abs(splitRemaining) < 0.01 ? 'bg-emerald-950 border border-emerald-800' : 'bg-amber-950 border border-amber-800'}`}>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total</span>
                  <span className="font-bold text-white">{formatEuro(txMontant)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ventilé</span>
                  <span className="font-semibold text-white">{formatEuro(sumSplitLines)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Reste</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${Math.abs(splitRemaining) < 0.01 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {formatEuro(splitRemaining)}
                    </span>
                    {splitRemaining > 0.01 && (
                      <button type="button"
                        onClick={() => setSplitLines(prev => prev.map((l, i) =>
                          i === prev.length - 1 ? { ...l, montant: Math.round((l.montant + splitRemaining) * 100) / 100 } : l
                        ))}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 underline">
                        Auto-remplir
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <Button className="w-full" disabled={!splitValid || txMontant <= 0}
                onClick={async () => {
                  if (!onSubmitSplit || !splitValid) return
                  await onSubmitSplit(
                    {
                      categorie_id: splitLines[0].categorie_id,
                      montant: txMontant,
                      date: txDate,
                      date_validation: doubleDate && txDateValidation ? txDateValidation : null,
                      infos: txInfos || null,
                    },
                    splitLines.map(l => ({ ...l, sous_categorie_id: l.sous_categorie_id || null, infos: l.infos || null })) as any,
                  )
                  resetForm(); onOpenChange(false)
                }}>
                ✂️ Créer et splitter
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}