'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  espaceId: string | undefined
  espaceNom: string | undefined
}

export default function ExportSection({ espaceId, espaceNom }: Props) {
  const supabase = createClient()

  const handleExportCSV = async () => {
    if (!espaceId) return
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

    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finzee-export-${espaceNom || 'data'}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-400">Exporte toutes les données de l&apos;espace <strong>{espaceNom}</strong> au format CSV.</p>
      <Button onClick={handleExportCSV} className="w-full">
        <Download className="w-4 h-4 mr-2" /> Exporter en CSV
      </Button>
    </div>
  )
}