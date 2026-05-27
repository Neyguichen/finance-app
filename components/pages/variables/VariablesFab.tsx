import { Plus } from 'lucide-react'

type Props = {
  open: boolean
  onToggle: () => void
  onBudget: () => void
  onDepense: () => void
}

export default function VariablesFab({ open, onToggle, onBudget, onDepense }: Props) {
  return (
    <>
      {/* Overlay sombre */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={onToggle} />
      )}

      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3">
        {open && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white bg-slate-600 px-2 py-1 rounded-lg shadow">Catégorie</span>
              <button onClick={onBudget}
                className="w-11 h-11 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:brightness-110 active:scale-95 transition-transform">
                📂
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white bg-slate-600 px-2 py-1 rounded-lg shadow">Dépense</span>
              <button onClick={onDepense}
                className="w-11 h-11 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:brightness-110 active:scale-95 transition-transform">
                💳
              </button>
            </div>
          </>
        )}
        <button onClick={onToggle}
          className="w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:brightness-110 active:scale-95 transition-transform">
          <Plus className={`w-7 h-7 transition-transform duration-200 ${open ? 'rotate-45' : ''}`} />
        </button>
      </div>
    </>
  )
}