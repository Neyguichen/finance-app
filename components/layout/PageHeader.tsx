import type { LucideIcon } from 'lucide-react'

export default function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  icon?: LucideIcon
  action?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="nf-eyebrow">{eyebrow}</p>}
        <div className="mt-1 flex items-center gap-2.5">
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-400/15 bg-indigo-500/10">
              <Icon className="h-4 w-4 text-indigo-300" />
            </div>
          )}
          <h1 className="nf-page-title">{title}</h1>
        </div>
        {description && <p className="nf-page-subtitle">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
