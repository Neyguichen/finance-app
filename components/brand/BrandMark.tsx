import { WalletCards } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function BrandMark({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/20 to-cyan-400/10 shadow-nf">
        <WalletCards className="h-4 w-4 text-indigo-300" />
      </div>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold tracking-tight text-slate-100">Neyguichen</p>
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Finances</p>
        </div>
      )}
    </div>
  )
}
