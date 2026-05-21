import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Pencil, Archive, ArchiveRestore } from 'lucide-react'
import { formatEuro } from '@/lib/utils'

type Props = {
  env: any
  readOnly: boolean
  variant: 'active' | 'inactive' | 'archived'
  onEdit?: (env: { id: string; nom: string; objectif: number | null; solde: number; solde_initial: number }) => void
  onArchive?: (id: string) => void
  onUnarchive?: (id: string) => void
}

export default function EnveloppeCard({ env, readOnly, variant, onEdit, onArchive, onUnarchive }: Props) {
  const pourcent = env.objectif ? Math.min(100, Math.round((Number(env.solde) / Number(env.objectif)) * 100)) : null
  const isActive = variant === 'active'
  const isArchived = variant === 'archived'

  const cardClass = isActive
    ? 'bg-slate-900 border-slate-800'
    : 'bg-slate-900/50 border-slate-800 opacity-60'

  return (
    <Card className={cardClass}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm truncate">{env.nom}</p>
          <div className="flex items-center gap-1">
            {!readOnly && !isArchived && (
              <>
                <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7"
                  onClick={() => onEdit?.({
                    id: env.id, nom: env.nom, objectif: env.objectif,
                    solde: Number(env.solde), solde_initial: Number(env.solde_initial) || 0,
                  })}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7"
                  onClick={() => {
                    if (confirm(`Archiver "${env.nom}" ?`)) onArchive?.(env.id)
                  }}>
                  <Archive className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
            {!readOnly && isArchived && (
              <Button variant="ghost" size="icon" className="text-slate-500 h-7 w-7"
                onClick={() => onUnarchive?.(env.id)}>
                <ArchiveRestore className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
        <p className={`text-lg font-bold ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
          {formatEuro(Number(env.solde))}
        </p>
        {isActive && env.objectif && pourcent !== null && (
          <>
            <Progress value={pourcent} className="h-2" />
            <p className="text-xs text-slate-500">
              {pourcent}% — Objectif {formatEuro(Number(env.objectif))}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}