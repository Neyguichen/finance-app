'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function FormSection({
  title,
  description,
  icon,
  children,
  className,
}: {
  title?: string
  description?: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-2xl border border-slate-800/80 bg-slate-950/35 p-4', className)}>
      {(title || description || icon) && (
        <div className="mb-3 flex items-start gap-3">
          {icon && (
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {title && <h4 className="text-sm font-semibold text-slate-100">{title}</h4>}
            {description && <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>}
          </div>
        </div>
      )}
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export function FormField({
  label,
  hint,
  children,
  className,
}: {
  label?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      {(label || hint) && (
        <div className="flex items-baseline justify-between gap-3">
          {label && <span className="text-xs font-medium text-slate-400">{label}</span>}
          {hint && <span className="text-[11px] text-slate-600">{hint}</span>}
        </div>
      )}
      {children}
    </label>
  )
}

export function FormActions({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('-mx-1 mt-5 flex flex-col-reverse gap-2 border-t border-slate-800/80 px-1 pt-4 sm:flex-row sm:justify-end', className)}>
      {children}
    </div>
  )
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  columns,
}: {
  value: T
  options: Array<{ value: T; label: string; description?: string }>
  onChange: (value: T) => void
  columns?: number
}) {
  return (
    <div
      className="grid gap-1 rounded-xl border border-slate-800/80 bg-slate-950/45 p-1"
      style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
    >
      {options.map(option => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-lg px-3 py-2 text-left transition',
              selected
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300',
            )}
          >
            <span className="block text-xs font-semibold">{option.label}</span>
            {option.description && (
              <span className={cn('mt-0.5 block text-[10px]', selected ? 'text-indigo-100' : 'text-slate-600')}>
                {option.description}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
