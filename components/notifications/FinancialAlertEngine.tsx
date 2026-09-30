'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useApp } from '@/components/AppContext'
import { useChargesFixes } from '@/lib/hooks/useChargesFixes'
import { useRevenus } from '@/lib/hooks/useRevenus'
import { useTodos } from '@/lib/hooks/useTodos'
import { createClient } from '@/lib/supabase/client'
import { currentMonth, formatDate, localDateISO } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

type RuleAlert = {
  dedupe_key: string
  family: 'finances' | 'actions'
  title: string
  message: string
  action_label: string
  action_href: string
}

export default function FinancialAlertEngine() {
  const { espace, moisId, month, isAdminViewing } = useApp()
  const notificationsEnabled = espace?.features?.notifications !== false
  const enabled = Boolean(
    espace?.id &&
    moisId &&
    !isAdminViewing &&
    notificationsEnabled &&
    month === currentMonth()
  )
  const charges = useChargesFixes(enabled ? moisId : undefined)
  const revenus = useRevenus(enabled ? moisId : undefined)
  const todos = useTodos(enabled ? espace?.id : undefined)
  const supabase = createClient()
  const queryClient = useQueryClient()
  const lastSignature = useRef('')

  const alerts = useMemo<RuleAlert[]>(() => {
    if (!enabled) return []
    const today = localDateISO()
    const next: RuleAlert[] = []

    for (const charge of charges.data || []) {
      if (charge.payee || !charge.date_prevue || charge.date_prevue > today) continue
      next.push({
        dedupe_key: `rule:fixed-due:${charge.id}`,
        family: 'finances',
        title: charge.date_prevue === today ? 'Charge fixe à payer aujourd’hui' : 'Charge fixe en retard',
        message: `${charge.nom} · échéance ${formatDate(charge.date_prevue)}.`,
        action_label: 'Voir les charges',
        action_href: '/charges-fixes',
      })
    }

    for (const revenu of revenus.data || []) {
      if (revenu.recu || !revenu.date_prevue || revenu.date_prevue > today) continue
      next.push({
        dedupe_key: `rule:income-due:${revenu.id}`,
        family: 'finances',
        title: revenu.date_prevue === today ? 'Revenu attendu aujourd’hui' : 'Revenu attendu non reçu',
        message: `${revenu.nom} · date prévue ${formatDate(revenu.date_prevue)}.`,
        action_label: 'Voir les revenus',
        action_href: '/revenus',
      })
    }

    for (const todo of todos.data || []) {
      if (todo.status === 'done' || !todo.due_date || todo.due_date > today) continue
      next.push({
        dedupe_key: `rule:todo-due:${todo.id}`,
        family: 'actions',
        title: todo.due_date === today ? 'Action prévue aujourd’hui' : 'Action en retard',
        message: todo.title,
        action_label: 'Ouvrir la Todo',
        action_href: '/todo',
      })
    }

    return next
  }, [enabled, charges.data, revenus.data, todos.data])

  useEffect(() => {
    if (!enabled || charges.isLoading || revenus.isLoading || todos.isLoading || !espace?.id) return

    const signature = alerts
      .map(alert => alert.dedupe_key)
      .sort()
      .join('|')

    if (signature === lastSignature.current) return
    lastSignature.current = signature

    let cancelled = false

    const sync = async () => {
      const { data: existing, error: existingError } = await supabase
        .from('notifications')
        .select('id, dedupe_key, archived_at')
        .eq('espace_id', espace.id)
        .like('dedupe_key', 'rule:%')

      if (existingError || cancelled) return

      const existingKeys = new Set((existing || []).map(item => item.dedupe_key).filter(Boolean))
      const activeKeys = new Set(alerts.map(alert => alert.dedupe_key))

      for (const alert of alerts) {
        if (cancelled || existingKeys.has(alert.dedupe_key)) continue
        const { error } = await supabase.from('notifications').insert({
          espace_id: espace.id,
          ...alert,
        })
        if (error && error.code !== '23505') {
          console.warn('Alerte financière non créée:', error)
        }
      }

      const resolvedIds = (existing || [])
        .filter(item => item.dedupe_key && !item.archived_at && !activeKeys.has(item.dedupe_key))
        .map(item => item.id)

      if (resolvedIds.length > 0) {
        await supabase
          .from('notifications')
          .update({
            archived_at: new Date().toISOString(),
            read_at: new Date().toISOString(),
          })
          .in('id', resolvedIds)
      }

      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: ['notifications', espace.id] })
      }
    }

    sync()

    return () => {
      cancelled = true
    }
  }, [
    enabled,
    espace?.id,
    charges.isLoading,
    revenus.isLoading,
    todos.isLoading,
    alerts,
    queryClient,
    supabase,
  ])

  return null
}
