'use client'
/* eslint-disable react-hooks/exhaustive-deps */

import { createContext, useContext, useEffect, useState } from 'react'
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
  addEspace: (nom: string, icone?: string) => Promise<void>
  updateEspace: (id: string, updates: { nom?: string; icone?: string }) => Promise<void>
  removeEspace: (id: string) => Promise<void>
}

const defaultCtx: AppContextType = {
  userId: null, espaces: [], espace: null, setEspaceId: () => {},
  moisId: undefined, month: currentMonth(), setMonth: () => {},
  loading: true, addEspace: async () => {},removeEspace: async () => {},
  updateEspace: async () => {},
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

  const espace = espaces.find(e => e.id === espaceId) || espaces[0] || null

  const { getOrCreate } = useMois(espace?.id)
  const [moisId, setMoisId] = useState<string | undefined>(undefined)

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

  // 2. Charger les espaces
  useEffect(() => {
    if (!userId) return
    async function loadEspaces() {
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
    loadEspaces()
  }, [userId])

  // 3. Récupérer ou créer le mois actif pour l'espace sélectionné
  useEffect(() => {
    if (!espace || !userId) return
    getOrCreate.mutateAsync({
      espace_id: espace.id,
      mois: month,
      user_id: userId,
    }).then(m => setMoisId(m.id))
  }, [espace, month, userId])

  // Ajouter un espace
  const addEspace = async (nom: string, icone = '\ud83c\udfe0') => {
    if (!userId) return
    const { data } = await supabase
      .from('espaces')
      .insert({ user_id: userId, nom, icone, ordre: espaces.length })
      .select()
      .single()
    if (data) setEspaces(prev => [...prev, data])
  }

  // Supprimer un espace
  const removeEspace = async (id: string) => {
    const { error } = await supabase.from('espaces').delete().eq('id', id)
    if (error) { console.error('Erreur suppression espace:', error); return }
    setEspaces(prev => prev.filter(e => e.id !== id))
    // Si on supprime l'espace actif, basculer sur le premier restant
    if (espaceId === id) setEspaceId(null)
  }

  const updateEspace = async (id: string, updates: { nom?: string; icone?: string }) => {
    const { error } = await supabase.from('espaces').update(updates).eq('id', id)
    if (error) { console.error('Erreur update espace:', error); return }
    setEspaces(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
  }

  const ctxValue: AppContextType = {
    userId, espaces, espace, setEspaceId: (id) => setEspaceId(id),
    moisId, month, setMonth, loading, addEspace, updateEspace, removeEspace,
  }

  return (
    <AppContext.Provider value={ctxValue}>
      {children}
    </AppContext.Provider>
  )
}