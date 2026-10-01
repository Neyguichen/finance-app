'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type DashboardTrendMonth = { month: string; label: string; revenus: number; depenses: number; epargne: number; resultat: number; remboursements: number; remboursementsRecus: number }

export function useDashboardTrends(espaceId?: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['dashboard_trends', espaceId], enabled: !!espaceId, staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DashboardTrendMonth[]> => {
      const { data: months, error: monthError } = await supabase.from('mois').select('id, mois').eq('espace_id', espaceId!).order('mois')
      if (monthError) throw monthError
      if (!months?.length) return []
      const ids = months.map(m => m.id)
      const map = new Map(months.map(m => [m.id, String(m.mois).slice(0, 7)]))
      const [rev, fixed, tx, savings, debts] = await Promise.all([
        supabase.from('revenus').select('montant, recu, mois_id').in('mois_id', ids),
        supabase.from('charges_fixes').select('montant, montant_reel, payee, mois_id').in('mois_id', ids),
        supabase.from('transactions').select('montant, mois_id, is_split, parent_transaction_id, remboursements(montant)').in('mois_id', ids),
        supabase.from('mouvements_epargne').select('type, montant, mois_id').in('mois_id', ids),
        supabase.from('dettes').select('type, remboursements_dette(montant, date, impacte_budget)').eq('espace_id', espaceId!),
      ])
      for (const result of [rev, fixed, tx, savings, debts]) if (result.error) throw result.error
      const byMonth = new Map<string, DashboardTrendMonth>()
      months.forEach(item => {
        const key = String(item.mois).slice(0, 7)
        const d = new Date(`${key}-01T12:00:00`)
        byMonth.set(key, { month: key, label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }), revenus: 0, depenses: 0, epargne: 0, resultat: 0, remboursements: 0, remboursementsRecus: 0 })
      })
      rev.data?.forEach((r:any) => { if (!r.recu) return; const k=map.get(r.mois_id); if(k) byMonth.get(k)!.revenus += Number(r.montant) })
      fixed.data?.forEach((r:any) => { if (!r.payee) return; const k=map.get(r.mois_id); if(k) byMonth.get(k)!.depenses += Number(r.montant_reel ?? r.montant) })
      tx.data?.forEach((r:any) => { if (r.is_split && !r.parent_transaction_id) return; const k=map.get(r.mois_id); if(!k) return; const refunded=(r.remboursements||[]).reduce((s:number,x:any)=>s+Number(x.montant),0); byMonth.get(k)!.depenses += Number(r.montant)-refunded })
      savings.data?.forEach((r:any) => { const k=map.get(r.mois_id); if(!k) return; byMonth.get(k)!.epargne += r.type === 'epargne' ? Number(r.montant) : -Number(r.montant) })
      debts.data?.forEach((d:any) => {
        const repayments = Array.isArray(d.remboursements_dette)
          ? d.remboursements_dette
          : d.remboursements_dette ? [d.remboursements_dette] : []
        for (const r of repayments) {
          if (!r.impacte_budget || !r.date) continue
          const k = String(r.date).slice(0, 7)
          const row = byMonth.get(k)
          if (!row) continue
          if (d.type === 'je_dois') row.remboursements += Number(r.montant)
          else row.remboursementsRecus += Number(r.montant)
        }
      })
      return Array.from(byMonth.values())
        .sort((a,b)=>a.month.localeCompare(b.month))
        .map(row => ({ ...row, resultat: row.revenus + row.remboursementsRecus - row.depenses - row.epargne - row.remboursements }))
    },
  })
}
