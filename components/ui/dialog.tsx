'use client'

import { useEffect, useRef, createContext, useContext } from 'react'
import { X } from 'lucide-react'
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
    <dialog
      ref={ref}
      className="modal backdrop:bg-slate-950/80 backdrop:backdrop-blur-[2px]"
      onClose={() => onOpenChange(false)}
    >
      <div
        className={cn(
          'modal-box relative max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1rem)] max-w-lg overflow-y-auto rounded-3xl border border-slate-800/90 bg-slate-900 p-5 shadow-2xl shadow-black/30 sm:w-full sm:p-6',
          className,
        )}
      >
        <button
          type="button"
          aria-label="Fermer"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-950/70 text-slate-500 transition hover:border-slate-700 hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
      <form method="dialog" className="modal-backdrop"><button aria-label="Fermer">close</button></form>
    </dialog>
  )
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 border-b border-slate-800/80 pb-4 pr-10">{children}</div>
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-semibold tracking-tight text-slate-100">{children}</h3>
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-sm leading-5 text-slate-500">{children}</p>
}
