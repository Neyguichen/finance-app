'use client'
/* eslint-disable react-hooks/exhaustive-deps */

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMois } from '@/lib/hooks/useMois'
import { useMonthPreparation, usePrepareMonth } from '@/lib/hooks/useMonthPreparation'
import { currentMonth } from '@/lib/utils'
import type { Espace } from '@/lib/types'

interface AppContextType {
  userId: string | null
  espaces: Espace[]
  espace: Espace | null
  setEspaceId: (id: string) => void
  moisId: string | undefined
  month: string
  setMonth: (m: string) => void
  loading: boolean
  addEspace: (nom: string, icone?: string, soldeInitial?: number) => Promise<void>
  updateEspace: (id: string, updates: {
    nom?: string
    icone?: string
    solde_initial?: number
    solde_reference?: number | null
    date_solde_reference?: string | null
    double_date?: boolean
    dashboard_stats?: Record<string, boolean>
    features?: { import_csv?: boolean; todo?: boolean; notifications?: boolean; subcategories?: boolean; split_transactions?: boolean; reimbursements?: boolean; notification_finances?: boolean; notification_actions?: boolean; notification_neyguichen?: boolean }
    onboarding_completed?: boolean
  }) => Promise<void>
  removeEspace: (id: string) => Promise<void>
  refreshEspaces: () => Promise<void>
  syncing: boolean
  adminViewUserId: string | null
  adminViewEspaceId: string | null
  adminViewData: any
  isAdminViewing: boolean
  setAdminViewUserId: (id: string | null) => void
  setAdminViewEspaceId: (id: string | null) => void
  setAdminViewData: (data: any) => void
  exitAdminView: () => void
}

const defaultCtx: AppContextType = {
  userId: null, espaces: [], espace: null, setEspaceId: () => {},
  moisId: undefined, month: currentMonth(), setMonth: () => {},
  loading: true, addEspace: async () => {}, removeEspace: async () => {},
  updateEspace: async () => {}, refreshEspaces: async () => {},
  syncing: false,
  adminViewUserId: null,
  adminViewEspaceId: null,
  adminViewData: null,
  isAdminViewing: false,
  setAdminViewUserId: () => {},
  setAdminViewEspaceId: () => {},
  setAdminViewData: () => {},
  exitAdminView: () => {},
}

const AppContext = createContext<AppContextType>(defaultCtx)

export function useApp() { return useContext(AppContext) }

