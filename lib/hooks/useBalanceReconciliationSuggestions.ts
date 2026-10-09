'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { cents } from '@/lib/reconciliation'

export type ReconciliationAction = {
  kind: 'income' | 'fixed' | 'variable'
  id: string
}

export type ReconciliationSuggestion = {
  id: string
  kind: 'income' | 'fixed' | 'variable' | 'combination' | 'savings' | 'reimbursement' | 'debt'
  title: string
  detail: string
  effect: number
  href: string
  confidence: 'forte' | 'possible'
  actions: ReconciliationAction[]
}

type Candidate = ReconciliationSuggestion & { date: string; autoCorrectable: boolean }
const intCents = (value: number) => Math.round(value * 100)
const validWindow = (date: string | null | undefined, referenceDate: string | null | undefined, targetDate: string) =>
  Boolean(date && date <= targetDate && (!referenceDate || date > referenceDate))

/**
 * Diagnostic is deliberately read-only. Matching amounts are hypotheses, not
 * proof that an accounting record needs editing. Only already-existing planned
 * income/fixed/variable occurrences can offer explicit validation actions.
 */
export function useBalanceReconciliationSuggestions(
  espaceId: string | undefined,
  targetDate: string,
  referenceDate: string | null | undefined,
  delta: number | null,
  doubleDate = false,
) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['balance_reconciliation', espaceId, targetDate, referenceDate, delta, doubleDate],
    enabled: !!espaceId && !!targetDate && delta != null && Math.abs(delta) >= 0.01,
    queryFn: async () => {
      if (!espaceId || delta == null) return [] as ReconciliationSuggestion[]
      const { data: months, error: monthsError } = await supabase.from('mois').select('id, mois').eq('espace_id', espaceId)
      if (monthsError) throw monthsError
      const monthIds = (months || []).filter(m => String(m.mois).slice(0, 7) <= targetDate.slice(0, 7)
        && (!referenceDate || String(m.mois).slice(0, 7) >= referenceDate.slice(0, 7))).map(m => m.id)
      if (!monthIds.length) return []
      const [
        { data: incomes, error: incomeError },
        { data: fixed, error: fixedError },
        { data: transactions, error: transactionError },
        { data: savingsPlanned, error: savingsError },
        { data: reimbursements, error: reimbursementsError },
        { data: savingsActual, error: savingsActualError },
        { data: debts, error: debtsError },
      ] = await Promise.all([
        supabase.from('revenus').select('id, mois_id, nom, montant, recu, date_prevue').in('mois_id', monthIds),
        supabase.from('charges_fixes').select('id, mois_id, nom, montant, montant_reel, payee, date_prevue').in('mois_id', monthIds),
        supabase.from('transactions').select('id, mois_id, montant, date, date_validation, parent_transaction_id, infos, categorie:categories!categorie_id(nom)').in('mois_id', monthIds).is('parent_transaction_id', null),
        supabase.from('epargne_prevues').select('id, mois_id, montant, note, statut, date_prevue').in('mois_id', monthIds).eq('statut', 'pending'),
        supabase.from('remboursements').select('id, montant, date, transaction_id, note, transactions!inner(mois_id)').in('transactions.mois_id', monthIds),
        supabase.from('mouvements_epargne').select('id, montant, type, date, note').in('mois_id', monthIds),
        supabase.from('dettes').select('id, type, nom, remboursements_dette(id, montant, date, impacte_budget)').eq('espace_id', espaceId),
      ])
      for (const error of [incomeError, fixedError, transactionError, savingsError, reimbursementsError, savingsActualError, debtsError]) if (error) throw error

      const monthDate = new Map((months || []).map(m => [m.id, String(m.mois)]))
      const needed = intCents(delta)
      const candidates: Candidate[] = []
      const add = (item: Omit<Candidate, 'confidence'>) => {
        if (!Number.isFinite(item.effect) || !item.effect || !validWindow(item.date, referenceDate, targetDate)) return
        candidates.push({ ...item, effect: cents(item.effect), confidence: Math.abs(intCents(item.effect) - needed) === 0 ? 'forte' : 'possible' })
      }
      for (const item of incomes || []) {
        if (item.recu) continue
        const date = item.date_prevue || monthDate.get(item.mois_id) || ''
        add({ id: 'income:' + item.id, kind: 'income', title: item.nom || 'Revenu attendu', detail: 'Revenu non marqué reçu : vérifier son encaissement bancaire.', effect: Number(item.montant), date, href: '/revenus', actions: [{ kind: 'income', id: item.id }], autoCorrectable: true })
      }
      for (const item of fixed || []) {
        if (item.payee) continue
        const date = item.date_prevue || monthDate.get(item.mois_id) || ''
        add({ id: 'fixed:' + item.id, kind: 'fixed', title: item.nom || 'Charge attendue', detail: 'Charge non marquée payée : vérifier le débit bancaire.', effect: -Number(item.montant_reel ?? item.montant), date, href: '/depenses', actions: [{ kind: 'fixed', id: item.id }], autoCorrectable: true })
      }
      // Standard mode already counts transaction.date as cash flow, regardless
      // of date_validation: validating it again cannot correct the balance.
      if (doubleDate) for (const item of transactions || []) {
        if (item.date_validation) continue
        add({ id: 'variable:' + item.id, kind: 'variable', title: item.infos || 'Dépense variable', detail: 'Dépense sans validation bancaire en mode double date.', effect: -Number(item.montant), date: item.date, href: '/depenses', actions: [{ kind: 'variable', id: item.id }], autoCorrectable: true })
      }
      for (const item of savingsPlanned || []) {
        const date = item.date_prevue || monthDate.get(item.mois_id) || ''
        add({ id: 'saving:' + item.id, kind: 'savings', title: item.note || 'Versement épargne prévu', detail: 'Versement en attente : vérifier si le virement bancaire a eu lieu. Validation manuelle depuis Épargne.', effect: -Number(item.montant), date, href: '/epargne', actions: [], autoCorrectable: false })
      }

      // Existing actual flows cannot be validated again. They are included as
      // diagnostic hypotheses for duplicates, wrong dates or incorrect amounts.
      for (const item of reimbursements || []) {
        add({ id: 'reimbursement:' + item.id, kind: 'reimbursement', title: item.note || 'Remboursement enregistré', detail: 'Remboursement déjà comptabilisé : vérifier doublon, date ou montant (pas de correction automatique).', effect: -Number(item.montant), date: item.date, href: '/depenses', actions: [], autoCorrectable: false })
      }
      for (const item of savingsActual || []) {
        if (item.type !== 'epargne' && item.type !== 'reprise') continue
        const cashEffect = item.type === 'epargne' ? -Number(item.montant) : Number(item.montant)
        add({ id: 'saving-actual:' + item.id, kind: 'savings', title: item.note || (item.type === 'epargne' ? 'Versement enregistré' : 'Reprise enregistrée'), detail: 'Mouvement déjà comptabilisé : vérifier doublon, sens, montant ou date (pas de correction automatique).', effect: -cashEffect, date: item.date, href: '/epargne', actions: [], autoCorrectable: false })
      }
      for (const debt of debts || []) for (const repayment of debt.remboursements_dette || []) {
        if (!repayment.impacte_budget) continue
        const cashEffect = debt.type === 'je_dois' ? -Number(repayment.montant) : Number(repayment.montant)
        add({ id: 'debt:' + repayment.id, kind: 'debt', title: debt.nom || 'Dette ou créance', detail: 'Remboursement déjà comptabilisé : vérifier date, montant ou doublon (pas de correction automatique).', effect: -cashEffect, date: repayment.date, href: '/epargne', actions: [], autoCorrectable: false })
      }

      const exact = candidates.filter(c => intCents(c.effect) === needed)
      const combinations: ReconciliationSuggestion[] = []
      // Search bounded combinations of 2–4 signed transactions in integer cents.
      // Limit the search to nearby dates and amounts to avoid exponential freezes.
      const pool = candidates
        .filter(c => Math.abs(intCents(c.effect)) <= Math.max(Math.abs(needed) * 4, 20000))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 55)
      const seen = new Set<string>()
      const search = (start: number, remaining: number, sum: number, chosen: Candidate[]) => {
        if (combinations.length >= 5) return
        if (remaining === 0) {
          if (sum !== needed || chosen.length < 2) return
          const key = chosen.map(c => c.id).sort().join('|')
          if (seen.has(key)) return
          seen.add(key)
          const actions = chosen.every(c => c.autoCorrectable) ? chosen.flatMap(c => c.actions) : []
          combinations.push({
            id: 'combo:' + key, kind: 'combination', title: chosen.map(c => c.title).join(' + '),
            detail: chosen.map(c => (c.effect > 0 ? '+' : '') + c.effect.toFixed(2) + ' € · ' + c.title).join(' ; ') + '. Égalité mathématique à confirmer sur les relevés.',
            effect: cents(sum / 100), href: '/verification-solde', confidence: 'forte', actions,
          })
          return
        }
        for (let i = start; i <= pool.length - remaining && combinations.length < 5; i++) {
          search(i + 1, remaining - 1, sum + intCents(pool[i].effect), [...chosen, pool[i]])
        }
      }
      if (!exact.length) for (let size = 2; size <= 3 && combinations.length < 5; size++) search(0, size, 0, [])
      // Four entries can be expensive; work with a smaller recent subset.
      if (!exact.length && !combinations.length) {
        const shortPool = pool.slice(0, 25)
        const originalLength = pool.length
        pool.length = 0
        pool.push(...shortPool)
        search(0, 4, 0, [])
        pool.length = 0
        pool.push(...shortPool)
        void originalLength
      }

      const nearby = candidates
        .filter(c => !exact.includes(c))
        .sort((a, b) => Math.abs(intCents(a.effect) - needed) - Math.abs(intCents(b.effect) - needed))
        .slice(0, 5)
      return [...exact.slice(0, 5), ...combinations, ...nearby].slice(0, 10)
    },
  })
}
