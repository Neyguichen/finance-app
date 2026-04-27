'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CalculatorInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  className?: string
}

export function CalculatorInput({ value, onChange, placeholder = '0', className }: CalculatorInputProps) {
  const [raw, setRaw] = useState(value ? String(value) : '')
  const [focused, setFocused] = useState(false)

  const evaluate = (expr: string) => {
    try {
      const sanitized = expr.replace(/,/g, '.').replace(/[^0-9.+\-*/()]/g, '')
      if (!sanitized) return 0
      const result = Function('"use strict"; return (' + sanitized + ')')()
      return Math.round(Number(result) * 100) / 100
    } catch {
      return parseFloat(expr.replace(/,/g, '.')) || 0
    }
  }

  const handleBlur = () => {
    setFocused(false)
    const result = evaluate(raw)
    setRaw(result ? String(result) : '')
    onChange(result)
  }

  const handleFocus = () => {
    setFocused(true)
    setRaw(value ? String(value) : '')
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      className={cn('bg-slate-800 border-slate-700', className)}
      placeholder={placeholder}
      value={focused ? raw : (value ? String(value) : '')}
      onFocus={handleFocus}
      onChange={e => setRaw(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        }
      }}
    />
  )
}