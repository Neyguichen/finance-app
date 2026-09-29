'use client'

import { CheckSquare2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TodoResumeV2() {
  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-slate-300">
          <CheckSquare2 className="h-4 w-4 text-emerald-400" />
          Todo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/30 p-3">
          <p className="text-sm text-slate-300">Aucune action financière centralisée pour le moment.</p>
          <p className="mt-1 text-xs text-slate-500">
            Le Dashboard réserve maintenant cet emplacement. La création, les échéances et les liens vers les opérations seront branchés avec le module Todo dédié, sans créer de table ou de données prématurément.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
