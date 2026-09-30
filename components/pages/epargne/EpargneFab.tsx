'use client'

import { Plus } from 'lucide-react'

export default function EpargneFab({ onOpenMouvement }: { onOpenMouvement: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(
    <button
      type="button"
      onClick={onOpenMouvement}
      className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-white shadow-xl transition active:scale-95"
      aria-label="Ajouter un mouvement d’épargne"
      title="Ajouter un mouvement"
    >
      <Plus className="h-6 w-6" />
    </button>,
    document.body
  )
}
