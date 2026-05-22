import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatEuro } from '@/lib/utils'

type Props = {
  target: any
  onClose: () => void
  onDelete: (id: string) => void
}

export default function DepenseDeleteDialog({ target, onClose, onDelete }: Props) {
  return (
    <Dialog open={!!target} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader><DialogTitle>Supprimer cette dépense ?</DialogTitle></DialogHeader>
        <div className="text-sm text-slate-400 space-y-1">
          <p>{target?.categorie?.icone} {target?.categorie?.nom || 'Sans catégorie'}</p>
          {target?.infos && <p className="text-xs">{target.infos}</p>}
          <p className="text-pink-400 font-bold">{formatEuro(Number(target?.montant || 0))}</p>
        </div>
        <div className="space-y-3 mt-2">
          <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => {
            if (!target) return
            onDelete(target.id)
            onClose()
          }}>Supprimer</Button>
          <Button className="w-full" variant="ghost" onClick={onClose}>Annuler</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}