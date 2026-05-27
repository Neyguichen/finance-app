'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { Plus, Trash2 } from 'lucide-react'
import { formatEuro } from '@/lib/utils'
import InlineCatCreator from './InlineCatCreator'

type SplitLine = {
  categorie_id: string
  sous_categorie_id: string
  montant: number
  infos: string
}

type Props = {
  tx: any | null
  onClose: () => void
  categories: any[]
  espaceId: string | undefined
  createCat: any
  onSave: (parentId: string, lines: SplitLine[]) => Promise<void>
}

export default function SplitDialog({ tx, onClose, categories, espaceId, createCat, onSave }: Props) {
  const [lines, setLines] = useState<SplitLine[]>([])
  const [saving, setSaving] = useState(false)
  const [newCatLineIndex, setNewCatLineIndex] = useState<number | null>(null)
  const [newSubLineIndex, setNewSubLineIndex] = useState<number | null>(null)
  const [newSubNom, setNewSubNom] = useState('')
  const [newSubIcone, setNewSubIcone] = useState('📎')

  const parentCategories = categories.filter((c: any) => !c.parent_id && c.actif !== false)
  const getSubCats = (parentId: string) =>
    categories.filter((c: any) => c.parent_id === parentId && c.actif !== false)
      .sort((a: any, b: any) => a.nom.localeCompare(b.nom))

  const total = tx ? Number(tx.montant) : 0
  const sumLines = lines.reduce((s, l) => s + l.montant, 0)
  const remaining = Math.round((total - sumLines) * 100) / 100
  const isValid = lines.length >= 2 && Math.abs(remaining) < 0.01 && lines.every(l => l.categorie_id && l.montant > 0)

  useEffect(() => {
    if (tx) {
      if (tx.is_split && tx.children?.length > 0) {
        setLines(tx.children.map((c: any) => ({
          categorie_id: c.categorie_id,
          sous_categorie_id: c.sous_categorie_id || '',
          montant: Number(c.montant),
          infos: c.infos || '',
        })))
      } else {
        setLines([
          { categorie_id: tx.categorie_id, sous_categorie_id: tx.sous_categorie_id || '', montant: 0, infos: '' },
          { categorie_id: '', sous_categorie_id: '', montant: 0, infos: '' },
        ])
      }
      setNewCatLineIndex(null)
      setNewSubLineIndex(null)
    }
  }, [tx])

  const updateLine = (index: number, field: string, value: any) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== index) return l
      const updated = { ...l, [field]: value }
      if (field === 'categorie_id') updated.sous_categorie_id = ''
      return updated
    }))
  }

  const handleCatChange = (index: number, value: string) => {
    if (value === '__NEW__') {
      setNewCatLineIndex(index)
    } else {
      updateLine(index, 'categorie_id', value)
      if (newCatLineIndex === index) setNewCatLineIndex(null)
    }
  }

  const handleSubCatChange = (index: number, value: string) => {
    if (value === '__NEW_SUB__') {
      setNewSubLineIndex(index)
      setNewSubNom('')
      setNewSubIcone('📎')
    } else {
      updateLine(index, 'sous_categorie_id', value)
      if (newSubLineIndex === index) setNewSubLineIndex(null)
    }
  }

  const addLine = () => {
    setLines(prev => [...prev, { categorie_id: '', sous_categorie_id: '', montant: 0, infos: '' }])
  }

  const removeLine = (index: number) => {
    if (lines.length <= 2) return
    setLines(prev => prev.filter((_, i) => i !== index))
    if (newCatLineIndex === index) setNewCatLineIndex(null)
    if (newSubLineIndex === index) setNewSubLineIndex(null)
  }

  const autoFillLast = () => {
    if (remaining <= 0) return
    setLines(prev => prev.map((l, i) => i === prev.length - 1 ? { ...l, montant: Math.round((l.montant + remaining) * 100) / 100 } : l))
  }

  const handleSave = async () => {
    if (!tx || !isValid) return
    setSaving(true)
    try {
      await onSave(tx.id, lines.map(l => ({
        ...l,
        sous_categorie_id: l.sous_categorie_id || null,
        infos: l.infos || null,
      })) as any)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!tx} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">✂️ Splitter la dépense</span>
          </DialogTitle>
          {tx && (
            <div className="text-sm text-slate-400 mt-1">
              <span className="font-semibold text-white">{formatEuro(total)}</span>
              {tx.infos && <span> — {tx.infos}</span>}
              <span className="text-slate-600"> • {tx.categorie?.icone} {tx.categorie?.nom}</span>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {lines.map((line, i) => {
            const subCats = line.categorie_id ? getSubCats(line.categorie_id) : []
            return (
              <div key={i} className="bg-slate-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-semibold">Ligne {i + 1}</span>
                  {lines.length > 2 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => removeLine(i)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {/* Catégorie */}
                <select className="select select-bordered w-full bg-slate-700 border-slate-600 text-sm"
                  value={line.categorie_id} onChange={e => handleCatChange(i, e.target.value)}>
                  <option value="">Budget...</option>
                  {[...parentCategories].sort((a: any, b: any) => a.nom.localeCompare(b.nom)).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.icone} {c.nom}</option>
                  ))}
                  <option value="__NEW__">➕ Nouveau budget...</option>
                </select>
                {newCatLineIndex === i && espaceId && (
                  <InlineCatCreator
                    espaceId={espaceId}
                    categoriesCount={categories.length}
                    createCat={(data: any) => createCat.mutateAsync(data)}
                    onCreated={(id: string) => { updateLine(i, 'categorie_id', id); setNewCatLineIndex(null) }}
                    onCancel={() => setNewCatLineIndex(null)}
                  />
                )}
                {/* Sous-catégorie */}
                {line.categorie_id && subCats.length > 0 ? (
                  <>
                    <select className="select select-bordered w-full bg-slate-700 border-slate-600 text-sm"
                      value={line.sous_categorie_id} onChange={e => handleSubCatChange(i, e.target.value)}>
                      <option value="">Sous-catégorie (optionnel)</option>
                      {subCats.map((sc: any) => (
                        <option key={sc.id} value={sc.id}>{sc.icone} {sc.nom}</option>
                      ))}
                      <option value="__NEW_SUB__">➕ Nouvelle sous-catégorie...</option>
                    </select>
                    {newSubLineIndex === i && (
                      <div className="bg-slate-700 border border-slate-600 rounded-lg p-2 space-y-2">
                        <p className="text-xs text-slate-400 font-semibold">Nouvelle sous-catégorie</p>
                        <Input placeholder="Nom" value={newSubNom} className="text-sm bg-slate-600 border-slate-500"
                          onChange={e => setNewSubNom(e.target.value)} />
                        <EmojiPicker value={newSubIcone} onChange={setNewSubIcone} />
                        <div className="flex gap-2">
                          <Button className="flex-1" size="sm" onClick={async () => {
                            if (!newSubNom.trim() || !espaceId) return
                            const parent = categories.find((c: any) => c.id === line.categorie_id)
                            const newSub = await createCat.mutateAsync({
                              espace_id: espaceId, nom: newSubNom.trim(), icone: newSubIcone,
                              couleur: parent?.couleur || '#8B5CF6', ordre: categories.length, parent_id: line.categorie_id,
                            })
                            updateLine(i, 'sous_categorie_id', newSub.id)
                            setNewSubNom(''); setNewSubIcone('📎'); setNewSubLineIndex(null)
                          }}>Créer</Button>
                          <Button className="flex-1" size="sm" variant="ghost" onClick={() => setNewSubLineIndex(null)}>Annuler</Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : line.categorie_id && subCats.length === 0 && newSubLineIndex !== i ? (
                  <button type="button" onClick={() => { setNewSubLineIndex(i); setNewSubNom(''); setNewSubIcone('📎') }}
                    className="text-xs text-slate-500 hover:text-slate-300 py-1">
                    ➕ Ajouter une sous-catégorie
                  </button>
                ) : line.categorie_id && newSubLineIndex === i ? (
                  <div className="bg-slate-700 border border-slate-600 rounded-lg p-2 space-y-2">
                    <p className="text-xs text-slate-400 font-semibold">Nouvelle sous-catégorie</p>
                    <Input placeholder="Nom" value={newSubNom} className="text-sm bg-slate-600 border-slate-500"
                      onChange={e => setNewSubNom(e.target.value)} />
                    <EmojiPicker value={newSubIcone} onChange={setNewSubIcone} />
                    <div className="flex gap-2">
                      <Button className="flex-1" size="sm" onClick={async () => {
                        if (!newSubNom.trim() || !espaceId) return
                        const parent = categories.find((c: any) => c.id === line.categorie_id)
                        const newSub = await createCat.mutateAsync({
                          espace_id: espaceId, nom: newSubNom.trim(), icone: newSubIcone,
                          couleur: parent?.couleur || '#8B5CF6', ordre: categories.length, parent_id: line.categorie_id,
                        })
                        updateLine(i, 'sous_categorie_id', newSub.id)
                        setNewSubNom(''); setNewSubIcone('📎'); setNewSubLineIndex(null)
                      }}>Créer</Button>
                      <Button className="flex-1" size="sm" variant="ghost" onClick={() => setNewSubLineIndex(null)}>Annuler</Button>
                    </div>
                  </div>
                ) : null}
                {/* Montant */}
                <CalculatorInput value={line.montant} onChange={v => updateLine(i, 'montant', v)} placeholder="Montant" />
                {/* Infos */}
                <Input placeholder="Infos (optionnel)" value={line.infos} className="text-sm bg-slate-700 border-slate-600"
                  onChange={e => updateLine(i, 'infos', e.target.value)} />
              </div>
            )
          })}

          <Button variant="outline" size="sm" className="w-full text-xs" onClick={addLine}>
            <Plus className="w-3 h-3 mr-1" /> Ajouter une ligne
          </Button>

          {/* Résumé */}
          <div className={`rounded-lg p-3 text-sm ${Math.abs(remaining) < 0.01 ? 'bg-emerald-950 border border-emerald-800' : 'bg-amber-950 border border-amber-800'}`}>
            <div className="flex justify-between">
              <span className="text-slate-400">Total</span>
              <span className="font-bold text-white">{formatEuro(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ventilé</span>
              <span className="font-semibold text-white">{formatEuro(sumLines)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Reste</span>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${Math.abs(remaining) < 0.01 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {formatEuro(remaining)}
                </span>
                {remaining > 0.01 && (
                  <button type="button" onClick={autoFillLast}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline">
                    Auto-remplir
                  </button>
                )}
              </div>
            </div>
          </div>

          <Button className="w-full" onClick={handleSave} disabled={!isValid || saving}>
            {saving ? 'Enregistrement...' : '✂️ Valider le split'}
          </Button>
          <Button className="w-full" variant="ghost" onClick={onClose}>Annuler</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}