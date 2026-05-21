'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { CalculatorInput } from '@/components/ui/calculator-input'
import { useApp } from '@/components/AppContext'
import { useCategories } from '@/lib/hooks/useCategories'
import { useRevenus } from '@/lib/hooks/useRevenus'
import { useChargesFixes } from '@/lib/hooks/useChargesFixes'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { useMouvements } from '@/lib/hooks/useEpargne'
import { createClient } from '@/lib/supabase/client'
import { formatEuro } from '@/lib/utils'
import { APP_VERSION } from '@/lib/version'
import {
  User, Wallet, FolderOpen, Palette, Download, Trash2, RotateCcw, UserX,
  ChevronDown, ChevronUp, Pencil, Archive, ArchiveRestore, Sun, Moon,
  AlertTriangle, Check, ArrowUp, ArrowDown, Calculator
} from 'lucide-react'

export default function ParametresPage() {
  const router = useRouter()
  const supabase = createClient()
  const { userId, espaces, espace, updateEspace, removeEspace, refreshEspaces, moisId, month } = useApp()
  const espaceId = espace?.id
  const { data: categories = [], create: createCat, remove: removeCat } = useCategories(espaceId)

  // Sections ouvertes/fermées
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    profil: false, espaces: true, categories: false, apparence: false,
    export: false, donnees: false, compte: false,
  })
  const toggle = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  // --- État Espaces ---
  const [editEspace, setEditEspace] = useState<any>(null)
  const [editNom, setEditNom] = useState('')
  const [editIcone, setEditIcone] = useState('')
  const [editSolde, setEditSolde] = useState(0)
  const [deleteEspaceTarget, setDeleteEspaceTarget] = useState<any>(null)

    // --- État Calibration ---
    const [calibEspace, setCalibEspace] = useState<any>(null)
    const [soldeReel, setSoldeReel] = useState(0)

    // Données pour calibration (espace actif)
    const { data: calRevenusList = [] } = useRevenus(moisId)
    const { data: calChargesList = [] } = useChargesFixes(moisId)
    const { data: calTransactionsList = [] } = useTransactions(moisId)
    const { data: calMouvementsList = [] } = useMouvements(moisId)

  // --- État Catégories ---
  const [showArchived, setShowArchived] = useState(false)

  // --- État ajout/édition catégorie ---
    const [newCatOpen, setNewCatOpen] = useState(false)
    const [newCatNom, setNewCatNom] = useState('')
    const [newCatIcone, setNewCatIcone] = useState('🛒')
    const [editCat, setEditCat] = useState<any>(null)
    const [editCatNom, setEditCatNom] = useState('')
    const [editCatIcone, setEditCatIcone] = useState('')

  // --- État Thème ---
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('app-theme') || 'dark'
    return 'dark'
  })

  const toggleTheme = (newTheme: string) => {
    setTheme(newTheme)
    localStorage.setItem('app-theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  // --- État Données ---
  const [purgeConfirm, setPurgeConfirm] = useState(false)
  const [purgeMonths, setPurgeMonths] = useState(6)
  const [purging, setPurging] = useState(false)
  const [purgeResult, setPurgeResult] = useState<string | null>(null)

  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetText, setResetText] = useState('')
  const [resetting, setResetting] = useState(false)

  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // --- Données Profil ---
  const [userEmail, setUserEmail] = useState<string | null>(null)

    useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
        setUserEmail(data.user?.email || null)
    })
    }, [])

  // --- Fonctions ---

    // Réordonnement des espaces
    const moveEspace = async (index: number, direction: 'up' | 'down') => {
        const newList = [...espaces]
        const swapIndex = direction === 'up' ? index - 1 : index + 1
        if (swapIndex < 0 || swapIndex >= newList.length) return
        ;[newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]]
        // Mettre à jour les ordres en BDD
        for (let i = 0; i < newList.length; i++) {
        await supabase.from('espaces').update({ ordre: i }).eq('id', newList[i].id)
        }
        await refreshEspaces()
    }
    
    // Calibration du solde
    const getSoldeCalcule = () => {
        if (!calibEspace) return 0
        const soldeInitial = calibEspace.solde_initial || 0
        const totalRev = calRevenusList.reduce((s: number, r: any) => s + Number(r.montant), 0)
        const totalCharges = calChargesList.reduce((s: number, c: any) => s + Number(c.montant), 0)
        const totalTx = calTransactionsList.reduce((s: number, t: any) => {
        const rembs = (t as any).remboursements || []
        const totalRemb = rembs.reduce((s2: number, r: any) => s2 + Number(r.montant), 0)
        return s + Number(t.montant) - totalRemb
        }, 0)
        const totalEpargne = calMouvementsList
        .filter((m: any) => m.type === 'epargne')
        .reduce((s: number, m: any) => s + Number(m.montant), 0)
        const totalReprises = calMouvementsList
        .filter((m: any) => m.type === 'reprise')
        .reduce((s: number, m: any) => s + Number(m.montant), 0)
        return soldeInitial + totalRev + totalReprises - totalCharges - totalTx - totalEpargne
    }
    
    const handleCalibration = async () => {
        if (!calibEspace) return
        const soldeCalcule = getSoldeCalcule()
        const soldeInitial = calibEspace.solde_initial || 0
        const nouveauSoldeInitial = soldeInitial + (soldeReel - soldeCalcule)
        await updateEspace(calibEspace.id, { solde_initial: nouveauSoldeInitial })
        await refreshEspaces()
        setCalibEspace(null)
    }

  const activeCategories = categories.filter((c: any) => c.actif !== false)
  const archivedCategories = categories.filter((c: any) => c.actif === false)

  const handleExportCSV = async () => {
    if (!espaceId) return
    // Charger tous les mois de l'espace
    const { data: moisList } = await supabase
      .from('mois').select('id, mois').eq('espace_id', espaceId).order('mois')
    if (!moisList || moisList.length === 0) return alert('Aucune donnée à exporter')

    const moisIds = moisList.map(m => m.id)
    const moisMap = new Map(moisList.map(m => [m.id, m.mois]))

    const [rev, charges, tx, mvt] = await Promise.all([
      supabase.from('revenus').select('*').in('mois_id', moisIds),
      supabase.from('charges_fixes').select('*').in('mois_id', moisIds),
      supabase.from('transactions').select('*, remboursements(*)').in('mois_id', moisIds),
      supabase.from('mouvements_epargne').select('*').in('mois_id', moisIds),
    ])

    let csv = 'Type;Mois;Libellé;Montant;Catégorie;Détails\n'

    for (const r of rev.data || []) {
      csv += `Revenu;${moisMap.get(r.mois_id)};${r.libelle || ''};${r.montant};${r.type};${r.recu ? 'Reçu' : 'Non reçu'}\n`
    }
    for (const c of charges.data || []) {
      csv += `Charge fixe;${moisMap.get(c.mois_id)};${c.libelle || ''};${c.montant};;${c.payee ? 'Payée' : 'Non payée'}\n`
    }
    for (const t of (tx.data || []) as any[]) {
      const rembs = t.remboursements || []
      const totalRemb = rembs.reduce((s: number, r: any) => s + Number(r.montant), 0)
      csv += `Dépense;${moisMap.get(t.mois_id)};${t.infos || ''};${t.montant};${t.categorie_id};Remb: ${totalRemb}\n`
    }
    for (const m of mvt.data || []) {
      csv += `${m.type === 'epargne' ? 'Épargne' : m.type === 'reprise' ? 'Reprise' : 'Transfert'};${moisMap.get(m.mois_id)};${m.note || ''};${m.montant};;\n`
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finzee-export-${espace?.nom || 'data'}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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

  const handleDeleteAccount = async () => {
    if (!userId || deleteText !== 'SUPPRIMER') return
    setDeleting(true)
    try {
      // Supprimer toutes les données utilisateur
      const { data: userEspaces } = await supabase
        .from('espaces').select('id').eq('user_id', userId)
      if (userEspaces) {
        for (const esp of userEspaces) {
          const { data: moisList } = await supabase
            .from('mois').select('id').eq('espace_id', esp.id)
          if (moisList && moisList.length > 0) {
            const ids = moisList.map(m => m.id)
            await Promise.all([
              supabase.from('revenus').delete().in('mois_id', ids),
              supabase.from('charges_fixes').delete().in('mois_id', ids),
              supabase.from('transactions').delete().in('mois_id', ids),
              supabase.from('mouvements_epargne').delete().in('mois_id', ids),
              supabase.from('budgets').delete().in('mois_id', ids),
            ])
            await supabase.from('mois').delete().in('id', ids)
          }
          await supabase.from('categories').delete().eq('espace_id', esp.id)
          await supabase.from('enveloppes').delete().eq('espace_id', esp.id)
        }
        await supabase.from('espaces').delete().eq('user_id', userId)
      }
      await supabase.auth.signOut()
      router.push('/login')
    } catch (err) {
      alert('Erreur lors de la suppression du compte.')
    } finally {
      setDeleting(false)
    }
  }

  // Composant Section
  const Section = ({ id, icon: Icon, title, color, children }: any) => (
    <Card className={`border-slate-800 ${openSections[id] ? 'bg-slate-900' : 'bg-slate-900/50'}`}>
      <button type="button" onClick={() => toggle(id)} className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${color}`} />
          <span className="font-semibold">{title}</span>
        </div>
        {openSections[id] ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {openSections[id] && <CardContent className="pt-0 pb-4">{children}</CardContent>}
    </Card>
  )

  return (
    <div className="p-4 space-y-3 pb-24">
      <h1 className="text-xl font-bold">⚙️ Paramètres</h1>

      {/* PROFIL */}
      <Section id="profil" icon={User} title="Profil" color="text-blue-400">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between bg-slate-800 rounded-lg p-3">
            <span className="text-slate-400">Email</span>
            <span className="text-white">{userEmail || '—'}</span>
          </div>
        </div>
      </Section>

      {/* ESPACES */}
      <Section id="espaces" icon={Wallet} title="Espaces" color="text-emerald-400">
        <div className="space-y-2">
            {espaces.map((esp: any, index: number) => (
                <div key={esp.id} className="bg-slate-800 rounded-lg p-3 flex items-center justify-between">
                <div className="min-w-0">
                    <span className="text-lg mr-2">{esp.icone}</span>
                    <span className="font-medium">{esp.nom}</span>
                    <span className="text-xs text-slate-500 ml-2">Solde initial: {formatEuro(esp.solde_initial || 0)}</span>
                </div>
                <div className="flex gap-0.5 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" disabled={index === 0}
                    onClick={() => moveEspace(index, 'up')}>
                    <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" disabled={index === espaces.length - 1}
                    onClick={() => moveEspace(index, 'down')}>
                    <ArrowDown className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => {
                    setEditEspace(esp)
                    setEditNom(esp.nom)
                    setEditIcone(esp.icone)
                    setEditSolde(esp.solde_initial || 0)
                    }}>
                    <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-400" onClick={() => {
                    setCalibEspace(esp)
                    setSoldeReel(0)
                    }}>
                    <Calculator className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => setDeleteEspaceTarget(esp)}>
                    <Trash2 className="w-3 h-3" />
                    </Button>
                </div>
                </div>
            ))}
        </div>
      </Section>

      {/* CATÉGORIES */}
        <Section id="categories" icon={FolderOpen} title="Catégories" color="text-purple-400">
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-500">Actives ({activeCategories.length})</p>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setNewCatOpen(true); setNewCatNom(''); setNewCatIcone('🛒') }}>
                    + Ajouter
                    </Button>
                </div>
                {activeCategories.sort((a: any, b: any) => a.nom.localeCompare(b.nom)).map((cat: any) => (
                    <div key={cat.id} className="bg-slate-800 rounded-lg p-2 flex items-center justify-between">
                    <span className="text-sm">{cat.icone} {cat.nom}</span>
                    <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => {
                        setEditCat(cat)
                        setEditCatNom(cat.nom)
                        setEditCatIcone(cat.icone)
                        }}>
                        <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-400" onClick={() => removeCat.mutate(cat.id)}>
                        <Archive className="w-3 h-3" />
                        </Button>
                    </div>
                    </div>
                ))}

                {archivedCategories.length > 0 && (
                    <>
                    <button type="button" onClick={() => setShowArchived(!showArchived)} className="text-xs text-slate-500 hover:text-slate-300 mt-2">
                        {showArchived ? '▼' : '▶'} Archivées ({archivedCategories.length})
                    </button>
                    {showArchived && archivedCategories.map((cat: any) => (
                        <div key={cat.id} className="bg-slate-800/50 rounded-lg p-2 flex items-center justify-between opacity-60">
                        <span className="text-sm">{cat.icone} {cat.nom}</span>
                        <Button variant="ghost" size="sm" className="text-emerald-400 text-xs h-7" onClick={async () => {
                            await supabase.from('categories').update({ actif: true }).eq('id', cat.id)
                            window.location.reload()
                        }}>
                            <ArchiveRestore className="w-3 h-3 mr-1" /> Restaurer
                        </Button>
                        </div>
                    ))}
                    </>
                )}
            </div>
        </Section>

      {/* APPARENCE */}
      <Section id="apparence" icon={Palette} title="Apparence" color="text-amber-400">
        <div className="flex gap-3">
          <button
            onClick={() => toggleTheme('dark')}
            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
              theme === 'dark' ? 'border-blue-500 bg-blue-950' : 'border-slate-700 bg-slate-800'
            }`}
          >
            <Moon className="w-5 h-5" />
            <span className="text-sm">Sombre</span>
          </button>
          <button
            onClick={() => toggleTheme('light')}
            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
              theme === 'light' ? 'border-blue-500 bg-blue-950' : 'border-slate-700 bg-slate-800'
            }`}
          >
            <Sun className="w-5 h-5" />
            <span className="text-sm">Clair</span>
          </button>
        </div>
      </Section>

      {/* EXPORT */}
      <Section id="export" icon={Download} title="Exporter les données" color="text-teal-400">
        <div className="space-y-2">
          <p className="text-sm text-slate-400">Exporte toutes les données de l&apos;espace <strong>{espace?.nom}</strong> au format CSV.</p>
          <Button onClick={handleExportCSV} className="w-full">
            <Download className="w-4 h-4 mr-2" /> Exporter en CSV
          </Button>
        </div>
      </Section>

      {/* DONNÉES */}
      <Section id="donnees" icon={Trash2} title="Gestion des données" color="text-orange-400">
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
            <p className="text-xs text-slate-500">Supprime toutes les données de l&apos;espace <strong>{espace?.nom}</strong> (mois, revenus, charges, dépenses, catégories). Cette action est irréversible.</p>
            <Button size="sm" variant="outline" className="text-red-400 border-red-800" onClick={() => setResetConfirm(true)}>
              Réinitialiser
            </Button>
          </div>
        </div>
      </Section>

      {/* COMPTE */}
      <Section id="compte" icon={UserX} title="Supprimer mon compte" color="text-red-400">
        <div className="bg-red-950/30 border border-red-900 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">Zone de danger</span>
          </div>
          <p className="text-xs text-slate-500">Supprime définitivement votre compte et toutes les données associées (tous les espaces). Cette action est irréversible.</p>
          <Button size="sm" variant="outline" className="text-red-400 border-red-800" onClick={() => setDeleteAccountConfirm(true)}>
            Supprimer mon compte
          </Button>
        </div>
      </Section>

      {/* ===== DIALOGS ===== */}

      {/* Dialog édition espace */}
      <Dialog open={!!editEspace} onOpenChange={v => { if (!v) setEditEspace(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader><DialogTitle>Modifier l&apos;espace</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nom" value={editNom} onChange={e => setEditNom(e.target.value)} />
            <EmojiPicker value={editIcone} onChange={setEditIcone} />
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Solde initial</label>
              <CalculatorInput value={editSolde} onChange={setEditSolde} placeholder="Solde initial" />
            </div>
            <Button className="w-full" onClick={async () => {
              if (!editEspace) return
              await updateEspace(editEspace.id, {
                nom: editNom.trim() || editEspace.nom,
                icone: editIcone,
                solde_initial: editSolde,
              })
              setEditEspace(null)
            }}>Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression espace */}
      <Dialog open={!!deleteEspaceTarget} onOpenChange={v => { if (!v) setDeleteEspaceTarget(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader><DialogTitle>Supprimer l&apos;espace « {deleteEspaceTarget?.nom} » ?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-400">Toutes les données de cet espace seront supprimées définitivement.</p>
          <div className="space-y-3 mt-2">
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={async () => {
              if (!deleteEspaceTarget) return
              await removeEspace(deleteEspaceTarget.id)
              setDeleteEspaceTarget(null)
            }}>Supprimer</Button>
            <Button className="w-full" variant="ghost" onClick={() => setDeleteEspaceTarget(null)}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog calibration */}
        <Dialog open={!!calibEspace} onOpenChange={v => { if (!v) setCalibEspace(null) }}>
            <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
                <DialogHeader><DialogTitle>Calibrer le solde — {calibEspace?.icone} {calibEspace?.nom}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                <div className="bg-slate-800 rounded-lg p-3 text-sm">
                    <div className="flex justify-between">
                    <span className="text-slate-400">Solde calculé</span>
                    <span className="font-bold">{formatEuro(getSoldeCalcule())}</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs text-slate-400 mb-1 block">Solde réel en banque</label>
                    <CalculatorInput value={soldeReel} onChange={setSoldeReel} placeholder="Solde réel" />
                </div>
                <p className="text-xs text-slate-500">
                    Le solde initial sera ajusté de {formatEuro(soldeReel - getSoldeCalcule())} pour correspondre à votre solde réel.
                </p>
                <Button className="w-full" onClick={handleCalibration}>Calibrer</Button>
                <Button className="w-full" variant="ghost" onClick={() => setCalibEspace(null)}>Annuler</Button>
                </div>
            </DialogContent>
        </Dialog>

      {/* Dialog confirmation purge */}
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

      {/* Dialog confirmation réinitialisation */}
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

      {/* Dialog confirmation suppression compte */}
      <Dialog open={deleteAccountConfirm} onOpenChange={v => { if (!v) { setDeleteAccountConfirm(false); setDeleteText('') } }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
          <DialogHeader><DialogTitle>⚠️ Supprimer mon compte</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-400">Cette action supprimera <strong>tous vos espaces et données</strong>. Tapez <strong className="text-red-400">SUPPRIMER</strong> pour confirmer.</p>
          <Input value={deleteText} onChange={e => setDeleteText(e.target.value)} placeholder="SUPPRIMER" />
          <div className="space-y-3 mt-2">
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleDeleteAccount}
              disabled={deleting || deleteText !== 'SUPPRIMER'}>
              {deleting ? 'Suppression...' : 'Supprimer définitivement'}
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => { setDeleteAccountConfirm(false); setDeleteText('') }}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog nouvelle catégorie */}
        <Dialog open={newCatOpen} onOpenChange={setNewCatOpen}>
            <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
                <DialogHeader><DialogTitle>Nouvelle catégorie</DialogTitle></DialogHeader>
                <div className="space-y-4">
                <Input placeholder="Nom (ex: Courses)" value={newCatNom} onChange={e => setNewCatNom(e.target.value)} />
                <EmojiPicker value={newCatIcone} onChange={setNewCatIcone} />
                <Button className="w-full" onClick={async () => {
                    if (!newCatNom.trim() || !espaceId) return
                    await createCat.mutateAsync({ espace_id: espaceId, nom: newCatNom.trim(), icone: newCatIcone, couleur: '#8B5CF6', ordre: categories.length })
                    setNewCatOpen(false)
                }}>Créer</Button>
                </div>
            </DialogContent>
        </Dialog>

        {/* Dialog édition catégorie */}
        <Dialog open={!!editCat} onOpenChange={v => { if (!v) setEditCat(null) }}>
            <DialogContent className="bg-slate-900 border-slate-700 w-11/12 max-w-sm mx-auto">
                <DialogHeader><DialogTitle>Modifier la catégorie</DialogTitle></DialogHeader>
                <div className="space-y-4">
                <Input placeholder="Nom" value={editCatNom} onChange={e => setEditCatNom(e.target.value)} />
                <EmojiPicker value={editCatIcone} onChange={setEditCatIcone} />
                <Button className="w-full" onClick={async () => {
                    if (!editCat || !editCatNom.trim()) return
                    await supabase.from('categories').update({ nom: editCatNom.trim(), icone: editCatIcone }).eq('id', editCat.id)
                    setEditCat(null)
                    window.location.reload()
                }}>Enregistrer</Button>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  )
}