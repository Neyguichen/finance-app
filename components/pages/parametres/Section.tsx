import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Props = {
  open: boolean
  onToggle: () => void
  icon: LucideIcon
  title: string
  color: string
  children: React.ReactNode
}

export default function Section({ open, onToggle, icon: Icon, title, color, children }: Props) {
  return (
    <Card className={`overflow-hidden transition ${open ? 'border-indigo-400/15' : ''}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-800/35 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-950/45"><Icon className={`h-4 w-4 ${color}`} /></div>
          <span className="font-semibold tracking-tight text-slate-200">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <CardContent className="border-t border-slate-800/70 pt-4 pb-4 sm:pt-5">{children}</CardContent>}
    </Card>
  )
}