'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type ReconciliationAction = {
  kind: 'income' | 'fixed' | 'variable'
  id: string
}

export type ReconciliationSuggestion = {
  id: string
  kind: 'income' | 'fixed' | 'variable' | 'combination'
  title: string
  detail: string
  effect: number
  href: string
  confidence: 'forte' | 'possible'
  actions: ReconciliationAction[]
}

type Candidate = ReconciliationSuggestion & { amount: number }

const cents = (value: number) => Math.round(value * 100) / 100

export function useBalanceReconciliationSuggestions(
  espaceId: string | undefined,
  targetDate: string,
  referenceDate: string | null | undefined,
  delta: number | null,
) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['balance_reconciliation', espaceId, targetDate, referenceDate, delta],
    enabled: !!espaceId && !!targetDate && delta != null && Math.abs(delta) >= 0.01,
    queryFn: async () => {
      if (!espaceId || delta == null) return [] as ReconciliationSuggestion[]

      const { data: months, error: monthsError } = await supabase
        .from('mois')
        .select('id, mois')
        .eq('espace_id', espaceId)
      if (monthsError) throw monthsError

      const eligibleMonths = (months || []).filter(month => {
        const monthKey = String(month.mois).slice(0, 7)
        const targetMonth = targetDate.slice(0, 7)
        const referenceMonth = referenceDate?.slice(0, 7)
        return monthKey <= targetMonth && (!referenceMonth || monthKey >= referenceMonth)
      })
      const monthIds = eligibleMonths.map(month => month.id)
      if (monthIds.length === 0) return []

      const [{ data: incomes, error: incomeError }, { data: fixed, error: fixedError }, { data: transactions, error: transactionError }] = await Promise.all([
        supabase
          .from('revenus')
          .select('id, mois_id, nom, montant, recu, date_prevue, date_reelle')
          .in('mois_id', monthIds),
        supabase
          .from('charges_fixes')
          .select('id, mois_id, nom, montant, montant_reel, payee, date_prevue, date_reelle')
          .in('mois_id', monthIds),
        supabase
          .from('transactions')
          .select('id, mois_id, montant, date, date_validation, parent_transaction_id, infos, categorie:categories!categorie_id(nom)')
          .in('mois_id', monthIds)
          .is('parent_transaction_id', null),
      ])
      if (incomeError) throw incomeError
      if (fixedError) throw fixedError
      if (transactionError) throw transactionError

      const needed = cents(delta)
      const candidates: Candidate[] = []

      // Écart positif : le solde réel est supérieur au calcul Neyguichen.
      // Le cas le plus fréquent est une entrée réellement reçue mais non validée dans l'app.
      if (needed > 0) {
        for (const item of incomes || []) {
          if (item.recu) continue
          const amount = cents(Number(item.montant))
          candidates.push({
            id: `income:${item.id}`,
            kind: 'income',
            title: item.nom || 'Revenu non reçu',
            detail: `Ce revenu est encore marqué comme non reçu. Le valider augmenterait le solde Neyguichen de ${amount.toFixed(2)} €.`,
            effect: amount,
            amount,
            href: '/revenus',
            confidence: Math.abs(amount - needed) < 0.01 ? 'forte' : 'possible',
            actions: [{ kind: 'income', id: item.id }],
          })
        }
      }

      // Écart négatif : le solde réel est inférieur au calcul Neyguichen.
      // Chercher d'abord les sorties prévues/enregistrées qui ne sont pas encore validées.
      if (needed < 0) {
        for (const item of fixed || []) {
          if (item.payee) continue
          const amount = cents(Number(item.montant_reel ?? item.montant))
          candidates.push({
            id: `fixed:${item.id}`,
            kind: 'fixed',
            title: item.nom || 'Charge fixe non payée',
            detail: `Cette charge est encore marquée comme non payée. La valider diminuerait le solde Neyguichen de ${amount.toFixed(2)} €.`,
            effect: -amount,
            amount,
            href: '/depenses',
            confidence: Math.abs(amount - Math.abs(needed)) < 0.01 ? 'forte' : 'possible',
            actions: [{ kind: 'fixed', id: item.id }],
          })
        }

        for (const item of transactions || []) {
          if (item.date_validation) continue
          if (item.date > targetDate) continue
          if (referenceDate && item.date < referenceDate) continue
          const amount = cents(Number(item.montant))
          const category = Array.isArray(item.categorie) ? item.categorie[0]?.nom : (item.categorie as any)?.nom
          candidates.push({
            id: `variable:${item.id}`,
            kind: 'variable',
            title: category || item.infos || 'Dépense variable à valider',
            detail: `Cette dépense du ${item.date} n'a pas de date de validation. La valider diminuerait le solde Neyguichen de ${amount.toFixed(2)} €.`,
            effect: -amount,
            amount,
            href: '/depenses',
            confidence: Math.abs(amount - Math.abs(needed)) < 0.01 ? 'forte' : 'possible',
            actions: [{ kind: 'variable', id: item.id }],
          })
        }
      }

      const exact = candidates
        .filter(candidate => Math.abs(cents(candidate.effect - needed)) < 0.01)
        .sort((a, b) => a.title.localeCompare(b.title))

      // Si aucun candidat unique n'explique l'écart, tester une combinaison simple de deux éléments.
      const combinations: ReconciliationSuggestion[] = []
      if (exact.length === 0) {
        for (let i = 0; i < candidates.length; i++) {
          for (let j = i + 1; j < candidates.length; j++) {
            const effect = cents(candidates[i].effect + candidates[j].effect)
            if (Math.abs(effect - needed) < 0.01) {
              combinations.push({
                id: `combo:${candidates[i].id}:${candidates[j].id}`,
                kind: 'combination',
                title: `${candidates[i].title} + ${candidates[j].title}`,
                detail: `Ces deux opérations réunies correspondent exactement à l'écart constaté.`,
                effect,
                href: candidates[i].href === candidates[j].href ? candidates[i].href : '/dashboard',
                confidence: 'forte',
                actions: [...candidates[i].actions, ...candidates[j].actions],
              })
              if (combinations.length >= 3) break
            }
          }
          if (combinations.length >= 3) break
        }
      }

      const nearby = candidates
        .filter(candidate => !exact.some(item => item.id === candidate.id))
        .map(candidate => ({
          ...candidate,
          distance: Math.abs(Math.abs(candidate.effect) - Math.abs(needed)),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5)
        .map(({ distance: _distance, ...candidate }) => candidate)

      return [...exact.slice(0, 5), ...combinations, ...nearby].slice(0, 8)
    },
  })
}
