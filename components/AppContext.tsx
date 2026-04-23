'use client'
/* eslint-disable react-hooks/exhaustive-deps */

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMois } from '@/lib/hooks/useMois'
import { currentMonth } from '@/lib/utils'
import type { Compte } from '@/lib/types'

interface AppContextType {
  userId: string | null
  compte: Compte | null
  compteEpargne: Compte | null
  comptes: Compte[]
  moisId: string | undefined
  month: string
  setMonth: (m: string) => void
  loading: boolean
  addCompte: (nom: string, type: 'courant' | 'epargne') => Promise<void>
}

const AppContext = createContext<AppContextType>({
  userId: null, compte: null, compteEpargne: null, comptes: [],
  moisId: undefined, month: currentMonth(), setMonth: () => {}, loading: true,
  addCompte: async () => {},
})

export function useApp() { return useContext(AppContext) }

export function AppProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [comptes, setComptes] = useState<Compte[]>([])
  const [month, setMonth] = useState(currentMonth())
  const [loading, setLoading] = useState(true)

  const compte = comptes.find(c => c.type === 'courant') || null
  const compteEpargne = comptes.find(c => c.type === 'epargne') || null

  const { getOrCreate } = useMois(compte?.id)
  const [moisId, setMoisId] = useState<string | undefined>(undefined)

  // 1. Récupérer l'utilisateur connecté
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null)
      if (!data.user) {
        setLoading(false)
      }
    })
  }, [])

  // 2. Charger les comptes (sans création automatique)
  useEffect(() => {
    if (!userId) return
    async function loadComptes() {
      const { data } = await supabase
        .from('comptes')
        .select('*')
        .eq('user_id', userId)

      if (data && data.length > 0) {
        setComptes(data)
      } else {
        setComptes([])
      }
      setLoading(false)
    }
    loadComptes()
  }, [userId])

  // 3. Récupérer ou créer le mois actif
  useEffect(() => {
    if (!compte || !userId) return
    getOrCreate.mutateAsync({
      compte_id: compte.id,
      mois: month,
      user_id: userId,
    }).then(m => setMoisId(m.id))
  }, [compte, month, userId])

  // 4. Fonction pour ajouter un compte manuellement
  const addCompte = async (nom: string, type: 'courant' | 'epargne') => {
    if (!userId) return
    const { data } = await supabase
      .from('comptes')
      .insert({ user_id: userId, nom, type })
      .select()
      .single()
    if (data) {
      setComptes(prev => [...prev, data])
    }
  }

  return (
    <AppContext.Provider value= {{userId, compte, compteEpargne, comptes, moisId, month, setMonth, loading, addCompte }}>
      {children}
    </AppContext.Provider>
  )
}
