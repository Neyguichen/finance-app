'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type GlobalSearchResult = {
  id: string
  kind: 'income' | 'fixed' | 'expense' | 'reimbursement' | 'debt' | 'envelope' | 'saving'
  title: string
  subtitle: string
  amount?: number | null
  date?: string | null
  month?: string | null
  href: string
  keywords?: string
}

const normalize = (value: string) => value.trim().replace(/[%_]/g, '')
const unique = (items: GlobalSearchResult[]) => {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = item.kind + ':' + item.id
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function useGlobalSearch(espaceId: string | undefined, search: string) {
  const supabase = createClient()
  const query = normalize(search)
  const numeric = Number(query.replace(',', '.'))
  const isNumeric = query !== '' && Number.isFinite(numeric)

  return useQuery({
    queryKey: ['global-search', espaceId, query],
    enabled: !!espaceId && query.length >= 2,
    staleTime: 20_000,
    queryFn: async () => {
      const { data: months, error: monthsError } = await supabase
        .from('mois')
        .select('id, mois')
        .eq('espace_id', espaceId!)
      if (monthsError) throw monthsError

      const monthMap = new Map((months || []).map(item => [item.id, item.mois]))
      const monthIds = (months || []).map(item => item.id)
      const results: GlobalSearchResult[] = []

      const [
        incomeResult,
        fixedResult,
        categoryResult,
        debtResult,
        envelopeResult,
        savingResult,
      ] = await Promise.all([
        monthIds.length
          ? supabase.from('revenus').select('id, mois_id, nom, montant, date_prevue, date_reelle, recu').in('mois_id', monthIds).ilike('nom', '%' + query + '%').limit(8)
          : Promise.resolve({ data: [], error: null }),
        monthIds.length
          ? supabase.from('charges_fixes').select('id, mois_id, nom, montant, montant_reel, date_prevue, date_reelle, payee').in('mois_id', monthIds).ilike('nom', '%' + query + '%').limit(8)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('categories').select('id, nom, icone, parent_id').eq('espace_id', espaceId!).ilike('nom', '%' + query + '%').limit(12),
        supabase.from('dettes').select('id, type, titre, personne, montant, date_echeance, description, archived').eq('espace_id', espaceId!).or('titre.ilike.%' + query + '%,personne.ilike.%' + query + '%,description.ilike.%' + query + '%').limit(8),
        supabase.from('enveloppes').select('id, nom, solde, objectif, archived').eq('espace_id', espaceId!).ilike('nom', '%' + query + '%').limit(8),
        monthIds.length
          ? supabase.from('mouvements_epargne').select('id, mois_id, type, montant, date, note, enveloppe_source_id, enveloppe_dest_id').in('mois_id', monthIds).ilike('note', '%' + query + '%').limit(8)
          : Promise.resolve({ data: [], error: null }),
      ])

      for (const response of [incomeResult, fixedResult, categoryResult, debtResult, envelopeResult, savingResult]) {
        if (response.error) throw response.error
      }

      for (const item of incomeResult.data || []) {
        results.push({
          id: item.id,
          kind: 'income',
          title: item.nom,
          subtitle: item.recu ? 'Revenu reçu' : 'Revenu prévu',
          amount: Number(item.montant),
          date: item.date_reelle || item.date_prevue || null,
          month: monthMap.get(item.mois_id) || null,
          href: '/revenus?focus=' + item.id,
        })
      }

      for (const item of fixedResult.data || []) {
        results.push({
          id: item.id,
          kind: 'fixed',
          title: item.nom,
          subtitle: item.payee ? 'Charge fixe payée' : 'Charge fixe prévue',
          amount: Number(item.montant_reel ?? item.montant),
          date: item.date_reelle || item.date_prevue || null,
          month: monthMap.get(item.mois_id) || null,
          href: '/depenses?view=actual&focusFixed=' + item.id,
        })
      }

      for (const item of debtResult.data || []) {
        results.push({
          id: item.id,
          kind: 'debt',
          title: item.titre,
          subtitle: (item.type === 'je_dois' ? 'Dette' : 'Créance') + ' · ' + item.personne,
          amount: Number(item.montant),
          date: item.date_echeance,
          href: '/epargne?view=debts&debtTab=' + item.type + '&selectedDebt=' + item.id,
        })
      }

      for (const item of envelopeResult.data || []) {
        results.push({
          id: item.id,
          kind: 'envelope',
          title: item.nom,
          subtitle: item.archived ? 'Enveloppe archivée' : 'Enveloppe d’épargne',
          amount: Number(item.solde),
          href: '/epargne?selectedEnvelope=' + item.id,
        })
      }

      for (const item of savingResult.data || []) {
        results.push({
          id: item.id,
          kind: 'saving',
          title: item.note || (item.type === 'epargne' ? 'Versement d’épargne' : item.type === 'reprise' ? 'Reprise d’épargne' : 'Transfert d’épargne'),
          subtitle: item.type === 'epargne' ? 'Épargne' : item.type === 'reprise' ? 'Reprise' : 'Transfert',
          amount: Number(item.montant),
          date: item.date,
          month: monthMap.get(item.mois_id) || null,
          href: '/epargne?focusMovement=' + item.id,
        })
      }

      if (monthIds.length) {
        const categoryIds = (categoryResult.data || []).map(item => item.id)
        const transactionQueries: any[] = [
          supabase
            .from('transactions')
            .select('id, mois_id, montant, date, date_validation, infos, parent_transaction_id, is_split, categorie:categories!categorie_id(id, nom, icone), sous_categorie:categories!sous_categorie_id(id, nom, icone)')
            .in('mois_id', monthIds)
            .ilike('infos', '%' + query + '%')
            .limit(10),
        ]
        if (categoryIds.length) {
          transactionQueries.push(
            supabase
              .from('transactions')
              .select('id, mois_id, montant, date, date_validation, infos, parent_transaction_id, is_split, categorie:categories!categorie_id(id, nom, icone), sous_categorie:categories!sous_categorie_id(id, nom, icone)')
              .in('mois_id', monthIds)
              .or('categorie_id.in.(' + categoryIds.join(',') + '),sous_categorie_id.in.(' + categoryIds.join(',') + ')')
              .limit(10),
          )
        }
        if (isNumeric) {
          transactionQueries.push(
            supabase
              .from('transactions')
              .select('id, mois_id, montant, date, date_validation, infos, parent_transaction_id, is_split, categorie:categories!categorie_id(id, nom, icone), sous_categorie:categories!sous_categorie_id(id, nom, icone)')
              .in('mois_id', monthIds)
              .eq('montant', numeric)
              .limit(10),
          )
        }

        const transactionResponses = await Promise.all(transactionQueries)
        transactionResponses.forEach(response => { if (response.error) throw response.error })
        const transactions = unique(transactionResponses.flatMap(response => (response.data || []).map((item: any) => ({
          id: item.id,
          kind: 'expense' as const,
          title: item.infos || item.sous_categorie?.nom || item.categorie?.nom || 'Dépense',
          subtitle: (item.categorie?.icone ? item.categorie.icone + ' ' : '') + (item.categorie?.nom || 'Sans catégorie') + (item.sous_categorie?.nom ? ' · ' + item.sous_categorie.nom : ''),
          amount: Number(item.montant),
          date: item.date_validation || item.date,
          month: monthMap.get(item.mois_id) || null,
          href: '/depenses?view=actual&focus=' + item.id,
        }))))
        results.push(...transactions)

        const { data: matchingTxIdsData, error: txIdsError } = await supabase
          .from('transactions')
          .select('id, mois_id, infos, montant, categorie:categories!categorie_id(nom, icone)')
          .in('mois_id', monthIds)
          .limit(2000)
        if (txIdsError) throw txIdsError
        const txIds = (matchingTxIdsData || []).map(item => item.id)
        const txMap = new Map((matchingTxIdsData || []).map((item: any) => [item.id, item]))

        if (txIds.length) {
          let reimbursementQuery = supabase
            .from('remboursements')
            .select('id, transaction_id, montant, date, note')
            .in('transaction_id', txIds)
            .limit(12)

          if (isNumeric) {
            reimbursementQuery = reimbursementQuery.or('note.ilike.%' + query + '%,montant.eq.' + numeric)
          } else {
            reimbursementQuery = reimbursementQuery.ilike('note', '%' + query + '%')
          }

          const { data: reimbursements, error: reimbursementError } = await reimbursementQuery
          if (reimbursementError) throw reimbursementError

          for (const item of reimbursements || []) {
            const tx: any = txMap.get(item.transaction_id)
            results.push({
              id: item.id,
              kind: 'reimbursement',
              title: item.note || 'Remboursement',
              subtitle: 'Lié à ' + (tx?.infos || tx?.categorie?.nom || 'une dépense'),
              amount: Number(item.montant),
              date: item.date,
              month: tx ? monthMap.get(tx.mois_id) || null : null,
              href: '/depenses?view=actual&reimbursement=' + item.transaction_id,
            })
          }
        }
      }

      if (isNumeric && monthIds.length) {
        const [incomeAmount, fixedAmount, savingAmount] = await Promise.all([
          supabase.from('revenus').select('id, mois_id, nom, montant, date_prevue, date_reelle, recu').in('mois_id', monthIds).eq('montant', numeric).limit(5),
          supabase.from('charges_fixes').select('id, mois_id, nom, montant, montant_reel, date_prevue, date_reelle, payee').in('mois_id', monthIds).eq('montant', numeric).limit(5),
          supabase.from('mouvements_epargne').select('id, mois_id, type, montant, date, note').in('mois_id', monthIds).eq('montant', numeric).limit(5),
        ])
        for (const response of [incomeAmount, fixedAmount, savingAmount]) if (response.error) throw response.error

        for (const item of incomeAmount.data || []) results.push({ id:item.id, kind:'income', title:item.nom, subtitle:item.recu?'Revenu reçu':'Revenu prévu', amount:Number(item.montant), date:item.date_reelle||item.date_prevue||null, month:monthMap.get(item.mois_id)||null, href:'/revenus?focus='+item.id })
        for (const item of fixedAmount.data || []) results.push({ id:item.id, kind:'fixed', title:item.nom, subtitle:item.payee?'Charge fixe payée':'Charge fixe prévue', amount:Number(item.montant_reel??item.montant), date:item.date_reelle||item.date_prevue||null, month:monthMap.get(item.mois_id)||null, href:'/depenses?view=actual&focusFixed='+item.id })
        for (const item of savingAmount.data || []) results.push({ id:item.id, kind:'saving', title:item.note||(item.type==='epargne'?'Versement d’épargne':item.type==='reprise'?'Reprise d’épargne':'Transfert d’épargne'), subtitle:item.type==='epargne'?'Épargne':item.type==='reprise'?'Reprise':'Transfert', amount:Number(item.montant), date:item.date, month:monthMap.get(item.mois_id)||null, href:'/epargne?focusMovement='+item.id })
      }

      return unique(results).slice(0, 30)
    },
  })
}
