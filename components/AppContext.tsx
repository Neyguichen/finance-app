'use client'
/* eslint-disable react-hooks/exhaustive-deps */

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMois } from '@/lib/hooks/useMois'
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
  updateEspace: (id: string, updates: { nom?: string; icone?: string; solde_initial?: number }) => Promise<void>
  removeEspace: (id: string) => Promise<void>
  refreshEspaces: () => Promise<void>
  syncing: boolean
}

const defaultCtx: AppContextType = {
  userId: null, espaces: [], espace: null, setEspaceId: () => {},
  moisId: undefined, month: currentMonth(), setMonth: () => {},
  loading: true, addEspace: async () => {}, removeEspace: async () => {},
  updateEspace: async () => {}, refreshEspaces: async () => {},
  syncing: false,
}

const AppContext = createContext<AppContextType>(defaultCtx)

export function useApp() { return useContext(AppContext) }

export function AppProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [espaces, setEspaces] = useState<Espace[]>([])
  const [espaceId, setEspaceId] = useState<string | null>(null)
  const [month, setMonth] = useState(currentMonth())
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const espace = espaces.find(e => e.id === espaceId) || espaces[0] || null

  const [moisId, setMoisId] = useState<string | undefined>(undefined)

  const { data: allMois, getOrCreate } = useMois(espace?.id)
  const moisCache = useRef<Map<string, string>>(new Map())

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
      setEspaces(data || [])
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

  // 3. Récupérer ou créer le mois actif pour l'espace sélectionné
  useEffect(() => {
    if (!espace || !userId) return
    const cacheKey = `${espace.id}_${month}`

    // 1. Cache session → déjà visité, getOrCreate déjà appelé
    const cached = moisCache.current.get(cacheKey)
    if (cached) {
      setMoisId(cached)
      return
    }

    // 2. allMois → affichage INSTANTANÉ + getOrCreate en arrière-plan
    const found = allMois?.find(m => m.mois === month)
    if (found) {
      setMoisId(found.id) // UI immédiate, pas de latence
      setSyncing(true)
      // Copier les récurrences manquantes en arrière-plan
      getOrCreate.mutateAsync({
        espace_id: espace.id,
        mois: month,
        user_id: userId,
      }).then(m => {
        moisCache.current.set(cacheKey, m.id)
      }).finally(() => setSyncing(false))
      return
    }

    setSyncing(true)

    // 3. Mois n'existe pas du tout → créer (seul cas avec latence réseau)
    getOrCreate.mutateAsync({
      espace_id: espace.id,
      mois: month,
      user_id: userId,
    }).then(m => {
      moisCache.current.set(cacheKey, m.id)
      setMoisId(m.id)
    }).finally(() => setSyncing(false))
  }, [espace, month, userId, allMois])

  // Ajouter un espace (avec solde_initial optionnel)
  const addEspace = async (nom: string, icone = '🏠', soldeInitial = 0) => {
    if (!userId) return
    const { data } = await supabase
      .from('espaces')
      .insert({ user_id: userId, nom, icone, ordre: espaces.length, solde_initial: soldeInitial })
      .select()
      .single()
    if (data) setEspaces(prev => [...prev, data])
  }

  // Supprimer un espace
  const removeEspace = async (id: string) => {
    const { error } = await supabase.from('espaces').delete().eq('id', id)
    if (error) { console.error('Erreur suppression espace:', error); return }
    setEspaces(prev => prev.filter(e => e.id !== id))
    if (espaceId === id) setEspaceId(null)
  }

  // Mettre à jour un espace (nom, icone, solde_initial)
  const updateEspace = async (id: string, updates: { nom?: string; icone?: string; solde_initial?: number }) => {
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
    userId, espaces, espace, setEspaceId: (id) => setEspaceId(id),
    moisId, month, setMonth, loading, syncing, addEspace, updateEspace, removeEspace, refreshEspaces,
  }

  return (
    <AppContext.Provider value={ctxValue}>
      {children}
    </AppContext.Provider>
  )
}