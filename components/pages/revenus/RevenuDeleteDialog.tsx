import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type DeleteTarget = {
  id: string
  recurrentId: string | null
  nom: string
}

type Props = {
  target: DeleteTarget | null
  onClose: () => void
  onDelete: (mode: 'mois' | 'future') => void | Promise<void>
}

export default function RevenuDeleteDialog({ target, onClose, onDelete }: Props) {
  return (
    <Dialog open={!!target} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="border-slate-700 bg-slate-900">
        <DialogHeader><DialogTitle>Supprimer « {target?.nom} » ?</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-400">Pour un revenu récurrent, vous pouvez retirer uniquement cette occurrence ou arrêter la série à partir de celle-ci.</p>
        <div className="space-y-3">
          <Button className="w-full" variant="outline" onClick={() => onDelete('mois')}>Cette occurrence uniquement</Button>
          {target?.recurrentId && <Button className="w-full bg-red-600 text-white hover:bg-red-700" onClick={() => onDelete('future')}>Cette occurrence et les suivantes</Button>}
          <Button className="w-full" variant="ghost" onClick={onClose}>Annuler</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
