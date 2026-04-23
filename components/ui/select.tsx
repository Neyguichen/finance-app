'use client'

import { createContext, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

const SelectContext = createContext<{ value: string; onChange: (v: string) => void }>({ value: '', onChange: () => {} })

export function Select({ value, defaultValue, onValueChange, children }: {
  value?: string; defaultValue?: string; onValueChange?: (v: string) => void; children: React.ReactNode
}) {
  const [internal, setInternal] = useState(defaultValue || '')
  const current = value ?? internal
  const handleChange = (v: string) => { setInternal(v); onValueChange?.(v) }
  return <SelectContext.Provider value= {{value: current, onChange: handleChange}} >{children}</SelectContext.Provider>
}

export function SelectTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('select select-bordered w-full bg-slate-800 border-slate-700 flex items-center', className)}>{children}</div>
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = useContext(SelectContext)
  return <span>{value || placeholder || 'Sélectionner...'}</span>
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = useContext(SelectContext)
  return <option value={value} onClick={() => ctx.onChange(value)}>{children}</option>
}