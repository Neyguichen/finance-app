'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface CalculatorInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  className?: string
}

export function CalculatorInput({ value, onChange, placeholder = '0', className }: CalculatorInputProps) {
  const [open, setOpen] = useState(false)
  const [display, setDisplay] = useState(value ? String(value) : '')
  const [hasOperator, setHasOperator] = useState(false)

  const formatDisplay = (v: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(v)
  }

  const handleKey = (key: string) => {
    if (key === 'C') {
      setDisplay('')
      setHasOperator(false)
      return
    }
    if (key === '⌫') {
      setDisplay(prev => prev.slice(0, -1))
      return
    }
    if (key === '=') {
      try {
        const sanitized = display.replace(/,/g, '.').replace(/[^0-9.+\-*/()]/g, '')
        const result = Function('"use strict"; return (' + sanitized + ')')()
        const rounded = Math.round(result * 100) / 100
        setDisplay(String(rounded))
        setHasOperator(false)
        onChange(rounded)
      } catch {
        // expression invalide, on ne fait rien
      }
      return
    }
    if (['+', '-', '*', '/'].includes(key)) {
      setHasOperator(true)
    }
    setDisplay(prev => prev + key)
  }

  const handleValidate = () => {
    if (hasOperator) {
      handleKey('=')
    } else {
      const val = parseFloat(display.replace(/,/g, '.')) || 0
      onChange(val)
    }
    setOpen(false)
  }

  const keys = [
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['0', '.', '⌫', '+'],
  ]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setDisplay(value ? String(value) : '')
          setOpen(true)
        }}
        className={cn(
          'input input-bordered w-full bg-slate-800 border-slate-700 text-left',
          className
        )}
      >
        {value ? formatDisplay(value) : <span className="text-slate-500">{placeholder}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm bg-slate-900 border-t border-slate-700 rounded-t-2xl p-4 space-y-3"
            onClick={e => e.stopPropagation()}>

            {/* Écran */}
            <div className="bg-slate-800 rounded-xl p-3 text-right">
              <p className="text-2xl font-mono font-bold text-white min-h-[2rem]">
                {display || '0'}
              </p>
            </div>

            {/* Touches */}
            <div className="grid grid-cols-4 gap-2">
              {keys.flat().map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKey(key)}
                  className={cn(
                    'py-3 rounded-xl text-lg font-semibold transition-colors',
                    ['+', '-', '*', '/'].includes(key)
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : key === '⌫'
                      ? 'bg-slate-700 text-orange-400 hover:bg-slate-600'
                      : 'bg-slate-800 text-white hover:bg-slate-700'
                  )}
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Boutons bas */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleKey('C')}
                className="py-3 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700"
              >
                Effacer
              </button>
              <button
                type="button"
                onClick={handleValidate}
                className="py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}