'use client'

import { createContext, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

const SelectCtx = createContext<{ value: string; onChange: (v: string) => void }>({ value: '', onChange: () => {} })

export function Select({ value, defaultValue, onValueChange, children }: {
  value?: string; defaultValue?: string; onValueChange?: (v: string) => void; children: React.ReactNode
}) {
  const [internal, setInternal] = useState(defaultValue || '')
  const current = value ?? internal
  const handleChange = (v: string) => { setInternal(v); onValueChange?.(v) }
  const ctx = { value: current, onChange: handleChange }
  return <SelectCtx.Provider value={ctx}>{children}</SelectCtx.Provider>
}

export function SelectTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('select select-bordered w-full bg-slate-800 border-slate-700 flex items-center', className)}>{children}</div>
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = useContext(SelectCtx)
  return <span>{value || placeholder || 'Sélectionner...'}</span>
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = useContext(SelectCtx)
  return <option value={value} onClick={() => ctx.onChange(value)}>{children}</option>
}
