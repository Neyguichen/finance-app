import type { LucideIcon } from 'lucide-react'

export default function EmptyStateV2({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/30 p-5 text-center">
      <Icon className="mx-auto h-6 w-6 text-slate-600" />
      <p className="mt-2 text-sm font-medium text-slate-300">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">{description}</p>
      {actionLabel && onAction && (
        <button type="button" className="btn btn-outline btn-sm mt-3" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
