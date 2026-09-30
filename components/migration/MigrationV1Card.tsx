'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, Database, Scale } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Espace } from '@/lib/types'

export default function MigrationV1Card({ espace }: { espace: Espace | null }) {
  const supabase = createClient()

  const audit = useQuery({
    queryKey: ['migration_v1_audit', espace?.id],
    enabled: !!espace?.id,
    queryFn: async () => {
      if (!espace?.id) return { months: 0, envelopes: 0, savingsReferences: 0 }

      const [
        { count: months, error: monthsError },
        { data: envelopes, error: envelopesError },
      ] = await Promise.all([
        supabase
          .from('mois')
          .select('id', { count: 'exact', head: true })
          .eq('espace_id', espace.id),
        supabase
          .from('enveloppes')
          .select('id, solde_reference, date_solde_reference')
          .eq('espace_id', espace.id),
      ])

      if (monthsError) throw monthsError
      if (envelopesError) throw envelopesError

      return {
        months: months || 0,
        envelopes: (envelopes || []).length,
        savingsReferences: (envelopes || []).filter(env =>
          env.solde_reference != null && env.date_solde_reference
        ).length,
      }
    },
  })

  if (!espace) return null

  const hasCashReference = espace.solde_reference != null && !!espace.date_solde_reference

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-start gap-3">
        <Database className="mt-0.5 h-5 w-5 text-violet-400" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Migration V1 → V2</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tes données historiques restent lisibles. La V2 ajoute des références datées et des règles plus strictes sans recréer tes anciennes opérations.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <AuditItem
          label="Historique"
          value={audit.isLoading ? '…' : `${audit.data?.months || 0} mois`}
          ok={(audit.data?.months || 0) > 0}
        />
        <AuditItem
          label="Solde réel"
          value={hasCashReference ? 'Référence définie' : 'À vérifier'}
          ok={hasCashReference}
        />
        <AuditItem
          label="Épargne"
          value={audit.isLoading ? '…' : `${audit.data?.savingsReferences || 0}/${audit.data?.envelopes || 0} référencée(s)`}
          ok={(audit.data?.envelopes || 0) === 0 || (audit.data?.savingsReferences || 0) === (audit.data?.envelopes || 0)}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/verification-solde" className="btn btn-outline btn-sm">
          <Scale className="h-4 w-4" />
          Vérifier le solde
        </Link>
        <Link href="/epargne" className="btn btn-outline btn-sm">
          Références d’épargne
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}

function AuditItem({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className={`h-4 w-4 ${ok ? 'text-emerald-400' : 'text-slate-700'}`} />
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className="mt-1 text-sm font-medium text-slate-300">{value}</p>
    </div>
  )
}
