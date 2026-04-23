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
    <DialogContext.Provider value= {{open, onOpenChange}} >
      {children}
    </DialogContext.Provider>
  )
}

export function DialogTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const { onOpenChange } = useContext(DialogContext)
  return <div onClick={() => onOpenChange(true)} style= {{display: 'inline-block'}} >{children}</div>
}

export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, onOpenChange } = useContext(DialogContext)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open) {
      if (!el.open) el.showModal()
    } else {
      if (el.open) el.close()
    }
  }, [open])

  return (
    <dialog ref={ref} className="modal" onClose={() => onOpenChange(false)}>
      <div className={cn('modal-box', className)}>{children}</div>
      <form method="dialog" className="modal-backdrop"><button>close</button></form>
    </dialog>
  )
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-bold text-lg">{children}</h3>
}
