import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Props = {
  target: { id: string; nom: string } | null
  onClose: () => void
  onArchive: (id: string) => void
}

export default function ArchiveDialog({ target, onClose, onArchive }: Props) {
  return (
    <Dialog open={!!target} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle>Archiver le budget « {target?.nom} » ?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-400">
          Elle ne sera plus visible sur les prochains mois, mais les budgets et dépenses existants seront conservés.
        </p>
        <div className="space-y-3 mt-2">
          <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => {
            if (!target) return
            onArchive(target.id)
            onClose()
          }}>Archiver</Button>
          <Button className="w-full" variant="ghost" onClick={onClose}>Annuler</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}