export function AppProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [espaces, setEspaces] = useState<Espace[]>([])
  const [espaceId, setEspaceId] = useState<string | null>(null)
  const [month, setMonthState] = useState(currentMonth())
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const [adminViewUserId, setAdminViewUserId] = useState<string | null>(null)
  const [adminViewEspaceId, setAdminViewEspaceId] = useState<string | null>(null)
  const [adminViewData, setAdminViewData] = useState<any>(null)
  const isAdminViewing = !!adminViewUserId

  const exitAdminView = () => {
    setAdminViewUserId(null)
    setAdminViewEspaceId(null)
    setAdminViewData(null)
  }

  const espace = espaces.find(e => e.id === espaceId) || espaces[0] || null

  const [moisId, setMoisId] = useState<string | undefined>(undefined)

  const { data: allMois } = useMois(espace?.id)
  const automaticPreview = useMonthPreparation(espace?.id, month, espace && userId ? 'habits' : null)
  const automaticPrepare = usePrepareMonth(espace?.id, month, userId ?? undefined)
  const autoPreparingRef = useRef<string | null>(null)

  // 1. Écouter les changements d'auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id || null)
        if (!session?.user) setLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  // Fonction de chargement des espaces (réutilisable)
  const loadEspaces = async () => {
    if (!userId) return
    try {
      const { data } = await supabase
        .from('espaces')
        .select('*')
        .eq('user_id', userId)
        .order('ordre')
      const list = data || []
      setEspaces(list)
      // Restaurer l'espace précédemment sélectionné
      const savedId = localStorage.getItem('app_espace_id')
      if (savedId && list.some(e => e.id === savedId)) {
        setEspaceId(savedId)
      }
    } catch (err) {
      console.error('Erreur chargement espaces:', err)
    } finally {
      setLoading(false)
    }
  }

  // 2. Charger les espaces
  useEffect(() => {
    if (!userId) return
    loadEspaces()
  }, [userId])

  // Restaurer le dernier mois consulté après un rechargement.
  useEffect(() => {
    const savedMonth = window.localStorage.getItem('app_selected_month')
    if (savedMonth && /^\d{4}-\d{2}-01$/.test(savedMonth)) setMonthState(savedMonth)
  }, [])

  // 3. Résoudre le mois actif. Un mois inexistant est désormais créé automatiquement
  // avec les récurrences actives qui lui sont dues : il n'y a plus d'état "mois non préparé".
  useEffect(() => {
    if (!espace || !userId) {
      setMoisId(undefined)
      setSyncing(false)
      return
    }

    const found = allMois?.find(m => m.mois === month)

    if (automaticPreview.isLoading || !automaticPreview.data || automaticPrepare.isPending) {
      setMoisId(found?.id)
      setSyncing(!found)
      return
    }

    const items = (automaticPreview.data.items || []).filter(item => item.selected && !item.inactive)
    if (found && items.length === 0) {
      setMoisId(found.id)
      setSyncing(false)
      autoPreparingRef.current = null
      return
    }

    const key = espace.id + ':' + month
    if (autoPreparingRef.current === key) {
      if (found) setMoisId(found.id)
      return
    }
    autoPreparingRef.current = key
    setMoisId(found?.id)
    setSyncing(!found)

    automaticPrepare.mutateAsync(items).then(() => {
      autoPreparingRef.current = null
      setSyncing(false)
    }).catch(error => {
      console.error(found ? 'Erreur synchronisation automatique des récurrences:' : 'Erreur création automatique du mois:', error)
      autoPreparingRef.current = null
      setSyncing(false)
    })
  }, [espace, month, userId, allMois, automaticPreview.data, automaticPreview.isLoading, automaticPrepare.isPending])

  // Ajouter un espace (avec solde_initial optionnel)
  const addEspace = async (nom: string, icone = '🏠', soldeInitial = 0) => {
    if (!userId) return
    const { data } = await supabase
      .from('espaces')
      .insert({
        user_id: userId,
        nom,
        icone,
        ordre: espaces.length,
        solde_initial: soldeInitial,
        onboarding_completed: false,
        features: { import_csv: true, todo: true, notifications: true, subcategories: true, split_transactions: true, reimbursements: true, notification_finances: true, notification_actions: true, notification_neyguichen: true },
      })
      .select()
      .single()
    if (data) setEspaces(prev => [...prev, data])
  }

  // Supprimer un espace
  const removeEspace = async (id: string) => {
    const { error } = await supabase.from('espaces').delete().eq('id', id)
    if (error) { console.error('Erreur suppression espace:', error); return }
    setEspaces(prev => prev.filter(e => e.id !== id))
    if (espaceId === id) {
      setEspaceId(null)
      localStorage.removeItem('finzee_espace_id')
    }
  }

  // Mettre à jour un espace (nom, icone, solde_initial)
  const updateEspace = async (id: string, updates: {
    nom?: string
    icone?: string
    solde_initial?: number
    solde_reference?: number | null
    date_solde_reference?: string | null
    double_date?: boolean
    dashboard_stats?: Record<string, boolean>
    features?: { import_csv?: boolean; todo?: boolean; notifications?: boolean; subcategories?: boolean; split_transactions?: boolean; reimbursements?: boolean; notification_finances?: boolean; notification_actions?: boolean; notification_neyguichen?: boolean }
    onboarding_completed?: boolean
  }) => {
    const { error } = await supabase.from('espaces').update(updates).eq('id', id)
    if (error) { console.error('Erreur update espace:', error); return }
    setEspaces(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
  }

  // Recharger les espaces (utile après calibration)
  const refreshEspaces = async () => {
    if (!userId) return
    const { data } = await supabase
      .from('espaces')
      .select('*')
      .eq('user_id', userId)
      .order('ordre')
    setEspaces(data || [])
  }

  const ctxValue: AppContextType = {
    userId, espaces, espace, setEspaceId: (id) => {
      setEspaceId(id)
      localStorage.setItem('app_espace_id', id)
    },
    moisId, month, setMonth: (value) => {
      setMonthState(value)
      window.localStorage.setItem('app_selected_month', value)
    }, loading, syncing, addEspace, updateEspace, removeEspace, refreshEspaces,
    adminViewUserId, adminViewEspaceId, adminViewData, isAdminViewing,
    setAdminViewUserId, setAdminViewEspaceId, setAdminViewData, exitAdminView,
  }

  return (
    <AppContext.Provider value={ctxValue}>
      {children}
    </AppContext.Provider>
  )
}