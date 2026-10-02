'use client'

import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { useForm } from 'react-hook-form'
import InlineCatCreator from '@/components/pages/variables/InlineCatCreator'

type RecurrenceMode = 'monthly' | 'custom'
type CategoryOption = {
  id: string
  nom: string
  icone?: string | null
  couleur?: string | null
  parent_id?: string | null
  actif?: boolean
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories?: CategoryOption[]
  espaceId?: string
  createCat?: any
  onSubmit: (values: {
    nom: string
    montant: number
    frequence: number
    categorie_id?: string | null
    sous_categorie_id?: string | null
  }) => Promise<void>
}

export default function ChargeFixeForm({
  open,
  onOpenChange,
  categories = [],
  espaceId,
  createCat,
  onSubmit,
}: Props) {
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('monthly')
  const [customFrequency, setCustomFrequency] = useState(2)
  const [inlineCatOpen, setInlineCatOpen] = useState(false)
  const [inlineSubOpen, setInlineSubOpen] = useState(false)
  const [newSubNom, setNewSubNom] = useState('')
  const [newSubIcone, setNewSubIcone] = useState('📎')
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: { nom: '', montant: 0, categorie_id: '', sous_categorie_id: '' },
  })

  const categorieId = watch('categorie_id')
  const parentCategories = useMemo(
    () => categories.filter(category => !category.parent_id && category.actif !== false).sort((a, b) => a.nom.localeCompare(b.nom)),
    [categories],
  )
  const subCategories = useMemo(
    () => categories.filter(category => category.parent_id === categorieId && category.actif !== false).sort((a, b) => a.nom.localeCompare(b.nom)),
    [categories, categorieId],
  )

  const frequency = recurrenceMode === 'monthly'
    ? 1
    : Math.max(2, customFrequency || 2)

  const resetAll = () => {
    reset()
    setRecurrenceMode('monthly')
    setCustomFrequency(2)
    setInlineCatOpen(false)
    setInlineSubOpen(false)
    setNewSubNom('')
    setNewSubIcone('📎')
  }

  const doSubmit = async (values: {
    nom: string
    montant: number
    categorie_id?: string
    sous_categorie_id?: string
  }) => {
    await onSubmit({
      ...values,
      categorie_id: values.categorie_id || null,
      sous_categorie_id: values.sous_categorie_id || null,
      frequence: frequency,
    })
    resetAll()
  }

  const createSubcategory = async () => {
    if (!createCat || !espaceId || !categorieId || !newSubNom.trim()) return
    const parent = categories.find(category => category.id === categorieId)
    const created = await createCat.mutateAsync({
      espace_id: espaceId,
      nom: newSubNom.trim(),
      icone: newSubIcone,
      couleur: parent?.couleur || '#8B5CF6',
      ordre: categories.length,
      parent_id: categorieId,
    })
    setValue('sous_categorie_id', created.id)
    setInlineSubOpen(false)
    setNewSubNom('')
    setNewSubIcone('📎')
  }

  return (
    <Dialog open={open} onOpenChange={value => {
      onOpenChange(value)
      if (!value) resetAll()
    }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nouvelle charge fixe</DialogTitle></DialogHeader>

        <form onSubmit={handleSubmit(doSubmit)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
            <Input placeholder="Nom (ex. Loyer)" {...register('nom', { required: true })} />
            <CalculatorInput value={watch('montant')} onChange={val => setValue('montant', val)} placeholder="Montant prévu" />
          </div>

          <div className="rounded-xl border border-slate-800/70 bg-slate-950/30 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-200">Classement</p>
                <p className="text-[11px] text-slate-500">Catégorie principale puis sous-catégorie optionnelle.</p>
              </div>
            </div>

            <select
              value={categorieId}
              onChange={event => {
                const value = event.target.value
                if (value === '__NEW__') {
                  setInlineCatOpen(true)
                  return
                }
                setValue('categorie_id', value)
                setValue('sous_categorie_id', '')
                setInlineSubOpen(false)
              }}
              className="select select-bordered w-full"
            >
              <option value="">Sans catégorie</option>
              {parentCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icone ? `${category.icone} ` : ''}{category.nom}
                </option>
              ))}
              {createCat && espaceId && <option value="__NEW__">➕ Nouvelle catégorie…</option>}
            </select>

            {inlineCatOpen && createCat && espaceId && (
              <InlineCatCreator
                espaceId={espaceId}
                categoriesCount={categories.length}
                createCat={(data: any) => createCat.mutateAsync(data)}
                onCreated={id => {
                  setValue('categorie_id', id)
                  setValue('sous_categorie_id', '')
                  setInlineCatOpen(false)
                }}
                onCancel={() => setInlineCatOpen(false)}
              />
            )}

            {categorieId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs text-slate-500">Sous-catégorie <span className="text-slate-700">(optionnel)</span></label>
                  {createCat && !inlineSubOpen && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-indigo-200"
                      onClick={() => setInlineSubOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Nouvelle
                    </button>
                  )}
                </div>

                <select {...register('sous_categorie_id')} className="select select-bordered w-full">
                  <option value="">Aucune</option>
                  {subCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icone ? `${category.icone} ` : ''}{category.nom}
                    </option>
                  ))}
                </select>

                {inlineSubOpen && createCat && espaceId && (
                  <div className="rounded-xl border border-indigo-400/15 bg-indigo-500/5 p-3">
                    <p className="mb-2 text-xs font-semibold text-slate-300">Nouvelle sous-catégorie</p>
                    <div className="space-y-2">
                      <Input value={newSubNom} onChange={event => setNewSubNom(event.target.value)} placeholder="Nom" autoFocus />
                      <EmojiPicker value={newSubIcone} onChange={setNewSubIcone} />
                      <div className="flex gap-2">
                        <Button type="button" size="sm" className="flex-1" onClick={createSubcategory} disabled={!newSubNom.trim()}>
                          Créer
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => {
                          setInlineSubOpen(false)
                          setNewSubNom('')
                        }}>
                          <X className="mr-1 h-3.5 w-3.5" /> Annuler
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">Récurrence</label>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800/70 bg-slate-950/35 p-1">
              {([
                ['monthly', 'Tous les mois'],
                ['custom', 'Tous les X mois'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRecurrenceMode(value)}
                  className={`rounded-lg px-2 py-2 text-xs font-medium transition ${recurrenceMode === value ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {recurrenceMode === 'custom' && (
              <label className="mt-2 flex items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-950/30 p-2.5">
                <span className="text-xs text-slate-500">Répéter tous les</span>
                <input
                  type="number"
                  min={2}
                  max={60}
                  value={customFrequency}
                  onChange={event => setCustomFrequency(Math.max(2, Number(event.target.value) || 2))}
                  className="input input-bordered input-sm w-20 text-center"
                />
                <span className="text-xs text-slate-500">mois</span>
              </label>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={!watch('nom')?.trim() || Number(watch('montant')) <= 0}>
            Ajouter la charge fixe
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
