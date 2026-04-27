'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

function safeEval(expr: string): number | null {
  try {
    const sanitized = expr.replace(/[^0-9+\-*/().,]/g, '').replace(/,/g, '.')
    if (!sanitized) return null
    const result = new Function('"use strict"; return (' + sanitized + ')')()
    if (typeof result !== 'number' || !isFinite(result)) return null
    return Math.round(result * 100) / 100
  } catch {
    return null
  }
}

interface CalculatorInputProps {
  value: number | string
  onChange: (value: number) => void
  placeholder?: string
  className?: string
  step?: string
}

const OPERATORS = [
  { label: '+', value: '+' },
  { label: '−', value: '-' },
  { label: '×', value: '*' },
  { label: '÷', value: '/' },
  { label: '(', value: '(' },
  { label: ')', value: ')' },
]

export function CalculatorInput({
  value,
  onChange,
  placeholder = 'Montant',
  className,
  step = '0.01',
}: CalculatorInputProps) {
  const [display, setDisplay] = useState(String(value || ''))
  const [focused, setFocused] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Détecter appareil tactile
  useEffect(() => {
    setIsTouchDevice(
      'ontouchstart' in window || navigator.maxTouchPoints > 0
    )
  }, [])

  // Sync si la valeur externe change (ex: reset formulaire)
  useEffect(() => {
    if (!focused) {
      setDisplay(String(value || ''))
    }
  }, [value, focused])

  const handleBlur = () => {
    setFocused(false)
    const result = safeEval(display)
    if (result !== null) {
      setDisplay(String(result))
      onChange(result)
    } else if (display === '') {
      onChange(0)
    }
  }

  const insertOperator = (op: string) => {
    // Insérer l'opérateur à la position du curseur
    const input = inputRef.current
    if (!input) return
    const start = input.selectionStart ?? display.length
    const end = input.selectionEnd ?? display.length
    const newVal = display.slice(0, start) + op + display.slice(end)
    setDisplay(newVal)

    // Replacer le curseur après l'opérateur inséré
    requestAnimationFrame(() => {
      const pos = start + op.length
      input.setSelectionRange(pos, pos)
      input.focus()
    })
  }

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={display}
        placeholder={placeholder}
        className={cn(
          'input input-bordered w-full bg-slate-800 border-slate-700',
          className
        )}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        onChange={(e) => setDisplay(e.target.value)}
      />

      {/* Barre d'opérateurs — uniquement mobile + focus */}
      {focused && isTouchDevice && (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] flex justify-around bg-slate-800 border-t border-slate-600 px-2 py-1.5 safe-bottom">
          {OPERATORS.map((op) => (
            <button
              key={op.value}
              type="button"
              // onMouseDown + preventDefault empêche le blur du champ
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
              onClick={() => insertOperator(op.value)}
              className="flex-1 mx-0.5 py-2 rounded-lg bg-slate-700 text-white text-lg font-semibold active:bg-blue-600 transition-colors"
            >
              {op.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}