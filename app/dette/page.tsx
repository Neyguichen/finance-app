'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2, ChevronDown, ChevronUp, CalendarClock } from 'lucide-react'
import { useApp } from '@/components/AppContext'
import { useDettes, useRemboursementsDette } from '@/lib/hooks/useDettes'
import { formatEuro, formatDate } from '@/lib/utils'
import { differenceInMonths } from 'date-fns'

// --- Calcul mensualité recommandée ---
function getMensualite(montantRestant: number, dateEcheance: string | null): number | null {
  if (!dateEcheance || montantRestant <= 0) return null
  const moisRestants = differenceInMonths(new Date(dateEcheance), new Date())
  if (moisRestants <= 0) return montantRestant // tout d'un coup si dépassé
  return Math.ceil((montantRestant / moisRestants) * 100) / 100
}

// --- Sous-composant : détail d'une dette avec remboursements ---
function DetteDetail({ detteId, montantTotal }: { detteId: string; montantTotal: number }) {
  const { data: remboursements = [], create, remove } = useRemboursementsDette(detteId)
  const [open, setOpen] = useState(false)
  const [montant, setMontant] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')

  const totalRembourse = remboursements.reduce((s, r) => s + Number(r.montant), 0)
  const reste = montantTotal - totalRembourse

  const handleAdd = async () => {
    if (!montant || Number(montant) <= 0) return
    await create.mutateAsync({
      dette_id: detteId,
      montant: Number(montant),
      date,
      note: note || null,
    })
    setMontant('')
    setNote('')
    setOpen(false)
  }

  return (
    <div className="mt-3 space-y-2 pl-2 border-l-2 border-slate-700">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Remboursé</span>
        <span className="text-emerald-400 font-semibold">{formatEuro(totalRembourse)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Reste</span>
        <span className={`font-bold ${reste <= 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
          {formatEuro(Math.max(reste, 0))}
        </span>
      </div>

      {/* Liste remboursements */}
      {remboursements.map(r => (
        <div key={r.id} className="flex items-center justify-between text-xs bg-slate-800 rounded-lg px-3 py-2">
          <div>
            <span className="text-slate-300">{formatDate(r.date)}</span>
            {r.note && <span className="text-slate-500 ml-2">— {r.note}</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-semibold">{formatEuro(Number(r.montant))}</span>
            <button onClick={() => remove.mutate(r.id)} className="text-slate-600 hover:text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}

      {/* Ajouter un remboursement */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="w-full text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />Ajouter un remboursement
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader><DialogTitle>Nouveau remboursement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input type="number" step="0.01" placeholder="Montant" value={montant} onChange={e => setMontant(e.target.value)} />
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Input placeholder="Note (optionnel)" value={note} onChange={e => setNote(e.target.value)} />
            <Button className="w-full" onClick={handleAdd}>Ajouter</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Page principale ---
export default function DettePage() {
  const { espace } = useApp()
  const { data: dettes = [], create, remove } = useDettes(espace?.id)
  const [tab, setTab] = useState<'je_dois' | 'jai_prete'>('je_dois')
  const [openAdd, setOpenAdd] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Form
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [personne, setPersonne] = useState('')
  const [montant, setMontant] = useState('')
  const [dateEcheance, setDateEcheance] = useState('')

  const filtered = useMemo(() => dettes.filter(d => d.type === tab), [dettes, tab])

  // Totaux
  const totalJeDois = dettes.filter(d => d.type === 'je_dois').reduce((s, d) => s + Number(d.montant), 0)
  const totalJaiPrete = dettes.filter(d => d.type === 'jai_prete').reduce((s, d) => s + Number(d.montant), 0)

  const handleAdd = async () => {
    if (!espace || !titre || !personne || !montant) return
    await create.mutateAsync({
      espace_id: espace.id,
      type: tab,
      titre,
      description: description || null,
      personne,
      montant: Number(montant),
      date_echeance: dateEcheance || null,
    })
    setTitre(''); setDescription(''); setPersonne(''); setMontant(''); setDateEcheance('')
    setOpenAdd(false)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Dettes</h1>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle>
                {tab === 'je_dois' ? 'Nouvelle dette (je dois)' : 'Nouveau prêt (j\'ai prêté)'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Titre (ex: Prêt voiture)" value={titre} onChange={e => setTitre(e.target.value)} />
              <Input placeholder="Description (optionnel)" value={description} onChange={e => setDescription(e.target.value)} />
              <Input placeholder={tab === 'je_dois' ? 'À qui je dois ?' : 'À qui j\'ai prêté ?'} value={personne} onChange={e => setPersonne(e.target.value)} />
              <Input type="number" step="0.01" placeholder="Montant total" value={montant} onChange={e => setMontant(e.target.value)} />
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Date de remboursement souhaitée (optionnel)</label>
                <Input type="date" value={dateEcheance} onChange={e => setDateEcheance(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleAdd}>Ajouter</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-red-950 border-red-800">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-red-400">Je dois</p>
            <p className="text-lg font-bold text-red-300">{formatEuro(totalJeDois)}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-950 border-emerald-800">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-emerald-400">On me doit</p>
            <p className="text-lg font-bold text-emerald-300">{formatEuro(totalJaiPrete)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <div className="flex gap-2">
        <button onClick={() => setTab('je_dois')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'je_dois' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}>Je dois</button>
        <button onClick={() => setTab('jai_prete')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'jai_prete' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}>J&apos;ai prêté</button>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-8">
            {tab === 'je_dois' ? 'Aucune dette enregistrée 🎉' : 'Aucun prêt enregistré'}
          </p>
        )}
        {filtered.map(dette => {
          const isOpen = expanded === dette.id
          const mensualite = getMensualite(Number(dette.montant), dette.date_echeance)

          return (
            <Card key={dette.id} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1" onClick={() => setExpanded(isOpen ? null : dette.id)}>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{dette.titre}</p>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                    {dette.description && <p className="text-xs text-slate-500 mt-0.5">{dette.description}</p>}
                    <p className="text-sm text-slate-400 mt-1">
                      {tab === 'je_dois' ? 'À' : 'De'} : <span className="text-white">{dette.personne}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${tab === 'je_dois' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatEuro(Number(dette.montant))}
                    </p>
                    {dette.date_echeance && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                        <CalendarClock className="w-3.5 h-3.5" />
                        <span>{formatDate(dette.date_echeance)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mensualité recommandée */}
                {mensualite !== null && (
                  <div className="mt-2 px-3 py-2 bg-slate-800 rounded-lg flex justify-between text-sm">
                    <span className="text-slate-400">Mensualité recommandée</span>
                    <span className="text-purple-400 font-semibold">{formatEuro(mensualite)}/mois</span>
                  </div>
                )}

                {/* Détail (remboursements) */}
                {isOpen && (
                  <div className="mt-3">
                    <DetteDetail detteId={dette.id} montantTotal={Number(dette.montant)} />
                    <button
                      onClick={() => {
                        if (confirm(`Supprimer "${dette.titre}" ?`)) remove.mutate(dette.id)
                      }}
                      className="mt-3 text-xs text-red-500 hover:text-red-400"
                    >
                      Supprimer cette dette
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}