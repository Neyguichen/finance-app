'use client'

import { useRef, useState, useEffect } from 'react'

interface CalculatorInputProps {
  value: number | string
  onChange: (value: number) => void
  placeholder?: string
  className?: string
}

function safeEval(expr: string): number | null {
  try {
    const sanitized = expr.replace(/[^0-9+\-*/().," ]/g, '').replace(/,/g, '.')
    if (!sanitized) return null
    const result = new Function('"use strict"; return (' + sanitized + ')')()
    if (typeof result === 'number' && isFinite(result)) {
      return Math.round(result * 100) / 100
    }
    return null
  } catch {
    return null
  }
}

export function CalculatorInput({ value, onChange, placeholder = '0', className = '' }: CalculatorInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [display, setDisplay] = useState(String(value || ''))
  const [focused, setFocused] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [toolbarBottom, setToolbarBottom] = useState(0)

  // Détecter si c'est un appareil tactile
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  // Positionner la barre au-dessus du clavier via visualViewport
  useEffect(() => {
    if (!focused || !isTouchDevice) return

    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      const keyboardHeight = window.innerHeight - vv.height
      setToolbarBottom(Math.max(0, keyboardHeight))
    }

    // Calculer immédiatement + écouter les changements
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)

    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      setToolbarBottom(0)
    }
  }, [focused, isTouchDevice])

  // Sync si la valeur externe change
  useEffect(() => {
    if (!focused) {
      setDisplay(value ? String(value) : '')
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
    const input = inputRef.current
    if (!input) return

    const start = input.selectionStart ?? display.length
    const end = input.selectionEnd ?? display.length
    const newValue = display.slice(0, start) + op + display.slice(end)
    setDisplay(newValue)

    // Repositionner le curseur après l'opérateur inséré
    const newPos = start + op.length
    requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(newPos, newPos)
    })
  }

  const bottomStyle = { bottom: toolbarBottom + 'px' }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        className={`input input-bordered w-full bg-slate-800 border-slate-700 ${className}`}
        placeholder={placeholder}
        value={display}
        onChange={(e) => setDisplay(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
      />

      {/* Barre d'opérateurs — visible uniquement sur mobile quand le champ est focus */}
      {focused && isTouchDevice && (
        <div
          className="fixed left-0 right-0 z-[9999] flex justify-around bg-slate-800 border-t border-slate-700 py-2 safe-bottom"
          style={bottomStyle}
        >
          {['+', '−', '×', '÷', '(', ')'].map((op) => (
            <button
              key={op}
              type="button"
              onTouchStart={(e) => {
                e.preventDefault()
                insertOperator(op === '×' ? '*' : op === '÷' ? '/' : op === '−' ? '-' : op)
              }}
              onMouseDown={(e) => {
                e.preventDefault()
                insertOperator(op === '×' ? '*' : op === '÷' ? '/' : op === '−' ? '-' : op)
              }}
              className="w-12 h-10 rounded-lg bg-purple-700 text-white text-lg font-bold active:bg-purple-500"
            >
              {op}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}