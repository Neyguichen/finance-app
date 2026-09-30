'use client'

import { useEffect, useRef, createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

const DialogContext = createContext<{ open: boolean; onOpenChange: (open: boolean) => void }>({
  open: false,
  onOpenChange: () => {},
})

export function Dialog({ open, onOpenChange, children }: {
  open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode
}) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

export function DialogTrigger({ children }: { children: React.ReactNode; asChild?: boolean }) {
  const { onOpenChange } = useContext(DialogContext)
  return <div onClick={() => onOpenChange(true)} style={{ display: 'inline-block' }}>{children}</div>
}

export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, onOpenChange } = useContext(DialogContext)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open) {
      if (!el.open) el.showModal()
    } else if (el.open) {
      el.close()
    }
  }, [open])

  return (
    <dialog ref={ref} className="modal backdrop:bg-slate-950/75" onClose={() => onOpenChange(false)}>
      <div className={cn('modal-box max-h-[calc(100dvh-2rem)] rounded-2xl p-4 sm:p-5', className)}>{children}</div>
      <form method="dialog" className="modal-backdrop"><button aria-label="Fermer">close</button></form>
    </dialog>
  )
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 border-b border-slate-800/80 pb-3">{children}</div>
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold tracking-tight text-slate-100">{children}</h3>
}
