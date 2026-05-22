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
  onDelete: (mode: 'mois' | 'definitif') => void
}

export default function RevenuDeleteDialog({ target, onClose, onDelete }: Props) {
  return (
    <Dialog open={!!target} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle>Supprimer &laquo; {target?.nom} &raquo; ?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Button className="w-full" variant="outline" onClick={() => onDelete('mois')}>
            Ce mois seulement
          </Button>
          {target?.recurrentId && (
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => onDelete('definitif')}>
              Définitivement (ne plus reporter)
            </Button>
          )}
          <Button className="w-full" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}