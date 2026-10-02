'use client'

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useForm } from 'react-hook-form'
import CategorieDialog from '@/components/pages/variables/CategorieDialog'

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
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [categoryDialogParentId, setCategoryDialogParentId] = useState<string | null>(null)
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: { nom: '', montant: 0, categorie_id: '', sous_categorie_id: '' },
  })

  const categorieId = watch('categorie_id')
  const sousCategorieId = watch('sous_categorie_id')
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
    setCategoryDialogOpen(false)
    setCategoryDialogParentId(null)
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

  const createCategory = async (data: { nom: string; icone: string; parent_id?: string }) => {
    if (!createCat || !espaceId) return null
    const parent = data.parent_id ? categories.find(category => category.id === data.parent_id) : null
    return createCat.mutateAsync({
      espace_id: espaceId,
      nom: data.nom,
      icone: data.icone,
      couleur: parent?.couleur || '#6366f1',
      ordre: categories.length,
      parent_id: data.parent_id || null,
      actif: true,
    })
  }

  return (
    <>
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

            <div className="space-y-3 rounded-xl border border-slate-800/70 bg-slate-950/30 p-3">
              <div>
                <p className="text-sm font-medium text-slate-200">Classement</p>
                <p className="text-[11px] text-slate-500">Catégorie principale puis sous-catégorie optionnelle.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Catégorie</label>
                <div className="grid grid-cols-[1fr_44px] gap-2">
                  <SearchableSelect
                    value={categorieId}
                    placeholder="Sans catégorie"
                    options={[
                      { value: '', label: 'Sans catégorie', icon: '—' },
                      ...parentCategories.map(category => ({ value: category.id, label: category.nom, icon: category.icone })),
                    ]}
                    onChange={value => {
                      setValue('categorie_id', value)
                      setValue('sous_categorie_id', '')
                    }}
                  />
                  {createCat && espaceId && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-11 p-0"
                      aria-label="Créer une catégorie"
                      onClick={() => {
                        setCategoryDialogParentId(null)
                        setCategoryDialogOpen(true)
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {categorieId && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Sous-catégorie <span className="text-slate-700">(optionnel)</span></label>
                  <div className="grid grid-cols-[1fr_44px] gap-2">
                    <SearchableSelect
                      value={sousCategorieId}
                      placeholder="Aucune sous-catégorie"
                      options={[
                        { value: '', label: 'Aucune', icon: '—' },
                        ...subCategories.map(category => ({ value: category.id, label: category.nom, icon: category.icone })),
                      ]}
                      onChange={value => setValue('sous_categorie_id', value)}
                    />
                    {createCat && espaceId && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-11 p-0"
                        aria-label="Créer une sous-catégorie"
                        onClick={() => {
                          setCategoryDialogParentId(categorieId)
                          setCategoryDialogOpen(true)
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
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

      <CategorieDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        categories={categories}
        initialParentId={categoryDialogParentId}
        lockParent={categoryDialogParentId !== null}
        onCreate={createCategory}
        onCreated={created => {
          if (!created?.id) return
          if (categoryDialogParentId) setValue('sous_categorie_id', created.id)
          else {
            setValue('categorie_id', created.id)
            setValue('sous_categorie_id', '')
          }
        }}
      />
    </>
  )
}
