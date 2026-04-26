'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp, CalendarClock } from 'lucide-react'
import { useApp } from '@/components/AppContext'
import { useDettes } from '@/lib/hooks/useDettes'
import { formatEuro, formatDate } from '@/lib/utils'
import { differenceInMonths, format } from 'date-fns'
import type { Dette, RemboursementDette } from '@/lib/types'

// --- Sous-composant : détail d'une dette avec remboursements ---
function DetteDetail({ dette }: { dette: Dette }) {
  const {
    remboursements, addRemboursement, removeRemboursement,
    updateRemboursement, archive, unarchive, update
  } = useDettes(dette.espace_id)

  const [expanded, setExpanded] = useState(false)
  const [newMontant, setNewMontant] = useState('')
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  // --- Édition dette ---
  const [editDette, setEditDette] = useState(false)
  const [editPersonne, setEditPersonne] = useState(dette.personne)
  const [editMontant, setEditMontant] = useState(Number(dette.montant))
  const [editDateFin, setEditDateFin] = useState(dette.date_echeance || '')
  const [editNote, setEditNote] = useState(dette.description || '')

  // --- Édition remboursement ---
  const [editRemb, setEditRemb] = useState<string | null>(null)
  const [editRembMontant, setEditRembMontant] = useState(0)
  const [editRembDate, setEditRembDate] = useState('')

  const rembList = (remboursements.data || []).filter(r => r.dette_id === dette.id)
  const totalRemb = rembList.reduce((s, r) => s + Number(r.montant), 0)
  const reste = Number(dette.montant) - totalRemb

  // Mensualité basée sur le RESTE (pas le total dû)
  const mensualite = dette.date_echeance
    ? (() => {
        const moisRestants = differenceInMonths(new Date(dette.date_echeance), new Date())
        return moisRestants > 0 ? Math.ceil((reste / moisRestants) * 100) / 100 : reste
      })()
    : null

  const cardClass = `bg-slate-900 border-slate-800 ${dette.archived ? 'opacity-60' : ''}`

  return (
    <Card className={cardClass}>
      <CardContent className="p-3 space-y-2">

        {/* === ZONE PRINCIPALE (toujours visible) === */}
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold">{dette.titre}</p>
            {dette.description && <p className="text-xs text-slate-500">{dette.description}</p>}
            <p className="text-sm text-slate-400 mt-1">
              {dette.type === 'je_dois' ? 'À' : 'De'} : <span className="text-white">{dette.personne}</span>
            </p>
          </div>
          <div className="text-right">
            {/* RESTE affiché en gros */}
            <p className={`font-bold text-lg ${reste <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {reste <= 0 ? 'Soldé ✅' : formatEuro(reste)}
            </p>
            {dette.date_echeance && (
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 justify-end">
                <CalendarClock className="w-3.5 h-3.5" />
                <span>{formatDate(dette.date_echeance)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Mensualité recommandée (basée sur le reste) */}
        {mensualite !== null && reste > 0 && (
          <div className="px-3 py-2 bg-slate-800 rounded-lg flex justify-between text-sm">
            <span className="text-slate-400">Mensualité recommandée</span>
            <span className="text-purple-400 font-semibold">{formatEuro(mensualite)}/mois</span>
          </div>
        )}

        {/* Remboursé résumé */}
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Remboursé</span>
          <span className="text-emerald-400">{formatEuro(totalRemb)}</span>
        </div>

        {/* === ZONE MASQUÉE (toggle) === */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-400 underline"
        >
          {expanded ? 'Masquer les détails ▲' : 'Voir les détails ▼'}
        </button>

        {expanded && (
          <div className="space-y-3 pt-2 border-t border-slate-800">
            {/* Dû initial */}
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Dû initial</span>
              <span className="text-white">{formatEuro(Number(dette.montant))}</span>
            </div>
            {dette.description && (
              <p className="text-xs text-slate-500 italic">{dette.description}</p>
            )}

            {/* Liste des remboursements */}
            <div className="space-y-1">
              {rembList.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm bg-slate-800 rounded px-2 py-1">
                  {editRemb === r.id ? (
                    <>
                      <Input type="number" step="0.01" className="w-24 h-7 text-xs"
                        value={editRembMontant} onChange={e => setEditRembMontant(parseFloat(e.target.value) || 0)} />
                      <Input type="date" className="w-32 h-7 text-xs"
                        value={editRembDate} onChange={e => setEditRembDate(e.target.value)} />
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-400"
                        onClick={() => {
                          updateRemboursement.mutate({ id: r.id, montant: editRembMontant, date: editRembDate })
                          setEditRemb(null)
                        }}>✓</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => setEditRemb(null)}>✕</Button>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-400">{formatDate(r.date)}</span>
                      <span className="text-emerald-400 font-medium">{formatEuro(Number(r.montant))}</span>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6"
                          onClick={() => { setEditRemb(r.id); setEditRembMontant(Number(r.montant)); setEditRembDate(r.date) }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400"
                          onClick={() => removeRemboursement.mutate(r.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Ajouter un remboursement */}
            {!dette.archived && reste > 0 && (
              <div className="flex gap-2">
                <Input type="number" step="0.01" placeholder="Montant"
                  className="flex-1 h-8 text-sm" value={newMontant}
                  onChange={e => setNewMontant(e.target.value)} />
                <Input type="date" className="w-32 h-8 text-sm"
                  value={newDate} onChange={e => setNewDate(e.target.value)} />
                <Button size="sm" className="h-8" onClick={() => {
                  if (!newMontant) return
                  addRemboursement.mutate({
                    dette_id: dette.id, montant: parseFloat(newMontant), date: newDate
                  })
                  setNewMontant('')
                }}>+</Button>
              </div>
            )}

            {/* Bouton éditer la dette */}
            <Button size="sm" variant="outline" className="w-full text-xs"
              onClick={() => setEditDette(true)}>
              <Pencil className="w-3 h-3 mr-1" />Modifier cette dette
            </Button>

            {/* Archiver / Désarchiver */}
            {dette.archived ? (
              <Button size="sm" variant="ghost" className="w-full text-xs text-blue-400"
                onClick={() => unarchive.mutate(dette.id)}>
                Désarchiver cette dette
              </Button>
            ) : (
              <Button size="sm" variant="ghost" className="w-full text-xs text-orange-400"
                onClick={() => {
                  if (confirm('Archiver cette dette ? Tu pourras la retrouver plus tard.'))
                    archive.mutate(dette.id)
                }}>
                Archiver cette dette
              </Button>
            )}
          </div>
        )}

        {/* Dialog édition dette */}
        <Dialog open={editDette} onOpenChange={setEditDette}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader><DialogTitle>Modifier la dette</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Personne" value={editPersonne}
                onChange={e => setEditPersonne(e.target.value)} />
              <Input type="number" step="0.01" placeholder="Montant total"
                value={editMontant} onChange={e => setEditMontant(parseFloat(e.target.value) || 0)} />
              <Input type="date" placeholder="Échéance" value={editDateFin}
                onChange={e => setEditDateFin(e.target.value)} />
              <Input placeholder="Note" value={editNote}
                onChange={e => setEditNote(e.target.value)} />
              <Button className="w-full" onClick={() => {
                update.mutate({
                  id: dette.id,
                  personne: editPersonne,
                  montant: editMontant,
                  date_echeance: editDateFin || null,
                  description: editNote || null,
                })
                setEditDette(false)
              }}>Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>

      </CardContent>
    </Card>
  )
}

// --- Page principale ---
export default function DettePage() {
  const { espace } = useApp()
  const { data: dettes = [], create } = useDettes(espace?.id)
  const [tab, setTab] = useState<'je_dois' | 'jai_prete'>('je_dois')
  const [openAdd, setOpenAdd] = useState(false)

  // Form
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [personne, setPersonne] = useState('')
  const [montant, setMontant] = useState('')
  const [dateEcheance, setDateEcheance] = useState('')

  // Séparer actives et archivées par onglet
  const dettesActives = dettes.filter(d => !d.archived && d.type === tab)
  const dettesArchivees = dettes.filter(d => d.archived && d.type === tab)

  // Totaux (toutes, pas que actives)
  const totalJeDois = dettes.filter(d => d.type === 'je_dois' && !d.archived).reduce((s, d) => s + Number(d.montant), 0)
  const totalJaiPrete = dettes.filter(d => d.type === 'jai_prete' && !d.archived).reduce((s, d) => s + Number(d.montant), 0)

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

      {/* Liste des dettes actives */}
      <div className="space-y-3">
        {dettesActives.length === 0 && dettesArchivees.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-8">
            {tab === 'je_dois' ? 'Aucune dette enregistrée 🎉' : 'Aucun prêt enregistré'}
          </p>
        )}

        {dettesActives.map(dette => (
          <DetteDetail key={dette.id} dette={dette} />
        ))}
      </div>

      {/* Section Archives (repliable) */}
      {dettesArchivees.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-slate-500 cursor-pointer">
            📦 Archives ({dettesArchivees.length})
          </summary>
          <div className="space-y-2 mt-2">
            {dettesArchivees.map(dette => (
              <DetteDetail key={dette.id} dette={dette} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}